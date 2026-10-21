import type { AppView } from '../../presenters/app/useApp.js'

type ReportDetailView = NonNullable<AppView['detail']>

export function ReportDetail({
  detail,
  onSave,
  onContact,
  onResolve,
  onClose,
}: {
  detail: ReportDetailView
  onSave: () => void
  onContact: () => void
  onResolve: () => void
  onClose: () => void
}) {
  const { card, saved, canContact, canResolve } = detail

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="report-detail" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <button className="dialog-close" aria-label="Cerrar detalle" onClick={onClose}>×</button>
        <img className="detail-image" src={card.image} alt={card.title} />
        <div className="detail-content">
          <span className="card-meta"><span className={`status-text ${card.tone}`}>{card.badge}</span> · {card.category} · Publicado el {card.posted}</span>
          <h2 id="detail-title">{card.title}</h2>
          <p>{card.description}</p>
          <p className="card-meta">{card.zone}, {card.city} · {card.date} · {card.person}</p>
          <div className="detail-actions">
            {canResolve && <button className="primary-button" onClick={onResolve}>Marcar como resuelto</button>}
            {canContact && <button className="primary-button" onClick={onContact}>Contactar por WhatsApp</button>}
            <button className="secondary-button" onClick={onSave} aria-pressed={saved}>{saved ? 'Guardado' : 'Guardar'}</button>
          </div>
          <small className="hint">Tu correo no se muestra. Coordina el contacto con cuidado.</small>
        </div>
      </section>
    </div>
  )
}
