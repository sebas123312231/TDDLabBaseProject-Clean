import type { FormEvent } from 'react'
import type { AuthMode } from '../../presenters/auth/auth-form.presenter.js'
import type { AuthPresenter } from '../../presenters/auth/auth.presenter.js'
import { useAuthForm } from '../../presenters/auth/useAuthForm.js'

export function AuthPage({
  mode,
  auth,
  notice,
  onModeChange,
  onBack,
}: {
  mode: AuthMode
  auth: AuthPresenter
  notice?: string
  onModeChange: (mode: AuthMode) => void
  onBack: () => void
}) {
  const { presenter: form, state } = useAuthForm(mode, auth)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    void form.submit()
  }

  return (
    <main className="auth-page">
      <button className="text-button" onClick={onBack}>← Volver a PerdiU</button>
      <section className="auth-card" aria-labelledby="auth-title">
        <p className="eyebrow">COMUNIDAD PERDIU</p>
        <h1 id="auth-title">{mode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}</h1>
        <p>{mode === 'login' ? 'Ingresa para gestionar tus reportes.' : 'Publica y administra tus reportes.'}</p>
        {notice && <p role="status">{notice}</p>}
        {state.sentTo ? (
          <div role="status">
            <p>Enviamos un enlace de confirmación a {state.sentTo}.</p>
            <button className="secondary-button" onClick={() => void form.resend()} disabled={state.resendStatus === 'Enviando…'}>
              Reenviar enlace
            </button>
            <p>{state.resendStatus}</p>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <label>
              Correo electrónico
              <input type="email" autoComplete="email" value={state.email} onChange={(event) => form.setEmail(event.target.value)} aria-invalid={Boolean(state.errors.email)} />
            </label>
            {state.errors.email && <small role="alert">{state.errors.email}</small>}
            <label>
              Contraseña
              <input type={state.showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={state.password} onChange={(event) => form.setPassword(event.target.value)} aria-invalid={Boolean(state.errors.password)} />
            </label>
            {state.errors.password && <small role="alert">{state.errors.password}</small>}
            {mode === 'register' && (
              <>
                <label>
                  Confirma tu contraseña
                  <input type={state.showPassword ? 'text' : 'password'} autoComplete="new-password" value={state.confirmPassword} onChange={(event) => form.setConfirmPassword(event.target.value)} aria-invalid={Boolean(state.errors.confirmPassword)} />
                </label>
                {state.errors.confirmPassword && <small role="alert">{state.errors.confirmPassword}</small>}
              </>
            )}
            <button type="button" className="text-button" onClick={form.togglePassword}>
              {state.showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            </button>
            {state.message && <p role="alert">{state.message}</p>}
            <button className="primary-button" type="submit" disabled={state.pending}>
              {state.pending ? 'Procesando…' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>
          </form>
        )}
        <button className="text-button" onClick={() => onModeChange(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </section>
    </main>
  )
}
