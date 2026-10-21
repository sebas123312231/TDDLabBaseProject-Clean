import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { test } from '@jest/globals'
import { exportJWK, generateKeyPair, SignJWT, type JWK } from 'jose'
import { createApplication } from '../src/app.js'
import { createRemoteAccessTokenVerifier } from '../src/auth/access-token.js'
import { assertLocalDatabase } from '@perdiu/database/config'
import { createPool } from '@perdiu/database'
import { migrate } from '@perdiu/database/maintenance'

const issuer = 'http://localhost:5173/auth'
const audience = 'authenticated'
const owner = '66068112-224a-4d11-a6cd-c18bdd1ffb1b'
const other = '10000000-0000-0000-0000-000000000002'
const sessionId = '0f65b873-1ea9-4b59-81de-56f745131eb9'

async function signedIdentity() {
  const { privateKey, publicKey } = await generateKeyPair('ES256')
  const jwk: JWK = { ...(await exportJWK(publicKey)), kid: 'account-test', alg: 'ES256', use: 'sig' }
  const server = createServer((_request, response) => {
    response.setHeader('content-type', 'application/json')
    response.end(JSON.stringify({ keys: [jwk] }))
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as { port: number }
  const sign = (sub = owner, tokenSessionId = sessionId) =>
    new SignJWT({
      email: 'persona@example.test',
      role: 'authenticated',
      session_id: tokenSessionId,
    })
      .setProtectedHeader({ alg: 'ES256', kid: 'account-test' })
      .setIssuer(issuer)
      .setAudience(audience)
      .setSubject(sub)
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(privateKey)

  return {
    sign,
    verifier: createRemoteAccessTokenVerifier(
      `http://127.0.0.1:${port}/.well-known/jwks.json`,
      { issuer, audience },
    ),
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  }
}

test('GET /me responde solo la identidad verificada y el perfil público propio', async () => {
  assert.equal(process.env.PERDIU_TEST_CONTAINER, '1')
  const databaseUrl = process.env.TEST_DATABASE_URL
  assert.ok(databaseUrl)
  assertLocalDatabase(databaseUrl)
  const identity = await signedIdentity()
  const pool = createPool(databaseUrl)
  let app: Awaited<ReturnType<typeof createApplication>> | undefined

  try {
    await migrate(pool)
    await pool.query('TRUNCATE TABLE profiles CASCADE')
    app = await createApplication(databaseUrl, identity.verifier)
    await app.listen(0, '127.0.0.1')
    await pool.query(
      `INSERT INTO profiles (id, display_name, photo_url) VALUES
         ($1, 'Persona Ficticia', 'https://images.example.test/persona.png'),
         ($2, 'Otra Cuenta', 'https://images.example.test/otra.png')`,
      [owner, other],
    )
    await pool.query(
      "INSERT INTO profile_contacts (profile_id, email) VALUES ($1, 'contacto-privado@example.test')",
      [owner],
    )

    const response = await fetch(`${await app.getUrl()}/me?id=${other}`, {
      headers: { authorization: `Bearer ${await identity.sign()}` },
    })
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.deepEqual(JSON.parse(await response.text()), {
      id: owner,
      email: 'persona@example.test',
      displayName: 'Persona Ficticia',
      photoUrl: 'https://images.example.test/persona.png',
    })
  } finally {
    await app?.close()
    await pool.query('TRUNCATE TABLE profiles CASCADE')
    await pool.end()
    await identity.close()
  }
})

test('POST /me/logout revoca esa sesión incluso tras reiniciar la API', async () => {
  assert.equal(process.env.PERDIU_TEST_CONTAINER, '1')
  const databaseUrl = process.env.TEST_DATABASE_URL
  assert.ok(databaseUrl)
  assertLocalDatabase(databaseUrl)
  const identity = await signedIdentity()
  const pool = createPool(databaseUrl)
  const closingSession = '9b889b5a-4a25-4585-bb3a-367e0c63c46d'
  const otherSession = '86268d42-7271-423e-a85b-9cd43b82af63'
  const closing = await identity.sign(owner, closingSession)
  const otherToken = await identity.sign(owner, otherSession)
  let app: Awaited<ReturnType<typeof createApplication>> | undefined

  try {
    await migrate(pool)
    await pool.query('TRUNCATE TABLE profiles CASCADE')
    await pool.query('TRUNCATE TABLE session_revocations')
    app = await createApplication(databaseUrl, identity.verifier)
    await app.listen(0, '127.0.0.1')
    let url = await app.getUrl()
    const request = (path: string, token?: string, method = 'GET') =>
      fetch(`${url}${path}`, {
        method,
        headers: token ? { authorization: `Bearer ${token}` } : {},
      })

    assert.equal((await request('/me', closing)).status, 200)
    const logout = await request('/me/logout', closing, 'POST')
    assert.equal(logout.status, 204)
    assert.equal(logout.headers.get('cache-control'), 'no-store')
    assert.equal((await request('/me', closing)).status, 401)
    assert.equal((await request('/me', otherToken)).status, 200)

    await app.close()
    app = undefined
    app = await createApplication(databaseUrl, identity.verifier)
    await app.listen(0, '127.0.0.1')
    url = await app.getUrl()
    assert.equal((await request('/me', closing)).status, 401)
    assert.equal((await request('/me', otherToken)).status, 200)
  } finally {
    await app?.close()
    await pool.query('TRUNCATE TABLE session_revocations')
    await pool.query('TRUNCATE TABLE profiles CASCADE')
    await pool.end()
    await identity.close()
  }
})
