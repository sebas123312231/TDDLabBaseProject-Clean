import type { ReportCategory, ReportType } from '@perdiu/contracts'

export interface ReportDraft {
  type: ReportType
  category: ReportCategory
  title: string
  description: string
  city: string
  zone: string
  incidentDate: string
  imageUrl?: string
}

export type DraftField = 'title' | 'description' | 'zone'
export type DraftIssue = 'required' | 'too_short'
export const draftMinimums = { title: 3, description: 20 }

export function validateDraft(draft: ReportDraft): Partial<Record<DraftField, DraftIssue>> {
  const issues: Partial<Record<DraftField, DraftIssue>> = {}
  const title = draft.title.trim()
  const description = draft.description.trim()
  if (!title) issues.title = 'required'
  else if (title.length < draftMinimums.title) issues.title = 'too_short'
  if (!description) issues.description = 'required'
  else if (description.length < draftMinimums.description) issues.description = 'too_short'
  if (!draft.zone.trim()) issues.zone = 'required'
  return issues
}
