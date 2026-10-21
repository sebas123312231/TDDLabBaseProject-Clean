import type { ReportCategory, ReportQuery, ReportType } from '@perdiu/contracts'
import type { Report } from './report.js'

export interface ReportFilters {
  text: string
  city?: string
  category?: ReportCategory
  type?: ReportType
}

export function hasActiveFilters(filters: ReportFilters): boolean {
  return Boolean(filters.text.trim() || filters.city || filters.category || filters.type)
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

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')

export function matchesFilters(report: Report, filters: ReportFilters): boolean {
  const text = normalizeText([report.title, report.description, report.zone, report.city].join(' '))
  return (
    report.state === 'active' &&
    (!filters.text || text.includes(normalizeText(filters.text))) &&
    (!filters.city || report.city === filters.city) &&
    (!filters.category || report.category === filters.category) &&
    (!filters.type || report.type === filters.type)
  )
}
