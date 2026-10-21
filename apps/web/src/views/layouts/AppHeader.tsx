import { useState } from 'react'
import type { AppView } from '../../presenters/app/useApp.js'
import { UserAvatar } from '../components/UserAvatar.js'

type AppHeaderProps = {
  title: string
  account: AppView['shell']['account']
  signingOut: boolean
  onOpenMenu: AppView['actions']['openMenu']
  onOpenAuth: AppView['actions']['openAuth']
  onOpenProfile: () => void
  onSignOut: AppView['actions']['signOut']
}

export function AppHeader({ title, account, signingOut, onOpenMenu, onOpenAuth, onOpenProfile, onSignOut }: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="app-header">
      <button className="menu-toggle" aria-label="Abrir menú" onClick={onOpenMenu}>☰</button>
      <span>{title}</span>
      <div className="header-tools">
        {account ? (
          <div className="account-menu">
            <button
              className="header-account"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <UserAvatar account={account} size="small" />
              <span className="header-account-name">{account.name}</span>
            </button>
            {menuOpen && (
              <div className="account-popover" role="menu">
                <p>{account.email}</p>
                <button
                  className="secondary-button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    onOpenProfile()
                  }}
                >
                  Mi perfil
                </button>
                <button
                  className="secondary-button"
                  role="menuitem"
                  disabled={signingOut}
                  onClick={() => void onSignOut()}
                >
                  {signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
                </button>
              </div>
            )}
          </div>
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
