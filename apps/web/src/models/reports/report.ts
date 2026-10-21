import type { PublicProfile, ReportSummary } from '@perdiu/contracts'

export type CatalogReport = ReportSummary & { source: 'catalog' }

export type DemoReport = ReportSummary & {
  source: 'demo'
  phone: string
  position: { top: string; left: string }
}

export type Report = CatalogReport | DemoReport

export const cities = ['La Paz', 'Cochabamba', 'Santa Cruz'] as const

export const demoOwner: PublicProfile & { phone: string } = {
  id: 'demo-owner',
  displayName: 'Santiago Demo',
  phone: '59170000000',
}

export function isOwnedBy(report: Report, ownerId: string): boolean {
  return report.source === 'demo' && report.author.id === ownerId
}
