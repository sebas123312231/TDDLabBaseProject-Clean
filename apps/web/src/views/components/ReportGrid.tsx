import type { ReportCard } from '../../presenters/reports/report-card.js'

export function ReportGrid({
  reports,
  isSaved,
  onSave,
  onOpen,
}: {
  reports: ReportCard[]
  isSaved: (id: string) => boolean
  onSave: (id: string) => void
  onOpen: (id: string) => void
}) {
  return (
    <div className="report-grid">
      {reports.map((report) => (
        <article className="report-card" key={report.id}>
          <button className="report-open" onClick={() => onOpen(report.id)}>
            <img src={report.image} alt="" loading="lazy" />
            <span className={`badge ${report.tone}`}>{report.badge}</span>
            <h3>{report.title}</h3>
            <p>{report.description}</p>
            <small>{report.zone}, {report.city} · {report.date}</small>
          </button>
          <button className="text-button save-button" onClick={() => onSave(report.id)} aria-pressed={isSaved(report.id)}>
            {isSaved(report.id) ? 'Guardado' : 'Guardar'}
          </button>
        </article>
      ))}
    </div>
  )
}
