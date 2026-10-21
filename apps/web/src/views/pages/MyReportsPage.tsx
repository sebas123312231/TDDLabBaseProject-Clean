import type { AppView } from '../../presenters/app/useApp.js'
import type { OwnFilter } from '../../presenters/reports/reports.presenter.js'
import type { Section } from '../../presenters/app/sections.js'
import { EmptyState } from '../components/EmptyState.js'
import { ReportGrid } from '../components/ReportGrid.js'
import { StatusTabs } from '../components/StatusTabs.js'

type MyReportsPageProps = {
  myReports: AppView['myReports']
  isSaved: AppView['isSaved']
  onSave: (id: string) => void
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
  isSaved,
  onSave,
  onOpen,
  onFilter,
  onResolve,
  onRemove,
  onNavigate,
}: MyReportsPageProps) {
  return (
    <>
      <div className="own-reports-heading">
        <button className="primary-button" onClick={() => onNavigate('publish')}>Nuevo reporte</button>
      </div>
      <div className="filter-row">
        <StatusTabs label="Estado de mis reportes" options={filters} value={myReports.filter} onChange={onFilter} />
      </div>
      {myReports.cards.length ? (
        <ReportGrid reports={myReports.cards} isSaved={isSaved} onSave={onSave} onOpen={onOpen} />
      ) : (
        <EmptyState
          title={myReports.empty.title}
          description="Cuando publiques algo, podrás seguirlo y gestionarlo desde aquí."
          action="Publicar mi primer reporte"
          onAction={() => onNavigate('publish')}
        />
      )}
      {myReports.cards.map((report) => (
        <div className="report-actions" key={report.id}>
          <button className="secondary-button" onClick={() => onResolve(report.id)}>Marcar resuelto</button>
          <button className="text-button" onClick={() => onRemove(report.id)}>Quitar</button>
        </div>
      ))}
    </>
  )
}
