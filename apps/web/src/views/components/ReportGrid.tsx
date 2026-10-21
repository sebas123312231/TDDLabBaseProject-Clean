import type { ReportCard as ReportCardView } from '../../presenters/reports/report-card.js'
import { ReportCard } from './ReportCard.js'

export function ReportGrid({
  reports,
  isSaved,
  onSave,
  onOpen,
}: {
  reports: ReportCardView[]
  isSaved: (id: string) => boolean
  onSave: (id: string) => void
  onOpen: (id: string) => void
}) {
  return (
    <div className="report-grid">
      {reports.map((report) => (
        <ReportCard
          key={report.id}
          report={report}
          saved={isSaved(report.id)}
          onSave={() => onSave(report.id)}
          onOpen={() => onOpen(report.id)}
        />
      ))}
    </div>
  )
}
