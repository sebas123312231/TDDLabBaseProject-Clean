import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { test } from '@jest/globals'
import { PostgresReportRepository } from '@perdiu/database'
import { assertLocalDatabase } from '../src/config.js'
import { migrate, seed } from '@perdiu/database/maintenance'

const integrationTest = process.env.PERDIU_TEST_CONTAINER === '1' ? test : test.skip

async function withSeedDatabase(run: (pool: Pool) => Promise<void>): Promise<void> {
  const databaseUrl = process.env.TEST_DATABASE_URL
  assert.ok(databaseUrl)
  assertLocalDatabase(databaseUrl)

  const owner = new Pool({ connectionString: databaseUrl })
  const schema = `seed_${randomUUID().replaceAll('-', '')}`
  await owner.query(`CREATE SCHEMA ${schema}`)
  const pool = new Pool({ connectionString: databaseUrl, options: `-c search_path=${schema}` })

  try {
    await migrate(pool)
    await run(pool)
  } finally {
    await pool.end()
    await owner.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
    await owner.end()
  }
}

integrationTest('el seed ficticio prepara los reportes activos del catálogo', async () => {
  await withSeedDatabase(async (pool) => {
    await seed(pool)

    assert.deepEqual((await pool.query('SELECT count(*) AS total FROM reports')).rows, [
      { total: '3' },
    ])
    const records = await new PostgresReportRepository(pool).list()

    assert.deepEqual(
      records.map(({ id }) => id),
      [
        '20000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000002',
      ],
    )
  })
})

integrationTest('el seed añade contactos de prueba y una imagen sin datos reales', async () => {
  await withSeedDatabase(async (pool) => {
    await seed(pool)

    assert.deepEqual(
      (
        await pool.query(
          'SELECT email FROM profile_contacts WHERE profile_id = $1',
          ['10000000-0000-0000-0000-000000000001'],
        )
      ).rows,
      [{ email: 'fictional@example.invalid' }],
    )
    assert.deepEqual(
      (
        await pool.query(
          'SELECT phone FROM report_contacts WHERE report_id = $1',
          ['20000000-0000-0000-0000-000000000001'],
        )
      ).rows,
      [{ phone: '59170000001' }],
    )
    assert.deepEqual(
      (
        await pool.query(
          'SELECT public_url, storage_key FROM report_images WHERE report_id = $1',
          ['20000000-0000-0000-0000-000000000001'],
        )
      ).rows,
      [{ public_url: '/images/object.svg', storage_key: 'fixture-private-storage-key' }],
    )
  })
})

integrationTest('repetir el seed conserva registros existentes sin sobrescribirlos', async () => {
  await withSeedDatabase(async (pool) => {
    await seed(pool)
    await pool.query('UPDATE reports SET title = $1 WHERE id = $2', [
      'Título editado localmente',
      '20000000-0000-0000-0000-000000000001',
    ])

    await seed(pool)

    assert.deepEqual(
      (await pool.query('SELECT count(*) AS total FROM reports')).rows,
      [{ total: '3' }],
    )
    assert.deepEqual(
      (await pool.query('SELECT title FROM reports WHERE id = $1', [
        '20000000-0000-0000-0000-000000000001',
      ])).rows,
      [{ title: 'Título editado localmente' }],
    )
  })
})

integrationTest('un error al sembrar revierte las filas insertadas previamente', async () => {
  await withSeedDatabase(async (pool) => {
    await pool.query(`
      CREATE FUNCTION reject_report_seed() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'seed failure'; END $$;
      CREATE TRIGGER reject_report_seed
        BEFORE INSERT ON reports FOR EACH ROW EXECUTE FUNCTION reject_report_seed();
    `)

    await assert.rejects(seed(pool), /seed failure/)
    assert.deepEqual((await pool.query('SELECT count(*) AS total FROM profiles')).rows, [
      { total: '0' },
    ])
  })
})
