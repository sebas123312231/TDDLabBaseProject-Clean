import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import type { AccountIdentity } from '@perdiu/contracts'
import {
  AuthGatewayError,
  SessionRejected,
  type AccountClient,
  type AuthGateway,
} from '../../src/models/auth/session.js'
import { AuthPresenter } from '../../src/presenters/auth/auth.presenter.js'

const identity: AccountIdentity = { id: 'user-1', email: 'persona@example.test' }

function setup(
  overrides: Partial<AuthGateway> = {},
  account?: AccountClient['me'],
  revoke?: AccountClient['revokeSession'],
) {
  const calls: string[] = []
  let expired: (() => void) | undefined
  const gateway: AuthGateway = {
    restore: async () => ({ session: false }),
    onSignedOut: (listener) => {
      expired = listener
      return () => {
        expired = undefined
      }
    },
    signIn: async (email) => calls.push(`signIn:${email}`),
    signUp: async () => 'confirmation_sent',
    resendConfirmation: async () => {},
    signOut: async () => calls.push('signOut'),
    ...overrides,
  }
  const presenter = new AuthPresenter(gateway, {
    me: account ?? (async () => identity),
    revokeSession: revoke ?? (async () => calls.push('revoke')),
  })
  return { presenter, calls, expire: () => expired?.() }
}

test('inicia restaurando y pasa a anónimo cuando no existe una sesión', async () => {
  const { presenter } = setup()
  assert.deepEqual(presenter.getSnapshot(), { status: 'restoring' })

  await presenter.start()

  assert.deepEqual(presenter.getSnapshot(), { status: 'anonymous' })
})

test('restaura una sesión solo después de verificar la cuenta en la API', async () => {
  const { presenter } = setup({ restore: async () => ({ session: true }) })

  await presenter.start()

  assert.deepEqual(presenter.getSnapshot(), { status: 'authenticated', user: identity })
})

test('start comparte la misma restauración ante ejecuciones repetidas del adaptador React', async () => {
  let restores = 0
  const { presenter } = setup({
    restore: async () => {
      restores++
      return { session: false }
    },
  })
  const first = presenter.start()
  const second = presenter.start()

  assert.equal(first, second)
  await Promise.all([first, second])
  assert.equal(restores, 1)
})

test('muestra el resultado del enlace de confirmación sin simular una sesión', async () => {
  const { presenter } = setup({ restore: async () => ({ session: false, link: 'confirmed' }) })

  await presenter.start()

  assert.deepEqual(presenter.getSnapshot(), {
    status: 'anonymous',
    notice: 'Tu correo está confirmado. Inicia sesión para continuar.',
  })
})

test('rechaza campos de inicio de sesión inválidos antes de llamar al proveedor', async () => {
  const { presenter, calls } = setup()

  assert.deepEqual(await presenter.signIn({ email: 'no-es-correo', password: '' }), {
    ok: false,
    fieldErrors: {
      email: 'Ingresa un correo electrónico válido.',
      password: 'Ingresa tu contraseña.',
    },
  })
  assert.deepEqual(calls, [])
})

test('normaliza el correo, inicia sesión y verifica la identidad mediante la API', async () => {
  const { presenter, calls } = setup()

  assert.deepEqual(
    await presenter.signIn({ email: '  Persona@Example.test ', password: 'Correcta-123' }),
    { ok: true },
  )
  assert.deepEqual(calls, ['signIn:persona@example.test'])
  assert.deepEqual(presenter.getSnapshot(), { status: 'authenticated', user: identity })
})

test('traduce credenciales incorrectas a un mensaje seguro y no inicia sesión', async () => {
  const { presenter } = setup({
    signIn: async () => {
      throw new AuthGatewayError('invalid_credentials')
    },
  })
  await presenter.start()

  assert.deepEqual(await presenter.signIn({ email: 'persona@example.test', password: 'Mala-1234' }), {
    ok: false,
    fieldErrors: {},
    message: 'Correo o contraseña incorrectos.',
  })
  assert.deepEqual(presenter.getSnapshot(), { status: 'anonymous' })
})

test('descarta la sesión local cuando la API rechaza el token del inicio', async () => {
  const { presenter, calls } = setup({}, async () => {
    throw new SessionRejected()
  })
  await presenter.start()

  assert.deepEqual(await presenter.signIn({ email: 'persona@example.test', password: 'Correcta-123' }), {
    ok: false,
    fieldErrors: {},
    message: 'Tu sesión venció o ya no es válida. Ingresa nuevamente.',
  })
  assert.deepEqual(calls, ['signIn:persona@example.test', 'signOut'])
  assert.equal(presenter.getSnapshot().status, 'anonymous')
})

test('valida correo, contraseña y confirmación del registro antes de enviar', async () => {
  const { presenter, calls } = setup()

  assert.deepEqual(
    await presenter.signUp({ email: 'persona', password: 'corta', confirmPassword: 'otra' }),
    {
      ok: false,
      fieldErrors: {
        email: 'Ingresa un correo electrónico válido.',
        password: 'Usa al menos 8 caracteres.',
        confirmPassword: 'Las contraseñas no coinciden.',
      },
    },
  )
  assert.deepEqual(calls, [])
})

