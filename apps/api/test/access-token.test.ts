import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK } from 'jose'
import {
  AuthUnavailable,
  createAccessTokenVerifier,
  InvalidAccessToken,
  withSessionRevocation,
} from '../src/auth/access-token.js'

const issuer = 'http://localhost:5173/auth'
const audience = 'authenticated'
const subject = '66068112-224a-4d11-a6cd-c18bdd1ffb1b'
const sessionId = '0f65b873-1ea9-4b59-81de-56f745131eb9'

async function signedToken(claims: Record<string, unknown> = {}, sub = subject) {
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
    .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(privateKey)

  return { verifier, token }
}

test('un JWT ES256 válido entrega solo la identidad firmada', async () => {
  const { verifier, token } = await signedToken()

  assert.deepEqual(await verifier.verify(token), {
    id: subject,
    email: 'persona@example.test',
    sessionId,
  })
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
