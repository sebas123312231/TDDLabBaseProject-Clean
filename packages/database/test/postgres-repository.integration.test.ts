import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { test } from '@jest/globals'
import { assertLocalDatabase } from '../src/config.js'
import { migrate } from '../src/maintenance.js'
import { PostgresReportRepository } from '@perdiu/database'

const integrationTest = process.env.PERDIU_TEST_CONTAINER === '1' ? test : test.skip

type ReportFixture = {
  id: string
  ownerId: string
  type: string
  state: string
  category: string
  title: string
  description: string
  city: string
  zone: string
  incidentDate: string
  createdAt: string
}

async function withCatalogDatabase(run: (pool: Pool) => Promise<void>): Promise<void> {
  const databaseUrl = process.env.TEST_DATABASE_URL
  assert.ok(databaseUrl)
  assertLocalDatabase(databaseUrl)

  const owner = new Pool({ connectionString: databaseUrl })
  const schema = `catalog_${randomUUID().replaceAll('-', '')}`
  await owner.query(`CREATE SCHEMA ${schema}`)
  const pool = new Pool({
    connectionString: databaseUrl,
    options: `-c search_path=${schema}`,
  })

  try {
    await migrate(pool)
    await run(pool)
  } finally {
    await pool.end()
    await owner.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
    await owner.end()
  }
}

