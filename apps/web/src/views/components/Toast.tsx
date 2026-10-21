import type { Notice } from '../../presenters/app/notice.presenter.js'

export function Toast({ notice, onClose }: { notice: Notice; onClose: () => void }) {
  return (
    <aside className={notice.error ? 'toast toast-error' : 'toast'} role={notice.error ? 'alert' : 'status'}>
      {notice.message}
      <button onClick={onClose} aria-label="Cerrar aviso">×</button>
    </aside>
  )
}
