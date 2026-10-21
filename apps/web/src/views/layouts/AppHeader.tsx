import type { AppView } from '../../presenters/app/useApp.js'

type AppHeaderProps = {
  title: string
  account: AppView['shell']['account']
  signingOut: boolean
  onOpenMenu: AppView['actions']['openMenu']
  onOpenAuth: AppView['actions']['openAuth']
  onSignOut: AppView['actions']['signOut']
}

export function AppHeader({ title, account, signingOut, onOpenMenu, onOpenAuth, onSignOut }: AppHeaderProps) {
  return (
    <header className="app-header">
      <button className="menu-toggle" aria-label="Abrir menú" onClick={onOpenMenu}>☰</button>
      <span>{title}</span>
      <div className="header-tools">
        {account ? (
          <>
            <span>{account.name}</span>
            <button className="secondary-button" disabled={signingOut} onClick={() => void onSignOut()}>
              {signingOut ? 'Cerrando…' : 'Cerrar sesión'}
            </button>
          </>
        ) : (
          <>
            <button className="text-button" onClick={() => onOpenAuth('register')}>Crear cuenta</button>
            <button className="primary-button" onClick={() => onOpenAuth('login')}>Iniciar sesión</button>
          </>
        )}
      </div>
    </header>
  )
}
