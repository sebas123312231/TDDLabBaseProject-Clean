import type { ReportSummary } from '@perdiu/contracts'

export type CatalogReport = ReportSummary & { source: 'catalog' }

export type DemoReport = ReportSummary & {
  source: 'demo'
  phone: string
  position: { top: string; left: string }
}

export type Report = CatalogReport | DemoReport
