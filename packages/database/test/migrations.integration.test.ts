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
