import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import {
  isValidEmail,
  normalizeEmail,
  validateSignIn,
  validateSignUp,
} from '../../src/models/auth/credentials.js'

test('normaliza el correo quitando espacios y pasando a minúsculas', () => {
  assert.equal(normalizeEmail('  Persona@Example.TEST '), 'persona@example.test')
})

test('acepta un correo con dominio y extensión', () => {
  assert.equal(isValidEmail('persona@example.test'), true)
})

test('rechaza un correo cuyo dominio no tiene extensión', () => {
  assert.equal(isValidEmail('sin-dominio@local'), false)
})

test('rechaza correos de más de 254 caracteres', () => {
  assert.equal(isValidEmail(`${'a'.repeat(243)}@example.com`), false)
})

test('iniciar sesión rechaza un correo inválido', () => {
  assert.deepEqual(validateSignIn({ email: 'sin-dominio@local', password: 'secreto' }), {
    email: 'invalid',
  })
})

test('iniciar sesión exige una contraseña', () => {
  assert.deepEqual(validateSignIn({ email: 'persona@example.test', password: '' }), {
    password: 'required',
  })
})

test('iniciar sesión valida el correo después de normalizarlo', () => {
  assert.deepEqual(validateSignIn({ email: ' Persona@Example.test ', password: 'x' }), {})
})

test('el registro exige al menos ocho caracteres de contraseña', () => {
  assert.deepEqual(
    validateSignUp({
      email: 'persona@example.test',
      password: 'corta',
      confirmPassword: 'corta',
    }),
    { password: 'too_short' },
  )
})

test('el registro limita la contraseña a 72 bytes', () => {
  const password = 'ñ'.repeat(37)
  assert.deepEqual(
    validateSignUp({
      email: 'persona@example.test',
      password,
      confirmPassword: password,
    }),
    { password: 'too_long' },
  )
})

test('el registro exige que la confirmación coincida', () => {
  assert.deepEqual(
    validateSignUp({
      email: 'persona@example.test',
      password: 'segura123',
      confirmPassword: 'otra12345',
    }),
    { confirmPassword: 'mismatch' },
  )
})

test('el registro rechaza un correo inválido aunque la contraseña sea válida', () => {
  assert.deepEqual(
    validateSignUp({
      email: 'sin-dominio@local',
      password: 'segura123',
      confirmPassword: 'segura123',
    }),
    { email: 'invalid' },
  )
})

test('la longitud mínima cuenta puntos de código Unicode', () => {
  const password = '🔒'.repeat(4)
  assert.deepEqual(
    validateSignUp({ email: 'persona@example.test', password, confirmPassword: password }),
    { password: 'too_short' },
  )
})

test('acepta una contraseña que ocupa exactamente 72 bytes', () => {
  const password = 'ñ'.repeat(36)
  assert.deepEqual(
    validateSignUp({ email: 'persona@example.test', password, confirmPassword: password }),
    {},
  )
})

test('el registro informa todos los campos inválidos juntos', () => {
  assert.deepEqual(
    validateSignUp({ email: 'mal@local', password: 'corta', confirmPassword: 'otra' }),
    { email: 'invalid', password: 'too_short', confirmPassword: 'mismatch' },
  )
})
