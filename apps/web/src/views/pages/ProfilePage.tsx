import type { AppView } from '../../presenters/app/useApp.js'

export function ProfilePage({ app }: { app: AppView }) {
  return (
    <section className="profile-card">
      <h2>{app.shell.account?.name ?? 'Invitado'}</h2>
      <p>{app.shell.account?.email ?? 'Inicia sesión para ver tu perfil.'}</p>
      <button className="secondary-button" onClick={() => void app.actions.signOut()}>Cerrar sesión</button>
    </section>
  )
}
