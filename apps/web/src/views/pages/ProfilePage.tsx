import type { Section } from '../../presenters/app/sections.js'
import type { AccountView } from '../../presenters/app/shell.presenter.js'
import { PageHeading } from '../components/PageHeading.js'
import { UserAvatar } from '../components/UserAvatar.js'

type ProfilePageProps = {
  account: AccountView
  signingOut: boolean
  onNavigate: (section: Section) => void
  onSignOut: () => void
}

export function ProfilePage({ account, signingOut, onNavigate, onSignOut }: ProfilePageProps) {
  return (
    <>
      <PageHeading title="Mi perfil" description="Los datos con los que usas PerdiU." />
      <section className="profile-card" aria-label="Datos de tu cuenta">
        <UserAvatar account={account} size="large" />
        <div>
          <h2>{account.name}</h2>
          <p>{account.email}</p>
          <small className="hint">Tu correo es privado: solo tú lo ves aquí.</small>
        </div>
      </section>
      <div className="profile-actions">
        <button className="profile-link" onClick={() => onNavigate('my-reports')}>
          <span>
            <b>Mis reportes</b>
            <small>Consulta el título, el tipo y el estado de tus publicaciones.</small>
          </span>
        </button>
        <button className="secondary-button" disabled={signingOut} onClick={onSignOut}>
          {signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </button>
      </div>
    </>
  )
}
