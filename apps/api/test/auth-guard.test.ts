import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import {
  ServiceUnavailableException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common'
import { AuthUnavailable, InvalidAccessToken } from '../dist/auth/access-token.js'
import { AuthGuard } from '../dist/auth/guard.js'

function requestContext(authorization?: string) {
  const request: { headers: Record<string, string | undefined>; user?: unknown } = { headers: {} }
  if (authorization !== undefined) request.headers.authorization = authorization
  const responseHeaders: Record<string, string> = {}
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({
        setHeader: (name: string, value: string) => void (responseHeaders[name] = value),
      }),
    }),
  } as unknown as ExecutionContext
  return { context, request, responseHeaders }
}

test('el guard rechaza credenciales ausentes o con formato no bearer', async () => {
  const guard = new AuthGuard({ verify: async () => ({ id: 'u', email: 'u@example.test', sessionId: 's' }) })

  for (const authorization of [undefined, 'Basic token', 'Bearer token other']) {
    const { context, responseHeaders } = requestContext(authorization)
    await assert.rejects(guard.canActivate(context), (error) =>
      error instanceof UnauthorizedException && error.getStatus() === 401,
    )
    assert.equal(responseHeaders['WWW-Authenticate'], 'Bearer')
  }
})

test('el guard entrega el bearer al verificador y coloca solo la identidad verificada', async () => {
  const user = {
    id: '66068112-224a-4d11-a6cd-c18bdd1ffb1b',
    email: 'persona@example.test',
    sessionId: '0f65b873-1ea9-4b59-81de-56f745131eb9',
  }
  let verifiedToken: string | undefined
  const guard = new AuthGuard({
    verify: async (token: string) => {
      verifiedToken = token
      return user
    },
  })
  const { context, request } = requestContext('Bearer token-firmado')

  assert.equal(await guard.canActivate(context), true)
  assert.equal(verifiedToken, 'token-firmado')
  assert.deepEqual(request.user, user)
})

test('el guard convierte un token inválido en 401 y anuncia el esquema bearer', async () => {
  const guard = new AuthGuard({
    verify: async () => {
      throw new InvalidAccessToken()
    },
  })
  const { context, responseHeaders } = requestContext('Bearer token-invalido')

  await assert.rejects(guard.canActivate(context), (error) =>
    error instanceof UnauthorizedException && error.getStatus() === 401,
  )
  assert.equal(responseHeaders['WWW-Authenticate'], 'Bearer')
})

test('el guard responde 503 si no puede consultar al servicio de autenticación', async () => {
  const guard = new AuthGuard({
    verify: async () => {
      throw new AuthUnavailable()
    },
  })
  const { context } = requestContext('Bearer token-valido')

  await assert.rejects(
    guard.canActivate(context),
    (error) => error instanceof ServiceUnavailableException && error.getStatus() === 503,
  )
})
