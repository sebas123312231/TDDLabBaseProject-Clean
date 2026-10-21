import type { Section } from '../../presenters/app/sections.js'
import type { AppView } from '../../presenters/app/useApp.js'

const navigation: { section: Section; label: string }[] = [
  { section: 'overview', label: 'Resumen' },
  { section: 'explore', label: 'Explorar reportes' },
  { section: 'map', label: 'Mapa' },
  { section: 'publish', label: 'Publicar reporte' },
  { section: 'my-reports', label: 'Mis reportes' },
  { section: 'saved', label: 'Guardados' },
  { section: 'profile', label: 'Mi perfil' },
  { section: 'safety', label: 'Seguridad y privacidad' },
]

type SidebarProps = {
  section: Section
  menuOpen: boolean
  account: AppView['shell']['account']
  counts: AppView['counts']
  onNavigate: AppView['actions']['navigate']
  onCloseMenu: AppView['actions']['closeMenu']
  onOpenAuth: AppView['actions']['openAuth']
}

export function Sidebar({ section, menuOpen, account, counts, onNavigate, onCloseMenu, onOpenAuth }: SidebarProps) {
  return (
    <aside className={`sidebar${menuOpen ? ' sidebar-open' : ''}`}>
      <div className="sidebar-brand">
        <button onClick={() => onNavigate('overview')}>PerdiU</button>
        <button className="sidebar-close" aria-label="Cerrar menú" onClick={onCloseMenu}>×</button>
      </div>
      <nav aria-label="Navegación del panel">
        {navigation.map(({ section: itemSection, label }) => (
          <button
            key={itemSection}
            className={section === itemSection ? 'nav-item active' : 'nav-item'}
            aria-current={section === itemSection ? 'page' : undefined}
            onClick={() => onNavigate(itemSection)}
          >
            {label}
            {itemSection === 'explore' && counts.active > 0 && <small>{counts.active}</small>}
            {itemSection === 'my-reports' && counts.own > 0 && <small>{counts.own}</small>}
            {itemSection === 'saved' && counts.saved > 0 && <small>{counts.saved}</small>}
          </button>
        ))}
      </nav>
      <div className="sidebar-account">
        {account ? (
          <><b>{account.name}</b><small>{account.email}</small></>
        ) : (
          <button className="text-button" onClick={() => onOpenAuth('login')}>Iniciar sesión o crear cuenta</button>
        )}
      </div>
    </aside>
  )
}
