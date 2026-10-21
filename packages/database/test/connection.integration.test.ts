import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { openDatabase } from '@perdiu/database'
import { assertLocalDatabase } from '../src/config.js'

const integrationTest = process.env.PERDIU_TEST_CONTAINER === '1' ? test : test.skip

integrationTest('openDatabase compone repositorios y libera el pool', async () => {
  const databaseUrl = process.env.TEST_DATABASE_URL
  assert.ok(databaseUrl)
  assertLocalDatabase(databaseUrl)

  const database = await openDatabase(databaseUrl)
  try {
    assert.equal(typeof database.reports.list, 'function')
    assert.equal(typeof database.profiles.find, 'function')
    assert.equal(typeof database.sessions.revoke, 'function')
  } finally {
    await database.close()
  }
})
