import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { ShellPresenter } from '../../src/presenters/app/shell.presenter.js'

test('opens login and remembers a private destination for an anonymous user', () => {
  const shell = new ShellPresenter({
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
  const shell = new ShellPresenter({
    auth: { access: () => 'allow' },
    effects: { scrollToTop: () => {} },
  })

  shell.openMenu()
  assert.equal(shell.getSnapshot().menuOpen, true)
  shell.closeMenu()
  assert.equal(shell.getSnapshot().menuOpen, false)
})

test('opens registration without retaining a previously requested destination', () => {
  const shell = new ShellPresenter({
    auth: { access: () => 'allow' },
    effects: { scrollToTop: () => {} },
  })

  shell.openAuth('register')

  assert.equal(shell.getSnapshot().authView, 'register')
  assert.equal(shell.getSnapshot().pendingSection, null)
  assert.equal(shell.getSnapshot().menuOpen, false)
})

test('closing authentication returns to the public catalog', () => {
  const shell = new ShellPresenter({
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
