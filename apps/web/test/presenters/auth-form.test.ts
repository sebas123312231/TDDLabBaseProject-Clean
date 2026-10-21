import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { AuthFormPresenter } from '../../src/presenters/auth/auth-form.presenter.js'
import type { FormResult } from '../../src/presenters/auth/auth.presenter.js'

function auth(result: FormResult = { ok: true }, resendFailure?: string) {
  const calls: unknown[] = []
  let finish!: () => void
  const gate = new Promise<void>((resolve) => {
    finish = resolve
  })
  return {
    calls,
    finish,
    actions: {
      signIn: async (input: unknown) => {
        calls.push(['signIn', input])
        await gate
        return result
      },
      signUp: async (input: unknown) => {
        calls.push(['signUp', input])
        await gate
        return result
      },
      resendConfirmation: async (email: string) => {
        calls.push(['resend', email])
        return resendFailure
      },
    },
  }
}

test('inicia sesión con lo escrito, evita envíos repetidos y limpia la contraseña', async () => {
  const session = auth()
  const form = new AuthFormPresenter('login', session.actions)
  form.setEmail(' persona@example.test ')
  form.setPassword('Correcta-123')
  form.togglePassword()

  const pending = form.submit()
  assert.equal(form.getSnapshot().pending, true)
  await form.submit()
  session.finish()
  await pending

  assert.deepEqual(session.calls, [
    ['signIn', { email: ' persona@example.test ', password: 'Correcta-123' }],
  ])
  assert.deepEqual(form.getSnapshot(), {
    email: ' persona@example.test ',
    password: '',
    confirmPassword: '',
    showPassword: true,
    pending: false,
    errors: {},
    message: '',
    sentTo: '',
    resendStatus: '',
  })
})

test('mantiene lo escrito y muestra errores seguros devueltos por Auth', async () => {
  const session = auth({
    ok: false,
    fieldErrors: { email: 'Ingresa un correo electrónico válido.' },
    message: 'Correo o contraseña incorrectos.',
  })
  const form = new AuthFormPresenter('login', session.actions)
  form.setEmail('persona')
  form.setPassword('x')
  session.finish()

  await form.submit()

  assert.deepEqual(form.getSnapshot().errors, {
    email: 'Ingresa un correo electrónico válido.',
  })
  assert.equal(form.getSnapshot().message, 'Correo o contraseña incorrectos.')
  assert.equal(form.getSnapshot().password, 'x')
  assert.equal(form.getSnapshot().pending, false)
})

test('el registro presenta el aviso de confirmación y permite reenviar el enlace', async () => {
  const session = auth({ ok: true, confirmationSent: true })
  const form = new AuthFormPresenter('register', session.actions)
  form.setEmail(' nueva@example.test ')
  form.setPassword('Segura-123')
  form.setConfirmPassword('Segura-123')
  session.finish()

  await form.submit()

  assert.equal(form.getSnapshot().sentTo, 'nueva@example.test')
  assert.equal(form.getSnapshot().confirmPassword, '')
  const resending = form.resend()
  assert.equal(form.getSnapshot().resendStatus, 'Enviando…')
  await resending
  assert.equal(
    form.getSnapshot().resendStatus,
    'Si el correo puede registrarse, enviamos un nuevo enlace.',
  )
  assert.deepEqual(session.calls[1], ['resend', 'nueva@example.test'])
})

test('muestra un error seguro cuando falla el reenvío de confirmación', async () => {
  const session = auth({ ok: true, confirmationSent: true }, 'Servicio caído.')
  const form = new AuthFormPresenter('register', session.actions)
  form.setEmail('persona@example.test')
  session.finish()
  await form.submit()
  await form.resend()

  assert.equal(form.getSnapshot().resendStatus, 'Servicio caído.')
})
