import type { AppView } from '../../presenters/app/useApp.js'
import type { OwnFilter } from '../../presenters/reports/reports.presenter.js'
import type { Section } from '../../presenters/app/sections.js'
import { EmptyState } from '../components/EmptyState.js'
import { PageHeading } from '../components/PageHeading.js'
import { StatusTabs } from '../components/StatusTabs.js'

type MyReportsPageProps = {
  myReports: AppView['myReports']
  onOpen: (id: string) => void
  onFilter: (filter: OwnFilter) => void
  onResolve: (id: string) => void
  onRemove: (id: string) => void
  onNavigate: (section: Section) => void
}

const filters = [
  { value: 'Todos', label: 'Todos' },
  { value: 'Activos', label: 'Activos' },
  { value: 'Resueltos', label: 'Resueltos' },
] as const

export function MyReportsPage({
  myReports,
  onOpen,
  onFilter,
  onResolve,
  onRemove,
  onNavigate,
}: MyReportsPageProps) {
  return (
    <>
      <PageHeading
        title="Mis reportes"
        description={`${myReports.total} publicados · ${myReports.active} activos. Solo tú puedes cambiar su estado.`}
        action={
          <button className="primary-button" onClick={() => onNavigate('publish')}>
            Nuevo reporte
          </button>
        }
      />
      <div className="filter-row">
        <StatusTabs label="Estado de mis reportes" options={filters} value={myReports.filter} onChange={onFilter} />
        <span className="result-count"><b>{myReports.cards.length}</b> resultados</span>
      </div>
      <div className="managed-list">
        {myReports.cards.map((report) => (
          <article className="managed-report" key={report.id}>
            <button className="managed-image" aria-label={`Abrir reporte ${report.title}`} onClick={() => onOpen(report.id)}>
              <img src={report.image} alt="" />
            </button>
            <div>
              <span className="card-meta">
                <span className={'status-text ' + report.tone}>{report.badge}</span> · {report.category} · {report.posted}
              </span>
              <button className="card-title" onClick={() => onOpen(report.id)}>{report.title}</button>
              <p className="card-description">{report.description}</p>
              <span className="card-meta">{report.zone}, {report.city}</span>
            </div>
            <div className="managed-actions">
              {!report.resolved && <button className="secondary-button" onClick={() => onResolve(report.id)}>Marcar resuelto</button>}
              <button className="text-button danger" aria-label="Eliminar reporte" onClick={() => onRemove(report.id)}>
                Eliminar
              </button>
            </div>
          </article>
        ))}
        {myReports.cards.length === 0 && (
          <EmptyState
            title={myReports.empty.title}
            description="Cuando publiques algo, podrás seguirlo y gestionarlo desde aquí."
            action="Publicar mi primer reporte"
            onAction={() => onNavigate('publish')}
          />
        )}
      </div>
    </>
  )
}
