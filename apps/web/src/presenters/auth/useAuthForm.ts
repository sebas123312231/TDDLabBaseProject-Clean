import { useMemo } from 'react'
import type { AuthMode } from './auth-form.presenter.js'
import { AuthFormPresenter } from './auth-form.presenter.js'
import type { AuthPresenter } from './auth.presenter.js'
import { useStore } from '../useStore.js'

export function useAuthForm(mode: AuthMode, auth: AuthPresenter) {
  const presenter = useMemo(() => new AuthFormPresenter(mode, auth), [mode, auth])
  return { presenter, state: useStore(presenter) }
}
