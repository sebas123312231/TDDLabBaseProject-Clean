import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { test } from '@jest/globals'
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK } from 'jose'
import {
  AuthUnavailable,
  createAccessTokenVerifier,
  createRemoteAccessTokenVerifier,
  InvalidAccessToken,
  withSessionRevocation,
} from '../src/auth/access-token.js'

const issuer = 'http://localhost:5173/auth'
const audience = 'authenticated'
const subject = '66068112-224a-4d11-a6cd-c18bdd1ffb1b'
const sessionId = '0f65b873-1ea9-4b59-81de-56f745131eb9'

async function signedToken(
  claims: Record<string, unknown> = {},
  sub = subject,
  options: { issuer?: string; audience?: string; expires?: string | number; algorithm?: string } = {},
) {
  const { privateKey, publicKey } = await generateKeyPair('ES256')
  const jwk: JWK = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'ES256', use: 'sig' }
  const verifier = createAccessTokenVerifier(createLocalJWKSet({ keys: [jwk] }), {
    issuer,
    audience,
  })
  const token = await new SignJWT({
    email: 'persona@example.test',
    role: 'authenticated',
    session_id: sessionId,
    is_anonymous: false,
    user_metadata: { display_name: 'Nombre no verificado' },
    ...claims,
  })
    .setProtectedHeader({ alg: options.algorithm ?? 'ES256', kid: 'test-key' })
    .setIssuer(options.issuer ?? issuer)
    .setAudience(options.audience ?? audience)
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(options.expires ?? '15m')
    .sign(privateKey)

  return { verifier, token, jwk, privateKey }
}

test('un JWT ES256 válido entrega solo la identidad firmada', async () => {
  const { verifier, token } = await signedToken()

  assert.deepEqual(await verifier.verify(token), {
    id: subject,
    email: 'persona@example.test',
    sessionId,
  })
})

test('el verificador rechaza una firma JWT adulterada', async () => {
  const { verifier, token } = await signedToken()
  const [header, payload, signature] = token.split('.')
  const changedSignature = `${signature!.startsWith('A') ? 'B' : 'A'}${signature!.slice(1)}`

  await assert.rejects(verifier.verify(`${header}.${payload}.${changedSignature}`), InvalidAccessToken)
})

test('el verificador rechaza tokens de un issuer distinto', async () => {
  const { verifier, token } = await signedToken({}, subject, { issuer: 'https://otro.example/auth' })

  await assert.rejects(verifier.verify(token), InvalidAccessToken)
})

test('el verificador rechaza tokens de una audience distinta', async () => {
  const { verifier, token } = await signedToken({}, subject, { audience: 'service_role' })

  await assert.rejects(verifier.verify(token), InvalidAccessToken)
})

test('el verificador rechaza un token vencido aunque la firma sea válida', async () => {
  const expiredAt = Math.floor(Date.now() / 1000) - 60
  const { verifier, token } = await signedToken({}, subject, { expires: expiredAt })

  await assert.rejects(verifier.verify(token), InvalidAccessToken)
})

test('el verificador solo acepta la firma asimétrica ES256', async () => {
  const { verifier } = await signedToken()
  const token = await new SignJWT({
    email: 'persona@example.test',
    role: 'authenticated',
    session_id: sessionId,
    is_anonymous: false,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(new TextEncoder().encode('local-test-secret'))

  await assert.rejects(verifier.verify(token), InvalidAccessToken)
})

test('el verificador rechaza un JWT sin firma', async () => {
  const { verifier } = await signedToken()
  const now = Math.floor(Date.now() / 1000)
  const token = [
    Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url'),
    Buffer.from(
      JSON.stringify({
        sub: subject,
        iss: issuer,
        aud: audience,
        exp: now + 900,
        iat: now,
        email: 'persona@example.test',
        role: 'authenticated',
        session_id: sessionId,
      }),
    ).toString('base64url'),
    '',
  ].join('.')

  await assert.rejects(verifier.verify(token), InvalidAccessToken)
})

test('el verificador rechaza una firma de una clave ES256 no publicada por Auth', async () => {
  const { verifier } = await signedToken()
  const { privateKey } = await generateKeyPair('ES256')
  const token = await new SignJWT({
    email: 'persona@example.test',
    role: 'authenticated',
    session_id: sessionId,
    is_anonymous: false,
  })
    .setProtectedHeader({ alg: 'ES256', kid: 'clave-ajena' })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(privateKey)

  await assert.rejects(verifier.verify(token), InvalidAccessToken)
})

test('un token no representa una cuenta autenticada si sus claims de identidad no son válidos', async () => {
  const invalidClaims = [
    { claims: { role: 'service_role' } },
    { claims: { is_anonymous: true } },
    { claims: { session_id: 'sesión-de-otra-clase' } },
    { claims: { email: '' } },
    { sub: 'Santiago Demo' },
  ]

  for (const { claims, sub: invalidSubject } of invalidClaims) {
    const { verifier, token } = await signedToken(claims, invalidSubject)
    await assert.rejects(verifier.verify(token), InvalidAccessToken)
  }
})

test('la indisponibilidad de las claves de Auth no se confunde con una credencial inválida', async () => {
  const { token } = await signedToken()
  const verifier = createAccessTokenVerifier(
    async () => {
      throw new TypeError('fetch failed')
    },
    { issuer, audience },
  )

  await assert.rejects(verifier.verify(token), (error) => error instanceof AuthUnavailable)
})

test('el verificador remoto obtiene la clave pública desde el JWKS configurado', async () => {
  const { token, jwk } = await signedToken()
  const server = createServer((_request, response) => {
    response.setHeader('content-type', 'application/json')
    response.end(JSON.stringify({ keys: [jwk] }))
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as { port: number }

  try {
    const verifier = createRemoteAccessTokenVerifier(
      `http://127.0.0.1:${port}/.well-known/jwks.json`,
      { issuer, audience },
    )
    assert.equal((await verifier.verify(token)).id, subject)
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    )
  }
})

test('revocar el session_id verificado rechaza el token todavía firmado', async () => {
  const { verifier, token } = await signedToken()
  const revoked = new Set<string>()
  const sessions = withSessionRevocation(verifier, {
    revoke: async (id) => void revoked.add(id),
    isRevoked: async (id) => revoked.has(id),
  })

  assert.equal((await sessions.verify(token)).sessionId, sessionId)
  revoked.add(sessionId)
  await assert.rejects(sessions.verify(token), InvalidAccessToken)
})

test('la falla al consultar revocaciones se trata como Auth no disponible', async () => {
  const { verifier, token } = await signedToken()
  const sessions = withSessionRevocation(verifier, {
    revoke: async () => undefined,
    isRevoked: async () => {
      throw new Error('fallo de base local')
    },
  })

  await assert.rejects(sessions.verify(token), AuthUnavailable)
})

test('revocar una sesión no bloquea otra sesión firmada de la misma cuenta', async () => {
  const { verifier, token, privateKey } = await signedToken()
  const otherSessionId = '7d2b4c39-8a3e-4c51-9b0f-2f6d1e8a4c10'
  const otherToken = await new SignJWT({
    email: 'persona@example.test',
    role: 'authenticated',
    session_id: otherSessionId,
    is_anonymous: false,
  })
    .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(privateKey)
  const revoked = new Set([sessionId])
  const sessions = withSessionRevocation(verifier, {
    revoke: async (id) => void revoked.add(id),
    isRevoked: async (id) => revoked.has(id),
  })

  await assert.rejects(sessions.verify(token), InvalidAccessToken)
  assert.equal((await sessions.verify(otherToken)).sessionId, otherSessionId)
})
