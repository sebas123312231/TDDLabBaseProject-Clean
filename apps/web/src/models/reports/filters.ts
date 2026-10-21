import type { ReportCategory, ReportQuery, ReportType } from '@perdiu/contracts'

export interface ReportFilters {
  text: string
  city?: string
  category?: ReportCategory
  type?: ReportType
}

export function toReportQuery(filters: ReportFilters): ReportQuery {
  const text = filters.text.trim()
  return {
    ...(text ? { q: text } : {}),
    ...(filters.city ? { city: filters.city } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.type ? { type: filters.type } : {}),
  }
}
