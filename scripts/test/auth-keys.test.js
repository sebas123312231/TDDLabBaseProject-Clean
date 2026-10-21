import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { test } from '@jest/globals'

test('auth:keys imprime secretos locales y una clave privada ES256', () => {
  const result = spawnSync('pnpm', ['auth:keys'], { encoding: 'utf8' })

  assert.equal(result.status, 0, result.stderr)
  const values = Object.fromEntries(
    result.stdout
      .trim()
      .split('\n')
      .filter((line) => /^AUTH_(?:DB_PASSWORD|JWT_SECRET|JWT_KEYS)=/.test(line))
      .map((line) => {
        const separator = line.indexOf('=')
        return [line.slice(0, separator), line.slice(separator + 1)]
      }),
  )
  assert.deepEqual(Object.keys(values).sort(), [
    'AUTH_DB_PASSWORD',
    'AUTH_JWT_KEYS',
    'AUTH_JWT_SECRET',
  ])
  assert.match(values.AUTH_DB_PASSWORD, /^[a-f0-9]{48}$/)
  assert.match(values.AUTH_JWT_SECRET, /^[a-f0-9]{64}$/)

  const [key] = JSON.parse(values.AUTH_JWT_KEYS.slice(1, -1))
  assert.equal(key.kty, 'EC')
  assert.equal(key.crv, 'P-256')
  assert.equal(key.alg, 'ES256')
  assert.equal(key.use, 'sig')
  assert.ok(key.d)
  assert.ok(key.kid)
})