async function insertReport(pool: Pool, overrides: Partial<ReportFixture>) {
  const report: ReportFixture = {
    id: randomUUID(),
    ownerId: '10000000-0000-0000-0000-000000000001',
    type: 'found',
    state: 'active',
    category: 'object',
    title: 'Llaves encontradas',
    description: 'Un manojo de llaves encontrado.',
    city: 'La Paz',
    zone: 'Centro',
    incidentDate: '2026-10-20',
    createdAt: '2026-10-20T12:00:00.000000Z',
    ...overrides,
  }
  await pool.query(
    `INSERT INTO profiles (id, display_name, photo_url)
     VALUES ($1, 'Perfil de prueba', NULL) ON CONFLICT (id) DO NOTHING`,
    [report.ownerId],
  )
  await pool.query(
    `INSERT INTO profile_contacts (profile_id, email)
     VALUES ($1, 'private@example.invalid') ON CONFLICT (profile_id) DO NOTHING`,
    [report.ownerId],
  )
  await pool.query(
    `INSERT INTO reports
      (id, owner_id, type, state, category, title, description, city, zone, incident_date, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [
      report.id,
      report.ownerId,
      report.type,
      report.state,
      report.category,
      report.title,
      report.description,
      report.city,
      report.zone,
      report.incidentDate,
      report.createdAt,
    ],
  )
  await pool.query('INSERT INTO report_contacts (report_id, phone) VALUES ($1, $2)', [
    report.id,
    '59170000001',
  ])
  await pool.query(
    `INSERT INTO report_images (report_id, position, public_url, storage_key)
     VALUES ($1, 0, '/images/report.svg', 'private-storage-key')`,
    [report.id],
  )
}

integrationTest('el repositorio devuelve reportes activos y excluye los resueltos', async () => {
  await withCatalogDatabase(async (pool) => {
    await insertReport(pool, { id: '20000000-0000-0000-0000-000000000001' })
    await insertReport(pool, {
      id: '20000000-0000-0000-0000-000000000002',
      state: 'resolved',
    })

    const records = await new PostgresReportRepository(pool).list()

    assert.deepEqual(records, [
      {
        id: '20000000-0000-0000-0000-000000000001',
        ownerId: '10000000-0000-0000-0000-000000000001',
        type: 'found',
        state: 'active',
        category: 'object',
        title: 'Llaves encontradas',
        description: 'Un manojo de llaves encontrado.',
        city: 'La Paz',
        zone: 'Centro',
        incidentDate: '2026-10-20',
        createdAt: '2026-10-20T12:00:00.000000Z',
        author: {
          id: '10000000-0000-0000-0000-000000000001',
          displayName: 'Perfil de prueba',
        },
        imageUrls: ['/images/report.svg'],
      },
    ])
  })
})

integrationTest('el repositorio filtra por tipo de reporte', async () => {
  await withCatalogDatabase(async (pool) => {
    await insertReport(pool, {
      id: '20000000-0000-0000-0000-000000000001',
      type: 'found',
    })
    await insertReport(pool, {
      id: '20000000-0000-0000-0000-000000000002',
      type: 'lost',
    })

    const records = await new PostgresReportRepository(pool).list({ type: 'lost' })

    assert.deepEqual(records.map(({ id }) => id), ['20000000-0000-0000-0000-000000000002'])
  })
})

integrationTest('el repositorio filtra por categoría', async () => {
  await withCatalogDatabase(async (pool) => {
    await insertReport(pool, {
      id: '20000000-0000-0000-0000-000000000001',
      category: 'object',
    })
    await insertReport(pool, {
      id: '20000000-0000-0000-0000-000000000002',
      category: 'pet',
    })

    const records = await new PostgresReportRepository(pool).list({ category: 'pet' })

    assert.deepEqual(records.map(({ id }) => id), ['20000000-0000-0000-0000-000000000002'])
  })
})

integrationTest('el repositorio filtra por ciudad', async () => {
  await withCatalogDatabase(async (pool) => {
    await insertReport(pool, {
      id: '20000000-0000-0000-0000-000000000001',
      city: 'La Paz',
    })
    await insertReport(pool, {
      id: '20000000-0000-0000-0000-000000000002',
      city: 'Cochabamba',
    })

    const records = await new PostgresReportRepository(pool).list({ city: 'Cochabamba' })

    assert.deepEqual(records.map(({ id }) => id), ['20000000-0000-0000-0000-000000000002'])
  })
})

integrationTest('la búsqueda ignora mayúsculas, espacios y acentos en el título', async () => {
  await withCatalogDatabase(async (pool) => {
    await insertReport(pool, {
      id: '20000000-0000-0000-0000-000000000001',
      title: 'Cámara perdida',
    })
    await insertReport(pool, {
      id: '20000000-0000-0000-0000-000000000002',
      title: 'Mochila encontrada',
    })

    const records = await new PostgresReportRepository(pool).list({ q: '  CAMARA  ' })

    assert.deepEqual(records.map(({ id }) => id), ['20000000-0000-0000-0000-000000000001'])
  })
})

integrationTest('la búsqueda también encuentra coincidencias en la descripción', async () => {
  await withCatalogDatabase(async (pool) => {
    await insertReport(pool, {
      id: '20000000-0000-0000-0000-000000000001',
      title: 'Objeto encontrado',
      description: 'Incluye una cámara pequeña.',
    })
    await insertReport(pool, {
      id: '20000000-0000-0000-0000-000000000002',
      title: 'Mochila encontrada',
      description: 'Contiene cuadernos.',
    })

    const records = await new PostgresReportRepository(pool).list({ q: 'camara' })

    assert.deepEqual(records.map(({ id }) => id), ['20000000-0000-0000-0000-000000000001'])
  })
})

integrationTest('el repositorio ordena por timestamp preciso y desempata por id', async () => {
  await withCatalogDatabase(async (pool) => {
    await insertReport(pool, {
      id: '20000000-0000-0000-0000-000000000001',
      createdAt: '2026-10-20T12:00:00.123100Z',
    })
    await insertReport(pool, {
      id: '20000000-0000-0000-0000-000000000002',
      createdAt: '2026-10-20T12:00:00.123900Z',
    })
    await insertReport(pool, {
      id: '20000000-0000-0000-0000-000000000003',
      createdAt: '2026-10-20T12:00:00.123100Z',
    })
    await pool.query('DROP INDEX reports_catalog_order')

    const records = await new PostgresReportRepository(pool).list()

    assert.deepEqual(
      records.map(({ id, createdAt }) => [id, createdAt]),
      [
        ['20000000-0000-0000-0000-000000000002', '2026-10-20T12:00:00.123900Z'],
        ['20000000-0000-0000-0000-000000000001', '2026-10-20T12:00:00.123100Z'],
        ['20000000-0000-0000-0000-000000000003', '2026-10-20T12:00:00.123100Z'],
      ],
    )
  })
})

integrationTest('el repositorio limita el catálogo a cincuenta registros', async () => {
  await withCatalogDatabase(async (pool) => {
    const ownerId = '10000000-0000-0000-0000-000000000001'
    await pool.query('INSERT INTO profiles (id, display_name) VALUES ($1, $2)', [ownerId, 'Perfil'])
    await pool.query(`
      INSERT INTO reports
        (id, owner_id, type, state, category, title, description, city, zone, incident_date, created_at)
      SELECT ('40000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
        $1, 'found', 'active', 'object', 'Reporte ' || n, 'Registro de prueba.',
        'La Paz', 'Centro', '2026-10-20', '2026-10-20T12:00:00Z'
      FROM generate_series(1, 51) n
    `, [ownerId])

    const records = await new PostgresReportRepository(pool).list()

    assert.equal(records.length, 50)
    assert.equal(records[0]?.id, '40000000-0000-0000-0000-000000000001')
    assert.equal(records[49]?.id, '40000000-0000-0000-0000-000000000050')
  })
})

integrationTest('la búsqueda trata metacaracteres y comillas como texto literal', async () => {
  await withCatalogDatabase(async (pool) => {
    await insertReport(pool, {
      id: '20000000-0000-0000-0000-000000000001',
      title: "Libro de prueba O'Reilly",
      description: 'Etiqueta literal: 100%_seguro.',
    })
    await insertReport(pool, {
      id: '20000000-0000-0000-0000-000000000002',
      title: 'Mochila encontrada',
      description: 'Contiene cuadernos.',
    })

    const literal = await new PostgresReportRepository(pool).list({ q: '%_' })
    const injection = await new PostgresReportRepository(pool).list({ q: "' OR true --" })

    assert.deepEqual(literal.map(({ id }) => id), ['20000000-0000-0000-0000-000000000001'])
    assert.deepEqual(injection, [])
  })
})

integrationTest('el repositorio mantiene las imágenes en su posición guardada', async () => {
  await withCatalogDatabase(async (pool) => {
    const report = '20000000-0000-0000-0000-000000000001'
    await insertReport(pool, { id: report })
    await pool.query(
      `INSERT INTO report_images (report_id, position, public_url, storage_key)
       VALUES ($1, 2, '/images/last.svg', 'private-last'),
         ($1, 1, '/images/middle.svg', 'private-middle')`,
      [report],
    )

    const records = await new PostgresReportRepository(pool).list()

    assert.deepEqual(records[0]?.imageUrls, [
      '/images/report.svg',
      '/images/middle.svg',
      '/images/last.svg',
    ])
  })
})
