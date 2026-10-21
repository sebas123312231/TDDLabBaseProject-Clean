import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { test } from '@jest/globals'
import { PostgresSessionRevocations } from '@perdiu/database'
import { assertLocalDatabase } from '../src/config.js'
import { migrate } from '@perdiu/database/maintenance'

const integrationTest = process.env.PERDIU_TEST_CONTAINER === '1' ? test : test.skip

async function withSessionDatabase(run: (pool: Pool) => Promise<void>): Promise<void> {
  const databaseUrl = process.env.TEST_DATABASE_URL
  assert.ok(databaseUrl)
  assertLocalDatabase(databaseUrl)

  const owner = new Pool({ connectionString: databaseUrl })
  const schema = `session_${randomUUID().replaceAll('-', '')}`
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

integrationTest('una sesión sin registro no está revocada', async () => {
  await withSessionDatabase(async (pool) => {
    const sessions = new PostgresSessionRevocations(pool)

    assert.equal(await sessions.isRevoked('40000000-0000-0000-0000-000000000001'), false)
  })
})

integrationTest('revocar una sesión hace que deje de ser válida', async () => {
  await withSessionDatabase(async (pool) => {
    const sessions = new PostgresSessionRevocations(pool)
    const sessionId = '40000000-0000-0000-0000-000000000002'

    await sessions.revoke(sessionId)

    assert.equal(await sessions.isRevoked(sessionId), true)
  })
})
