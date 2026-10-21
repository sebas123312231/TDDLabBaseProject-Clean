import type { AppView } from '../../presenters/app/useApp.js'
import { EmptyState } from '../components/EmptyState.js'
import { ReportGrid } from '../components/ReportGrid.js'

type SavedPageProps = {
  reports: AppView['saved']
  isSaved: AppView['isSaved']
  onSave: AppView['actions']['reports']['toggleSaved']
  onOpen: AppView['actions']['reports']['open']
  onNavigate: AppView['actions']['navigate']
}

export function SavedPage({ reports, isSaved, onSave, onOpen, onNavigate }: SavedPageProps) {
  return reports.length ? (
    <ReportGrid reports={reports} isSaved={isSaved} onSave={onSave} onOpen={onOpen} />
  ) : (
    <EmptyState
      title="Tu lista está vacía por ahora"
      description="Guarda reportes con el ícono de corazón y aparecerán aquí."
      action="Explorar reportes"
      onAction={() => onNavigate('explore')}
    />
  )
}
