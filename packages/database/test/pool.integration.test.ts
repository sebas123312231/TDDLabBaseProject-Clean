import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { assertLocalDatabase } from '../src/config.js'
import { createPool } from '@perdiu/database'

const integrationTest = process.env.PERDIU_TEST_CONTAINER === '1' ? test : test.skip

integrationTest('el pool consulta PostgreSQL y permite cerrar sus conexiones', async () => {
  const databaseUrl = process.env.TEST_DATABASE_URL
  assert.ok(databaseUrl)
  assertLocalDatabase(databaseUrl)

  const pool = createPool(databaseUrl)
  try {
    assert.equal(pool.options.connectionTimeoutMillis, 5000)
    assert.equal(pool.options.statement_timeout, 10000)
    const result = await pool.query<{ database_name: string }>(
      'SELECT current_database() AS database_name',
    )
    assert.deepEqual(result.rows, [{ database_name: 'perdiu_test' }])
  } finally {
    await pool.end()
  }
})