test('normaliza el correo de registro y confirma que el enlace fue enviado', async () => {
  const emails: string[] = []
  const { presenter } = setup({
    signUp: async (email) => {
      emails.push(email)
      return 'confirmation_sent'
    },
  })
  await presenter.start()

  assert.deepEqual(
    await presenter.signUp({
      email: ' Persona@Example.test ',
      password: 'Correcta-123',
      confirmPassword: 'Correcta-123',
    }),
    { ok: true, confirmationSent: true },
  )
  assert.deepEqual(emails, ['persona@example.test'])
  assert.deepEqual(presenter.getSnapshot(), { status: 'anonymous' })
})

test('protege solo secciones privadas y espera mientras restaura la sesión', async () => {
  const { presenter } = setup()
  assert.equal(presenter.access('my-reports'), 'wait')
  assert.equal(presenter.access('saved'), 'allow')
  await presenter.start()
  assert.equal(presenter.access('my-reports'), 'login')
  assert.equal(presenter.access('publish'), 'login')
  assert.equal(presenter.access('profile'), 'login')

  await presenter.signIn({ email: 'persona@example.test', password: 'Correcta-123' })

  assert.equal(presenter.access('my-reports'), 'allow')
  assert.equal(presenter.access('saved'), 'allow')
})

test('revoca primero en la API y cierra Auth al terminar la sesión', async () => {
  const { presenter, calls } = setup({ restore: async () => ({ session: true }) })
  await presenter.start()

  assert.equal(await presenter.signOut(), undefined)
  assert.deepEqual(calls, ['revoke', 'signOut'])
  assert.deepEqual(presenter.getSnapshot(), {
    status: 'anonymous',
    notice: 'Cerraste sesión correctamente.',
  })
})

test('si la API no revoca la sesión, Auth permanece abierto y se informa el fallo', async () => {
  const { presenter, calls } = setup(
    { restore: async () => ({ session: true }) },
    undefined,
    async () => {
      throw new Error('network')
    },
  )
  await presenter.start()

  assert.equal(await presenter.signOut(), 'No se pudo cerrar la sesión. Intenta nuevamente.')
  assert.deepEqual(calls, [])
  assert.deepEqual(presenter.getSnapshot(), { status: 'authenticated', user: identity })
})

test('normaliza el correo para reenviar confirmación y devuelve un error seguro si falla', async () => {
  const sent: string[] = []
  const { presenter } = setup({
    resendConfirmation: async (email) => {
      sent.push(email)
    },
  })
  assert.equal(await presenter.resendConfirmation(' Persona@Example.test '), undefined)
  assert.deepEqual(sent, ['persona@example.test'])

  const unavailable = setup({
    resendConfirmation: async () => {
      throw new AuthGatewayError('unavailable')
    },
  })
  assert.equal(
    await unavailable.presenter.resendConfirmation('persona@example.test'),
    'No se pudo conectar con el servicio de acceso. Intenta nuevamente.',
  )
})

test('una sesión expirada en otra pestaña deja de autorizar secciones privadas', async () => {
  const { presenter, expire } = setup({ restore: async () => ({ session: true }) })
  await presenter.start()

  expire()

  assert.deepEqual(presenter.getSnapshot(), {
    status: 'anonymous',
    notice: 'Tu sesión venció o ya no es válida. Ingresa nuevamente.',
  })
  assert.equal(presenter.access('profile'), 'login')
})

test('la restauración no autentica tokens rechazados ni si la API no puede verificarlos', async () => {
  const rejected = setup({ restore: async () => ({ session: true }) }, async () => {
    throw new SessionRejected()
  })
  await rejected.presenter.start()
  assert.deepEqual(rejected.presenter.getSnapshot(), {
    status: 'anonymous',
    notice: 'Tu sesión venció o ya no es válida. Ingresa nuevamente.',
  })
  assert.deepEqual(rejected.calls, ['signOut'])

  const unavailable = setup({ restore: async () => ({ session: true }) }, async () => {
    throw new Error('private-network-detail')
  })
  await unavailable.presenter.start()
  assert.deepEqual(unavailable.presenter.getSnapshot(), {
    status: 'anonymous',
    notice: 'No se pudo verificar tu sesión. Intenta ingresar nuevamente.',
  })
})

test('si Auth habilita sesión inmediata al registrar, verifica la identidad antes de continuar', async () => {
  const { presenter } = setup({ signUp: async () => 'signed_in' })

  assert.deepEqual(
    await presenter.signUp({
      email: 'persona@example.test',
      password: 'Correcta-123',
      confirmPassword: 'Correcta-123',
    }),
    { ok: true },
  )
  assert.deepEqual(presenter.getSnapshot(), { status: 'authenticated', user: identity })
})
