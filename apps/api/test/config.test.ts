import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { readConfig } from '../src/config.js'

const databaseUrl = 'postgresql://test-user@127.0.0.1:5433/perdiu_test'
const auth = {
  AUTH_JWKS_URL: 'http://127.0.0.1:9999/.well-known/jwks.json',
  AUTH_JWT_ISSUER: 'http://localhost:5173/auth',
}

test('la configuración aplica valores predeterminados a opciones válidas', () => {
  assert.deepEqual(readConfig({ DATABASE_URL: databaseUrl, ...auth }), {
    databaseUrl,
    port: 3000,
    host: '127.0.0.1',
    auth: {
      jwksUrl: auth.AUTH_JWKS_URL,
      issuer: auth.AUTH_JWT_ISSUER,
      audience: 'authenticated',
    },
  })
})

test('la configuración rechaza puertos fuera del rango TCP válido', () => {
  for (const port of ['NaN', '0', '65536']) {
    assert.throws(
      () => readConfig({ DATABASE_URL: databaseUrl, ...auth, PORT: port }),
      { message: 'PORT debe ser un entero entre 1 y 65535.' },
    )
  }
})

test('la verificación Auth exige URLs públicas sin credenciales', () => {
  const message =
    'AUTH_JWKS_URL y AUTH_JWT_ISSUER deben ser URLs http(s) de Supabase Auth, sin credenciales.'

  for (const env of [
    {},
    { AUTH_JWT_ISSUER: auth.AUTH_JWT_ISSUER },
    { AUTH_JWKS_URL: auth.AUTH_JWKS_URL },
    { ...auth, AUTH_JWKS_URL: 'file:///etc/jwks.json' },
    { ...auth, AUTH_JWKS_URL: 'http://admin:secret@127.0.0.1:9999/jwks' },
  ]) {
    assert.throws(() => readConfig({ DATABASE_URL: databaseUrl, ...env }), { message })
  }
})
