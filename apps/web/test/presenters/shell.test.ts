import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { ShellPresenter } from '../../src/presenters/app/shell.presenter.js'

type Dependencies = ConstructorParameters<typeof ShellPresenter>[0]

function makeShell(options: {
  auth?: Partial<Dependencies['auth']>
  effects?: Partial<Dependencies['effects']>
  notices?: Partial<Dependencies['notices']>
  onSignedOut?: () => void
} = {}) {
  return new ShellPresenter({
    auth: {
      getSnapshot: () => ({ status: 'restoring' }),
      access: () => 'allow',
      subscribe: () => () => {},
      start: async () => {},
      signOut: async () => undefined,
      ...options.auth,
    },
    effects: {
      scrollToTop: () => {},
      onPageRestored: () => () => {},
      reload: () => {},
      ...options.effects,
    },
    notices: { show: () => {}, ...options.notices },
    onSignedOut: options.onSignedOut ?? (() => {}),
  })
}

test('opens login and remembers a private destination for an anonymous user', () => {
  const shell = makeShell({
    auth: {
      getSnapshot: () => ({ status: 'anonymous' }),
      subscribe: () => () => {},
      access: () => 'login',
      signOut: async () => undefined,
      start: async () => {},
    },
    notices: { show: () => {} },
    effects: {
      scrollToTop: () => {},
      onPageRestored: () => () => {},
      reload: () => {},
    },
    onSignedOut: () => {},
  })

  shell.navigate('publish')

  assert.deepEqual(shell.getSnapshot(), {
    section: 'overview',
    authView: 'login',
    pendingSection: 'publish',
    menuOpen: false,
    signingOut: false,
  })
})

test('opens and closes the mobile menu', () => {
  const shell = makeShell({
    auth: { access: () => 'allow' },
    effects: { scrollToTop: () => {} },
  })

  shell.openMenu()
  assert.equal(shell.getSnapshot().menuOpen, true)
  shell.closeMenu()
  assert.equal(shell.getSnapshot().menuOpen, false)
})

test('opens registration without retaining a previously requested destination', () => {
  const shell = makeShell({
    auth: { access: () => 'allow' },
    effects: { scrollToTop: () => {} },
  })

  shell.openAuth('register')

  assert.equal(shell.getSnapshot().authView, 'register')
  assert.equal(shell.getSnapshot().pendingSection, null)
  assert.equal(shell.getSnapshot().menuOpen, false)
})

test('switches auth mode without losing the private destination', () => {
  const shell = makeShell({
    auth: { access: () => 'login' },
    effects: { scrollToTop: () => {} },
  })
  shell.navigate('publish')

  shell.switchAuthMode('register')

  assert.equal(shell.getSnapshot().authView, 'register')
  assert.equal(shell.getSnapshot().pendingSection, 'publish')
})

test('closing authentication returns to the public catalog', () => {
  const shell = makeShell({
    auth: { access: () => 'allow' },
    effects: { scrollToTop: () => {} },
  })
  shell.openAuth('login')

  shell.closeAuth()

  assert.deepEqual(
    { section: shell.getSnapshot().section, authView: shell.getSnapshot().authView },
    { section: 'explore', authView: null },
  )
})

test('starts session restoration and reloads a page restored from the back-forward cache', () => {
  let pageRestored: (() => void) | undefined
  let stopWatching = false
  let started = false
  let reloads = 0
  const shell = makeShell({
    auth: {
      access: () => 'allow',
      subscribe: () => () => {},
      start: () => {
        started = true
        return Promise.resolve()
      },
    },
    effects: {
      scrollToTop: () => {},
      onPageRestored: (listener) => {
        pageRestored = listener
        return () => {
          stopWatching = true
          pageRestored = undefined
        }
      },
      reload: () => reloads++,
    },
  })

  const stop = shell.start()
  pageRestored?.()
  stop()
  pageRestored?.()

  assert.equal(started, true)
  assert.equal(reloads, 1)
  assert.equal(stopWatching, true)
})

test('redirects an unverified private destination to login after session restoration', () => {
  let status: 'restoring' | 'anonymous' = 'restoring'
  let sessionChanged: (() => void) | undefined
  const shell = makeShell({
    auth: {
      getSnapshot: () => ({ status }),
      subscribe: (listener) => {
        sessionChanged = listener
        return () => {}
      },
      access: () => (status === 'restoring' ? 'wait' : 'login'),
      start: async () => {},
    },
    effects: {
      scrollToTop: () => {},
      onPageRestored: () => () => {},
      reload: () => {},
    },
  })

  shell.start()
  shell.navigate('my-reports')
  status = 'anonymous'
  sessionChanged?.()

  assert.deepEqual(
    {
      section: shell.getSnapshot().section,
      authView: shell.getSnapshot().authView,
      pendingSection: shell.getSnapshot().pendingSection,
    },
    { section: 'overview', authView: 'login', pendingSection: 'my-reports' },
  )
})

