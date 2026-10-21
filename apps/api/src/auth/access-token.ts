import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from 'jose'

/** Identity taken exclusively from a verified access token. */
export interface AuthenticatedUser {
  id: string
  email: string
  sessionId: string
}

export interface AccessTokenVerifier {
  verify(token: string): Promise<AuthenticatedUser>
}

export interface AccessTokenOptions {
  issuer: string
  audience: string
}

export class InvalidAccessToken extends Error {}
export class AuthUnavailable extends Error {}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function createAccessTokenVerifier(
  keys: JWTVerifyGetKey,
  { issuer, audience }: AccessTokenOptions,
): AccessTokenVerifier {
  return {
    async verify(token) {
      let payload
      try {
        ;({ payload } = await jwtVerify(token, keys, {
          issuer,
          audience,
          algorithms: ['ES256'],
          requiredClaims: ['sub', 'exp', 'iat', 'session_id'],
        }))
      } catch (error) {
        if (error instanceof errors.JOSEError && error.code !== 'ERR_JWKS_TIMEOUT')
          throw new InvalidAccessToken()
        throw new AuthUnavailable()
      }

      const {
        sub,
        email,
        session_id: sessionId,
        role,
        is_anonymous: anonymous,
      } = payload
      if (
        typeof sub !== 'string' ||
        !uuid.test(sub) ||
        typeof sessionId !== 'string' ||
        !uuid.test(sessionId) ||
        typeof email !== 'string' ||
        !email ||
        role !== 'authenticated' ||
        anonymous === true
      )
        throw new InvalidAccessToken()
      return { id: sub, email, sessionId }
    },
  }
}

export interface SessionRevocations {
  revoke(sessionId: string): Promise<void>
  isRevoked(sessionId: string): Promise<boolean>
}

export function withSessionRevocation(
  verifier: AccessTokenVerifier,
  revocations: SessionRevocations,
): AccessTokenVerifier {
  return {
    async verify(token) {
      const user = await verifier.verify(token)
      let revoked: boolean
      try {
        revoked = await revocations.isRevoked(user.sessionId)
      } catch {
        throw new AuthUnavailable()
      }
      if (revoked) throw new InvalidAccessToken()
      return user
    },
  }
}

export function createRemoteAccessTokenVerifier(
  jwksUrl: string,
  options: AccessTokenOptions,
): AccessTokenVerifier {
  return createAccessTokenVerifier(
    createRemoteJWKSet(new URL(jwksUrl), { timeoutDuration: 3000, cooldownDuration: 30000 }),
    options,
  )
}
