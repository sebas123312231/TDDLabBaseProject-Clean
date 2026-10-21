import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { test } from '@jest/globals'
import { Pool } from 'pg'
import { assertLocalDatabase } from '../src/config.js'
import { migrate } from '../src/maintenance.js'

const integrationTest = process.env.PERDIU_TEST_CONTAINER === '1' ? test : test.skip

type ReportFields = {
  type: string
  state: string
  category: string
  title: string
  description: string
  city: string
  zone: string
  incidentDate: string
}

async function withMigrationContext(
  run: (pool: Pool, directory: URL) => Promise<void>,
): Promise<void> {
  const databaseUrl = process.env.TEST_DATABASE_URL
  assert.ok(databaseUrl)
  assertLocalDatabase(databaseUrl)

  const owner = new Pool({ connectionString: databaseUrl })
  const schema = `migration_${randomUUID().replaceAll('-', '')}`
  const directoryPath = await mkdtemp(join(tmpdir(), 'perdiu-migrations-'))

  try {
    await owner.query(`CREATE SCHEMA ${schema}`)
    const pool = new Pool({
      connectionString: databaseUrl,
      options: `-c search_path=${schema}`,
    })
    try {
      await run(pool, pathToFileURL(`${directoryPath}/`))
    } finally {
      await pool.end()
      await owner.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
    }
  } finally {
    await owner.end()
    await rm(directoryPath, { recursive: true, force: true })
  }
}

async function insertReport(pool: Pool, overrides: Partial<ReportFields> = {}) {
  const ownerId = '10000000-0000-0000-0000-000000000001'
  await pool.query('INSERT INTO profiles (id, display_name) VALUES ($1, $2)', [
    ownerId,
    'Perfil de prueba',
  ])
  const report: ReportFields = {
    type: 'found',
    state: 'active',
    category: 'object',
    title: 'Llaves encontradas',
    description: 'Un manojo de llaves encontrado.',
    city: 'La Paz',
    zone: 'Centro',
    incidentDate: '2026-10-20',
    ...overrides,
  }

  return pool.query(
    `INSERT INTO reports
      (owner_id, type, state, category, title, description, city, zone, incident_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      ownerId,
      report.type,
      report.state,
      report.category,
      report.title,
      report.description,
      report.city,
      report.zone,
      report.incidentDate,
    ],
  )
}

integrationTest('las migraciones numeradas se aplican en orden y se registran', async () => {
  await withMigrationContext(async (pool, directory) => {
    await writeFile(new URL('002_second.sql', directory), "INSERT INTO steps VALUES ('second');")
    await writeFile(
      new URL('001_first.sql', directory),
      "CREATE TABLE steps (name text); INSERT INTO steps VALUES ('first');",
    )

    await migrate(pool, directory)

    assert.deepEqual((await pool.query('SELECT name FROM steps ORDER BY name')).rows, [
      { name: 'first' },
      { name: 'second' },
    ])
    assert.deepEqual(
      (await pool.query('SELECT version FROM schema_migrations ORDER BY version')).rows,
      [{ version: 1 }, { version: 2 }],
    )
  })
})

integrationTest('rechaza archivos ausentes de migraciones ya aplicadas', async () => {
  await withMigrationContext(async (pool, directory) => {
    const first = new URL('001_first.sql', directory)
    await writeFile(first, 'CREATE TABLE first_step (id integer);')
    await migrate(pool, directory)
    await rm(first)
    await writeFile(new URL('002_second.sql', directory), 'CREATE TABLE second_step (id integer);')

    await assert.rejects(migrate(pool, directory), /falta un archivo/i)
  })
})

integrationTest('rechaza versiones fuera del rango integer de PostgreSQL', async () => {
  await withMigrationContext(async (pool, directory) => {
    await writeFile(new URL('2147483648_too_large.sql', directory), 'SELECT 1;')
    await assert.rejects(migrate(pool, directory), /nombre de migración inválido/i)
  })
})

integrationTest('reaplicar migraciones no duplica cambios ni versiones', async () => {
  await withMigrationContext(async (pool, directory) => {
    await writeFile(
      new URL('001_once.sql', directory),
      'CREATE TABLE steps (name text); INSERT INTO steps VALUES (\'once\');',
    )
    await migrate(pool, directory)
    await migrate(pool, directory)

    assert.deepEqual((await pool.query('SELECT name FROM steps')).rows, [{ name: 'once' }])
    assert.deepEqual((await pool.query('SELECT version FROM schema_migrations')).rows, [
      { version: 1 },
    ])
  })
})

integrationTest('revierte la transacción completa si una migración falla', async () => {
  await withMigrationContext(async (pool, directory) => {
    await writeFile(new URL('001_first.sql', directory), 'CREATE TABLE first_step (id integer);')
    await writeFile(
      new URL('002_failure.sql', directory),
      'CREATE TABLE second_step (id integer); SELECT * FROM missing_step;',
    )

    await assert.rejects(migrate(pool, directory))
    assert.deepEqual(
      (await pool.query("SELECT to_regclass('first_step') AS relation")).rows,
      [{ relation: null }],
    )
    assert.deepEqual(
      (await pool.query("SELECT to_regclass('schema_migrations') AS relation")).rows,
      [{ relation: null }],
    )
  })
})

integrationTest('la migración predeterminada crea el perfil mínimo del catálogo', async () => {
  await withMigrationContext(async (pool) => {
    await migrate(pool)

    const columns = await pool.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'profiles'
       ORDER BY ordinal_position`,
    )
    assert.deepEqual(
      columns.rows.map(({ column_name }) => column_name),
      ['id', 'display_name', 'photo_url'],
    )
  })
})

