import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { assertLocalDatabase, readDatabaseUrl } from '../src/config.js'

test('la configuración de BD exige DATABASE_URL', () => {
  assert.throws(() => readDatabaseUrl({}), {
    message: 'DATABASE_URL es obligatoria.',
  })
})

test('la URL de BD debe ser PostgreSQL válida y no expone su contenido al fallar', () => {
  for (const databaseUrl of [
    'private-config-sentinel',
    'https://example.invalid/db',
    'postgresql://localhost',
  ]) {
    assert.throws(() => readDatabaseUrl({ DATABASE_URL: databaseUrl }), {
      message: 'DATABASE_URL debe ser una URL PostgreSQL válida con usuario y base de datos.',
    })
  }
})

test('las operaciones de BD aceptan solo destinos locales de desarrollo o prueba', () => {
  assert.doesNotThrow(() => assertLocalDatabase('postgresql://test-user@127.0.0.1/perdiu_dev'))
  assert.doesNotThrow(() => assertLocalDatabase('postgresql://test-user@localhost/perdiu_test'))
})

test('las operaciones de BD rechazan hosts remotos y bases compartidas', () => {
  for (const databaseUrl of [
    'postgresql://test-user@remote.example.invalid/perdiu_dev',
    'postgresql://test-user@127.0.0.1/shared',
  ]) {
    assert.throws(() => assertLocalDatabase(databaseUrl), {
      message:
        'Esta operación requiere una base PerdiU local terminada en dev o test, fuera de producción.',
    })
  }
})

test('las operaciones de BD rechazan parámetros y fragmentos en la URL', () => {
  for (const databaseUrl of [
    'postgresql://test-user@127.0.0.1/perdiu_dev?host=remote.example.invalid',
    'postgresql://test-user@127.0.0.1/perdiu_dev#shared',
  ]) {
    assert.throws(() => assertLocalDatabase(databaseUrl), {
      message:
        'Esta operación requiere una base PerdiU local terminada en dev o test, fuera de producción.',
    })
  }
})

test('las operaciones de BD rechazan destinos locales en producción', () => {
  const previous = process.env.NODE_ENV
  try {
    process.env.NODE_ENV = 'production'
    assert.throws(() => assertLocalDatabase('postgresql://test-user@127.0.0.1/perdiu_dev'), {
      message:
        'Esta operación requiere una base PerdiU local terminada en dev o test, fuera de producción.',
    })
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = previous
  }
})
