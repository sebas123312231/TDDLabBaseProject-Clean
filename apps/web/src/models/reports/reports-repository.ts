import type { ReportQuery, ReportSummary } from '@perdiu/contracts'

export interface ReportsRepository {
  list(signal: AbortSignal, query?: ReportQuery): Promise<ReportSummary[]>
}
