import type { ReportSummary } from '@perdiu/contracts'

export type CatalogReport = ReportSummary & { source: 'catalog' }

export type DemoReport = ReportSummary & {
  source: 'demo'
  phone: string
  position: { top: string; left: string }
}

export type Report = CatalogReport | DemoReport

export const cities = ['La Paz', 'Cochabamba', 'Santa Cruz'] as const

export function isOwnedBy(report: Report, ownerId: string): boolean {
  return report.source === 'demo' && report.author.id === ownerId
}