test('returns to the requested private destination when authentication succeeds', () => {
  let status: 'anonymous' | 'authenticated' = 'anonymous'
  let sessionChanged: (() => void) | undefined
  const shell = makeShell({
    auth: {
      getSnapshot: () =>
        status === 'authenticated'
          ? { status, user: { id: 'account-1', email: 'person@example.test' } }
          : { status },
      subscribe: (listener) => {
        sessionChanged = listener
        return () => {}
      },
      access: () => (status === 'authenticated' ? 'allow' : 'login'),
      start: async () => {},
    },
    effects: {
      scrollToTop: () => {},
      onPageRestored: () => () => {},
      reload: () => {},
    },
  })
  shell.start()
  shell.navigate('publish')

  status = 'authenticated'
  sessionChanged?.()

  assert.deepEqual(
    {
      section: shell.getSnapshot().section,
      authView: shell.getSnapshot().authView,
      pendingSection: shell.getSnapshot().pendingSection,
    },
    { section: 'publish', authView: null, pendingSection: null },
  )
})

test('keeps the current section and reports a failed sign out', async () => {
  const events: string[] = []
  const shell = makeShell({
    auth: {
      getSnapshot: () => ({ status: 'authenticated', user: { id: 'account-1', email: 'p@example.test' } }),
      access: () => 'allow',
      subscribe: () => () => {},
      start: async () => {},
      signOut: async () => 'Could not sign out',
    },
    notices: { show: (message, error = false) => events.push(`${error ? 'error:' : ''}${message}`) },
    effects: { scrollToTop: () => {}, onPageRestored: () => () => {}, reload: () => {} },
    onSignedOut: () => events.push('cleared'),
  })
  shell.navigate('profile')

  await shell.signOut()

  assert.equal(shell.getSnapshot().section, 'profile')
  assert.equal(shell.getSnapshot().signingOut, false)
  assert.deepEqual(events, ['error:Could not sign out'])
})

test('clears private state and returns to explore after sign out succeeds', async () => {
  const events: string[] = []
  const shell = makeShell({
    auth: {
      getSnapshot: () => ({ status: 'authenticated', user: { id: 'account-1', email: 'p@example.test' } }),
      access: () => 'allow',
      subscribe: () => () => {},
      start: async () => {},
      signOut: async () => undefined,
    },
    notices: { show: (message) => events.push(message) },
    effects: { scrollToTop: () => {}, onPageRestored: () => () => {}, reload: () => {} },
    onSignedOut: () => events.push('cleared'),
  })
  shell.navigate('profile')
  shell.openMenu()

  await shell.signOut()

  assert.equal(shell.getSnapshot().section, 'explore')
  assert.equal(shell.getSnapshot().menuOpen, false)
  assert.equal(shell.getSnapshot().signingOut, false)
  assert.deepEqual(events, ['cleared', 'Cerraste sesión correctamente.'])
})

test('prepares the current section and account for the view', () => {
  const shell = makeShell({
    auth: {
      getSnapshot: () => ({
        status: 'authenticated',
        user: { id: 'account-1', email: 'persona@example.test' },
      }),
      access: () => 'allow',
      subscribe: () => () => {},
      start: async () => {},
      signOut: async () => undefined,
    },
    notices: { show: () => {} },
    effects: { scrollToTop: () => {}, onPageRestored: () => () => {}, reload: () => {} },
    onSignedOut: () => {},
  })

  assert.deepEqual(shell.view(), {
    title: 'Resumen',
    access: 'allow',
    account: { name: 'persona', email: 'persona@example.test' },
    restoring: false,
    authNotice: undefined,
  })
})

test('shows login after an expired session even from a public section', () => {
  let sessionChanged: (() => void) | undefined
  const shell = makeShell({
    auth: {
      getSnapshot: () => ({ status: 'anonymous', notice: 'Tu sesión venció.' }),
      access: () => 'allow',
      subscribe: (listener) => {
        sessionChanged = listener
        return () => {}
      },
      start: async () => {},
      signOut: async () => undefined,
    },
    notices: { show: () => {} },
    effects: { scrollToTop: () => {}, onPageRestored: () => () => {}, reload: () => {} },
    onSignedOut: () => {},
  })
  shell.start()

  sessionChanged?.()

  assert.equal(shell.getSnapshot().authView, 'login')
  assert.equal(shell.view().authNotice, 'Tu sesión venció.')
})
