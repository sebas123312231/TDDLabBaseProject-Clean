import type { Section } from '../../presenters/app/sections.js'
import type { AppView } from '../../presenters/app/useApp.js'
import { AuthPage } from '../pages/AuthPage.js'
import { SectionContent } from '../pages/SectionContent.js'

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

export function AppShell({ app }: { app: AppView }) {
  const { shell, actions } = app
  if (shell.authView)
    return <AuthPage key={shell.authView} mode={shell.authView} auth={app.auth} notice={shell.authNotice} onModeChange={actions.switchAuthMode} onBack={actions.closeAuth} />

  return (
    <div className="app-shell">
      {shell.menuOpen && <button className="sidebar-scrim" aria-label="Cerrar menú" onClick={actions.closeMenu} />}
      <aside className={`sidebar${shell.menuOpen ? ' sidebar-open' : ''}`}>
        <div className="sidebar-brand"><button onClick={() => actions.navigate('overview')}>PerdiU</button><button className="sidebar-close" aria-label="Cerrar menú" onClick={actions.closeMenu}>×</button></div>
        <nav aria-label="Navegación del panel">
          {navigation.map(({ section, label }) => (
            <button key={section} className={shell.section === section ? 'nav-item active' : 'nav-item'} aria-current={shell.section === section ? 'page' : undefined} onClick={() => actions.navigate(section)}>
              {label}
              {section === 'explore' && app.counts.active > 0 && <small>{app.counts.active}</small>}
              {section === 'my-reports' && app.counts.own > 0 && <small>{app.counts.own}</small>}
              {section === 'saved' && app.counts.saved > 0 && <small>{app.counts.saved}</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-account">
          {shell.account ? <><b>{shell.account.name}</b><small>{shell.account.email}</small></> : <button className="text-button" onClick={() => actions.openAuth('login')}>Iniciar sesión o crear cuenta</button>}
        </div>
      </aside>
      <div className="main-column">
        <header className="app-header">
          <button className="menu-toggle" aria-label="Abrir menú" onClick={actions.openMenu}>☰</button>
          <span>{shell.title}</span>
          <div className="header-tools">
            {shell.account ? <><span>{shell.account.name}</span><button className="secondary-button" disabled={shell.signingOut} onClick={() => void actions.signOut()}>{shell.signingOut ? 'Cerrando…' : 'Cerrar sesión'}</button></> : <><button className="text-button" onClick={() => actions.openAuth('register')}>Crear cuenta</button><button className="primary-button" onClick={() => actions.openAuth('login')}>Iniciar sesión</button></>}
          </div>
        </header>
        <main className="content">
          {shell.access === 'wait' && <p className="session-wait" role="status">Verificando tu sesión…</p>}
          <h1>{shell.title}</h1>
          {shell.access === 'allow' && <SectionContent app={app} />}
        </main>
        <footer className="app-footer"><span>PerdiU · Bolivia</span><button className="text-button" onClick={() => actions.navigate('safety')}>Privacidad y seguridad</button></footer>
      </div>
      {app.notice && <aside className={app.notice.error ? 'toast toast-error' : 'toast'} role={app.notice.error ? 'alert' : 'status'}>{app.notice.message}<button aria-label="Cerrar aviso" onClick={actions.dismissNotice}>×</button></aside>}
      {app.detail && <div className="dialog-backdrop" role="presentation" onClick={actions.reports.close}><section className="report-detail" role="dialog" aria-modal="true" aria-labelledby="detail-title" onClick={(event) => event.stopPropagation()}><button className="dialog-close" aria-label="Cerrar detalle" onClick={actions.reports.close}>×</button><img src={app.detail.card.image} alt="" /><h2 id="detail-title">{app.detail.card.title}</h2><p>{app.detail.card.description}</p><p>{app.detail.card.zone}, {app.detail.card.city}</p><button className="secondary-button" aria-pressed={app.detail.saved} onClick={() => actions.reports.toggleSaved(app.detail!.card.id)}>{app.detail.saved ? 'Quitar de guardados' : 'Guardar reporte'}</button>{app.detail.canContact && <button className="primary-button" onClick={() => actions.reports.contact(app.detail!.card.id)}>Contactar</button>}{app.detail.canResolve && <button className="secondary-button" onClick={() => actions.reports.resolve(app.detail!.card.id)}>Marcar resuelto</button>}</section></div>}
    </div>
  )
}
