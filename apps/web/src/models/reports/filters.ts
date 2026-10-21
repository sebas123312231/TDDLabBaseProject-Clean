import type { ReportQuery } from '@perdiu/contracts'

export interface ReportFilters {
  text: string
}

export function toReportQuery(filters: ReportFilters): ReportQuery {
  const text = filters.text.trim()
  return text ? { q: text } : {}
}
