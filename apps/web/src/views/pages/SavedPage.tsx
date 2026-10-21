import type { AppView } from '../../presenters/app/useApp.js'
import { ReportGrid } from '../components/ReportGrid.js'

export function SavedPage({ app }: { app: AppView }) {
  return app.saved.length ? (
    <ReportGrid reports={app.saved} isSaved={app.isSaved} onSave={app.actions.reports.toggleSaved} onOpen={app.actions.reports.open} />
  ) : <p>Aún no tienes reportes guardados.</p>
}
