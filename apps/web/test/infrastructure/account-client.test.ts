import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { createAccountClient } from '../../src/infrastructure/http/account-client.js'
import { SessionRejected } from '../../src/models/auth/session.js'

test('sends the verified access token without caching private account data', async () => {
  const requests: { url: string; init: RequestInit }[] = []
  const client = createAccountClient('/api/', async () => 'access-token', async (url, init) => {
    requests.push({ url: String(url), init: init ?? {} })
    return new Response(JSON.stringify({ id: 'account-1', email: 'person@example.test', phone: 'private' }))
  })

  assert.deepEqual(await client.me(), { id: 'account-1', email: 'person@example.test' })
  assert.equal(requests[0]?.url, '/api/me')
  assert.equal(new Headers(requests[0]?.init.headers).get('authorization'), 'Bearer access-token')
  assert.equal(requests[0]?.init.credentials, 'omit')
  assert.equal(requests[0]?.init.cache, 'no-store')
})

test('rejects a missing or revoked session without returning account data', async () => {
  let requests = 0
  const missing = createAccountClient('/api', async () => undefined, async () => {
    requests++
    return new Response('{}')
  })
  await assert.rejects(missing.me(), SessionRejected)
  assert.equal(requests, 0)

  const revoked = createAccountClient('/api', async () => 'expired-token', async () => {
    requests++
    return new Response('{}', { status: 401 })
  })
  await assert.rejects(revoked.me(), SessionRejected)
  assert.equal(requests, 1)
})

test('revokes the API session with the access token and accepts an already rejected token', async () => {
  const requests: { url: string; init: RequestInit }[] = []
  let status = 204
  const client = createAccountClient('/api/', async () => 'access-token', async (url, init) => {
    requests.push({ url: String(url), init: init ?? {} })
    return new Response(null, { status })
  })

  await client.revokeSession()
  assert.equal(requests[0]?.url, '/api/me/logout')
  assert.equal(requests[0]?.init.method, 'POST')
  assert.equal(new Headers(requests[0]?.init.headers).get('authorization'), 'Bearer access-token')
  status = 401
  await client.revokeSession()
  status = 503
  await assert.rejects(client.revokeSession(), /No se pudo cerrar la sesión/)
})
