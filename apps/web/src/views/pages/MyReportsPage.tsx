import type { AppView } from '../../presenters/app/useApp.js'
import { ReportGrid } from '../components/ReportGrid.js'

export function MyReportsPage({ app }: { app: AppView }) {
  const reports = app.actions.reports
  return (
    <>
      <div className="filter-row" aria-label="Filtrar mis reportes">
        {(['Todos', 'Activos', 'Resueltos'] as const).map((filter) => (
          <button className="secondary-button" key={filter} aria-pressed={app.myReports.filter === filter} onClick={() => reports.setOwnFilter(filter)}>{filter}</button>
        ))}
      </div>
      {app.myReports.cards.length ? (
        <ReportGrid reports={app.myReports.cards} isSaved={app.isSaved} onSave={reports.toggleSaved} onOpen={reports.open} />
      ) : <p>{app.myReports.empty.title}</p>}
      {app.myReports.cards.map((report) => (
        <div className="report-actions" key={report.id}>
          <button className="secondary-button" onClick={() => reports.resolve(report.id)}>Marcar resuelto</button>
          <button className="text-button" onClick={() => reports.remove(report.id)}>Quitar</button>
        </div>
      ))}
    </>
  )
}
