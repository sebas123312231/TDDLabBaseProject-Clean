import type { AppView } from '../../presenters/app/useApp.js'
import { UserAvatar } from '../components/UserAvatar.js'

export function ProfilePage({ app }: { app: AppView }) {
  const account = app.shell.account
  return (
    <section className="profile-card">
      {account && <UserAvatar account={account} size="large" />}
      <div>
        <h2>{account?.name ?? 'Invitado'}</h2>
        <p>{account?.email ?? 'Inicia sesión para ver tu perfil.'}</p>
      </div>
      <button className="secondary-button" onClick={() => void app.actions.signOut()}>Cerrar sesión</button>
    </section>
  )
}
