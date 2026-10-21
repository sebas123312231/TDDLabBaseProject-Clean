import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { createApplication } from '../src/app.js'
import { assertLocalDatabase } from '@perdiu/database/config'
import { createPool } from '@perdiu/database'
import { migrate, seed } from '@perdiu/database/maintenance'

const noSessions = {
  verify: async () => {
    throw new Error('El catálogo público no debe verificar sesiones.')
  },
}

test('GET /reports es público y devuelve solo reportes activos persistidos', async () => {
  assert.equal(process.env.PERDIU_TEST_CONTAINER, '1')
  const databaseUrl = process.env.TEST_DATABASE_URL
  assert.ok(databaseUrl)
  assertLocalDatabase(databaseUrl)
  const pool = createPool(databaseUrl)
  let app: Awaited<ReturnType<typeof createApplication>> | undefined

  try {
    await migrate(pool)
    await pool.query('TRUNCATE TABLE profiles CASCADE')
    await seed(pool)
    app = await createApplication(databaseUrl, noSessions)
    await app.listen(0, '127.0.0.1')

    const response = await fetch(`${await app.getUrl()}/reports`)
    assert.equal(response.status, 200)
    const reports = JSON.parse(await response.text())
    assert.deepEqual(
      reports.map((report: { id: string }) => report.id),
      [
        '20000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000002',
      ],
    )
    assert.equal('ownerId' in reports[0], false)
  } finally {
    await app?.close()
    await pool.query('TRUNCATE TABLE profiles CASCADE')
    await pool.end()
  }
})
