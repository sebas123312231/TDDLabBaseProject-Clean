import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { test } from '@jest/globals'
import { PostgresProfileRepository } from '@perdiu/database'
import { assertLocalDatabase } from '../src/config.js'
import { migrate } from '@perdiu/database/maintenance'

const integrationTest = process.env.PERDIU_TEST_CONTAINER === '1' ? test : test.skip

async function withProfileDatabase(run: (pool: Pool) => Promise<void>): Promise<void> {
  const databaseUrl = process.env.TEST_DATABASE_URL
  assert.ok(databaseUrl)
  assertLocalDatabase(databaseUrl)

  const owner = new Pool({ connectionString: databaseUrl })
  const schema = `profile_${randomUUID().replaceAll('-', '')}`
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

integrationTest('el repositorio devuelve nombre y foto del perfil público', async () => {
  await withProfileDatabase(async (pool) => {
    await pool.query(
      'INSERT INTO profiles (id, display_name, photo_url) VALUES ($1, $2, $3)',
      ['30000000-0000-0000-0000-000000000001', 'Perfil visible', '/images/profile.svg'],
    )

    assert.deepEqual(
      await new PostgresProfileRepository(pool).find('30000000-0000-0000-0000-000000000001'),
      { displayName: 'Perfil visible', photoUrl: '/images/profile.svg' },
    )
  })
})
