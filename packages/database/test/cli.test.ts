import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'
import { test } from '@jest/globals'
import { assertLocalDatabase } from '../src/config.js'

const cli = fileURLToPath(new URL('../dist/cli.js', import.meta.url))
const databaseTest = process.env.PERDIU_TEST_CONTAINER === '1' ? test : test.skip
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

async function withIsolatedSchema(
  run: (databaseUrl: string, schema: string, pool: Pool) => Promise<void>,
) {
  const databaseUrl = process.env.TEST_DATABASE_URL
  assert.ok(databaseUrl)
  assertLocalDatabase(databaseUrl)
  const owner = new Pool({ connectionString: databaseUrl })
  const schema = `cli_${randomUUID().replaceAll('-', '')}`
  await owner.query(`CREATE SCHEMA ${schema}`)
  const pool = new Pool({ connectionString: databaseUrl, options: `-c search_path=${schema}` })

  try {
    await run(databaseUrl, schema, pool)
  } finally {
    await pool.end()
    await owner.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
    await owner.end()
  }
}

test('el CLI rechaza comandos desconocidos sin conectar a PostgreSQL', () => {
  const result = spawnSync(process.execPath, [cli, 'unknown'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      DATABASE_URL: 'postgresql://local:secret@127.0.0.1:5432/perdiu_test',
    },
  })

  assert.equal(result.status, 1, result.stderr)
  assert.match(result.stderr, /Usa migrate o seed\./)
})

test('el paquete de base de datos expone el comando db:migrate', () => {
  assert.equal(packageJson.scripts['db:migrate'], 'node dist/cli.js migrate')
})

test('el paquete de base de datos expone el comando db:seed', () => {
  assert.equal(packageJson.scripts['db:seed'], 'node dist/cli.js seed')
})

test('el CLI bloquea comandos que apuntan a una base remota', () => {
  const result = spawnSync(process.execPath, [cli, 'migrate'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      DATABASE_URL: 'postgresql://local:secret@db.example/perdiu_test',
    },
  })

  assert.equal(result.status, 1, result.stderr)
  assert.match(result.stderr, /requiere una base PerdiU local/)
})

databaseTest('migrate aplica cada migración en la base local aislada', async () => {
  await withIsolatedSchema(async (databaseUrl, schema, isolated) => {
    const result = spawnSync(process.execPath, [cli, 'migrate'], {
      encoding: 'utf8',
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        PGOPTIONS: `-c search_path=${schema}`,
      },
      timeout: 15000,
    })

    assert.equal(result.status, 0, result.stderr || result.stdout)
    assert.match(result.stdout, /Migración aplicada\./)
    assert.deepEqual(
      (await isolated.query('SELECT version FROM schema_migrations ORDER BY version')).rows,
      [{ version: 1 }, { version: 2 }],
    )
  })
})

databaseTest('seed aplica los datos ficticios a la base local ya migrada', async () => {
  await withIsolatedSchema(async (databaseUrl, schema, isolated) => {
    const env = {
      ...process.env,
      DATABASE_URL: databaseUrl,
      PGOPTIONS: `-c search_path=${schema}`,
    }
    const migration = spawnSync(process.execPath, [cli, 'migrate'], {
      encoding: 'utf8',
      env,
      timeout: 15000,
    })
    assert.equal(migration.status, 0, migration.stderr || migration.stdout)

    const result = spawnSync(process.execPath, [cli, 'seed'], {
      encoding: 'utf8',
      env,
      timeout: 15000,
    })

    assert.equal(result.status, 0, result.stderr || result.stdout)
    assert.match(result.stdout, /Seed ficticio aplicado\./)
    assert.deepEqual((await isolated.query('SELECT count(*) AS total FROM reports')).rows, [
      { total: '3' },
    ])
    assert.deepEqual((await isolated.query('SELECT count(*) AS total FROM report_contacts')).rows, [
      { total: '1' },
    ])
  })
})
