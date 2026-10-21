import type { AppView } from '../../presenters/app/useApp.js'
import { ReportDetail } from '../components/ReportDetail.js'
import { Toast } from '../components/Toast.js'
import { AppHeader } from './AppHeader.js'
import { Sidebar } from './Sidebar.js'
import { AuthPage } from '../pages/AuthPage.js'
import { SectionContent } from '../pages/SectionContent.js'

export function AppShell({ app }: { app: AppView }) {
  const { shell, actions } = app
  if (shell.authView)
    return <AuthPage key={shell.authView} mode={shell.authView} auth={app.auth} notice={shell.authNotice} onModeChange={actions.switchAuthMode} onBack={actions.closeAuth} />

  return (
    <div className="app-shell">
      {shell.menuOpen && <button className="sidebar-scrim" aria-label="Cerrar menú" onClick={actions.closeMenu} />}
      <Sidebar
        section={shell.section}
        menuOpen={shell.menuOpen}
        account={shell.account}
        counts={app.counts}
        onNavigate={actions.navigate}
        onCloseMenu={actions.closeMenu}
        onOpenAuth={actions.openAuth}
      />
      <div className="main-column">
        <AppHeader
          title={shell.title}
          account={shell.account}
          signingOut={shell.signingOut}
          onOpenMenu={actions.openMenu}
          onOpenAuth={actions.openAuth}
          onOpenProfile={() => actions.navigate('profile')}
          onSignOut={actions.signOut}
        />
        <main className="content">
          {shell.access === 'wait' && <p className="session-wait" role="status">Verificando tu sesión…</p>}
          <h1>{shell.title}</h1>
          {shell.access === 'allow' && <SectionContent app={app} />}
        </main>
        <footer className="app-footer"><span>PerdiU · Bolivia</span><button className="text-button" onClick={() => actions.navigate('safety')}>Privacidad y seguridad</button></footer>
      </div>
      {app.notice && <Toast notice={app.notice} onClose={actions.dismissNotice} />}
      {app.detail && <ReportDetail detail={app.detail} onSave={() => actions.reports.toggleSaved(app.detail!.card.id)} onContact={() => actions.reports.contact(app.detail!.card.id)} onResolve={() => actions.reports.resolve(app.detail!.card.id)} onClose={actions.reports.close} />}
    </div>
  )
}