integrationTest('la base rechaza nombres visibles de perfil vacíos', async () => {
  await withMigrationContext(async (pool) => {
    await migrate(pool)
    await assert.rejects(
      pool.query(
        "INSERT INTO profiles (id, display_name) VALUES ('10000000-0000-0000-0000-000000000001', '   ')",
      ),
    )
  })
})

integrationTest('la base limita el nombre visible del perfil a cien caracteres', async () => {
  await withMigrationContext(async (pool) => {
    await migrate(pool)
    await assert.rejects(
      pool.query('INSERT INTO profiles (id, display_name) VALUES ($1, $2)', [
        '10000000-0000-0000-0000-000000000001',
        'x'.repeat(101),
      ]),
    )
  })
})

integrationTest('la base conserva el correo de contacto separado del perfil público', async () => {
  await withMigrationContext(async (pool) => {
    await migrate(pool)
    const profileId = '10000000-0000-0000-0000-000000000001'
    await pool.query('INSERT INTO profiles (id, display_name) VALUES ($1, $2)', [
      profileId,
      'Perfil de prueba',
    ])
    await pool.query('INSERT INTO profile_contacts (profile_id, email) VALUES ($1, $2)', [
      profileId,
      'fictional@example.invalid',
    ])

    assert.deepEqual(
      (await pool.query('SELECT email FROM profile_contacts WHERE profile_id = $1', [profileId])).rows,
      [{ email: 'fictional@example.invalid' }],
    )
  })
})

integrationTest('un reporte nuevo queda activo por defecto', async () => {
  await withMigrationContext(async (pool) => {
    await migrate(pool)
    const profileId = '10000000-0000-0000-0000-000000000001'
    await pool.query('INSERT INTO profiles (id, display_name) VALUES ($1, $2)', [
      profileId,
      'Perfil de prueba',
    ])
    const result = await pool.query<{ state: string }>(
      `INSERT INTO reports
        (owner_id, type, category, title, description, city, zone, incident_date)
       VALUES ($1, 'found', 'object', 'Llaves', 'Llaves encontradas', 'La Paz', 'Centro', '2026-10-20')
       RETURNING state`,
      [profileId],
    )

    assert.deepEqual(result.rows, [{ state: 'active' }])
  })
})

integrationTest('la base rechaza tipos de reporte fuera del contrato', async () => {
  await withMigrationContext(async (pool) => {
    await migrate(pool)
    await assert.rejects(insertReport(pool, { type: 'missing' }), { code: '23514' })
  })
})

integrationTest('la base solo permite reportes activos o resueltos', async () => {
  await withMigrationContext(async (pool) => {
    await migrate(pool)
    await assert.rejects(insertReport(pool, { state: 'deleted' }), { code: '23514' })
  })
})

integrationTest('la base rechaza categorías fuera del contrato', async () => {
  await withMigrationContext(async (pool) => {
    await migrate(pool)
    await assert.rejects(insertReport(pool, { category: 'vehicle' }), { code: '23514' })
  })
})

