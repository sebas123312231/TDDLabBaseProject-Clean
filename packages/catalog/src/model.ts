import type { PublicProfile, ReportData, ReportQuery } from '@perdiu/contracts'

export interface ReportRecord extends ReportData {
  author: PublicProfile
  imageUrls: string[]
}

export interface ReportRepository {
  list(query?: ReportQuery): Promise<ReportRecord[]>
}