integrationTest('la base rechaza títulos de reporte vacíos', async () => {
  await withMigrationContext(async (pool) => {
    await migrate(pool)
    await assert.rejects(insertReport(pool, { title: '   ' }), { code: '23514' })
  })
})

integrationTest('la base limita el título de reporte a doscientos caracteres', async () => {
  await withMigrationContext(async (pool) => {
    await migrate(pool)
    await assert.rejects(insertReport(pool, { title: 'x'.repeat(201) }), { code: '23514' })
  })
})

integrationTest('la base rechaza descripciones de reporte vacías', async () => {
  await withMigrationContext(async (pool) => {
    await migrate(pool)
    await assert.rejects(insertReport(pool, { description: '   ' }), { code: '23514' })
  })
})

integrationTest('la base limita la descripción del reporte a cinco mil caracteres', async () => {
  await withMigrationContext(async (pool) => {
    await migrate(pool)
    await assert.rejects(insertReport(pool, { description: 'x'.repeat(5001) }), { code: '23514' })
  })
})

integrationTest('la base rechaza ciudades de reporte vacías', async () => {
  await withMigrationContext(async (pool) => {
    await migrate(pool)
    await assert.rejects(insertReport(pool, { city: '   ' }), { code: '23514' })
  })
})

integrationTest('la base limita la ciudad del reporte a cien caracteres', async () => {
  await withMigrationContext(async (pool) => {
    await migrate(pool)
    await assert.rejects(insertReport(pool, { city: 'x'.repeat(101) }), { code: '23514' })
  })
})

integrationTest('la base rechaza zonas de reporte vacías', async () => {
  await withMigrationContext(async (pool) => {
    await migrate(pool)
    await assert.rejects(insertReport(pool, { zone: '   ' }), { code: '23514' })
  })
})

integrationTest('la base limita la zona del reporte a doscientos caracteres', async () => {
  await withMigrationContext(async (pool) => {
    await migrate(pool)
    await assert.rejects(insertReport(pool, { zone: 'x'.repeat(201) }), { code: '23514' })
  })
})

integrationTest('el catálogo tiene un índice parcial por estado y orden de publicación', async () => {
  await withMigrationContext(async (pool) => {
    await migrate(pool)
    const result = await pool.query<{ index_name: string | null }>(
      "SELECT to_regclass('reports_catalog_order') AS index_name",
    )
    assert.deepEqual(result.rows, [{ index_name: 'reports_catalog_order' }])
  })
})

integrationTest('los teléfonos de contacto se almacenan aparte del reporte público', async () => {
  await withMigrationContext(async (pool) => {
    await migrate(pool)
    const report = await insertReport(pool)
    await pool.query('INSERT INTO report_contacts (report_id, phone) VALUES ($1, $2)', [
      report.rows[0].id,
      '59170000001',
    ])

    assert.deepEqual(
      (await pool.query('SELECT phone FROM report_contacts WHERE report_id = $1', [
        report.rows[0].id,
      ])).rows,
      [{ phone: '59170000001' }],
    )
  })
})

integrationTest('las imágenes del reporte se guardan en su tabla ordenadas por posición', async () => {
  await withMigrationContext(async (pool) => {
    await migrate(pool)
    const report = await insertReport(pool)
    await pool.query(
      `INSERT INTO report_images (report_id, position, public_url, storage_key)
       VALUES ($1, 0, '/images/front.svg', 'private-front-key'),
         ($1, 1, '/images/back.svg', 'private-back-key')`,
      [report.rows[0].id],
    )

    assert.deepEqual(
      (
        await pool.query(
          'SELECT position, public_url, storage_key FROM report_images WHERE report_id = $1 ORDER BY position',
          [report.rows[0].id],
        )
      ).rows,
      [
        { position: 0, public_url: '/images/front.svg', storage_key: 'private-front-key' },
        { position: 1, public_url: '/images/back.svg', storage_key: 'private-back-key' },
      ],
    )
  })
})

integrationTest('la posición de imagen no puede superar las tres fotografías permitidas', async () => {
  await withMigrationContext(async (pool) => {
    await migrate(pool)
    const report = await insertReport(pool)
    await assert.rejects(
      pool.query(
        "INSERT INTO report_images (report_id, position, public_url) VALUES ($1, 3, '/images/extra.svg')",
        [report.rows[0].id],
      ),
      { code: '23514' },
    )
  })
})
