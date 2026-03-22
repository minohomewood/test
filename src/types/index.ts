export type IssueSeverity = 'critical' | 'serious' | 'moderate' | 'minor'
export type IssueCategory = 'accessibility' | 'seo' | 'links' | 'content'
export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface AnalysisIssue {
  category: IssueCategory
  severity: IssueSeverity
  type: string
  description: string
  element?: string
  context?: string
}

export interface PageAnalysis {
  url: string
  title?: string
  statusCode?: number
  loadTimeMs?: number
  wordCount?: number
  htmlSize?: number
  issues: AnalysisIssue[]
}

export interface ScoreBreakdown {
  accessibility: number
  seo: number
  links: number
  content: number
  overall: number
}

export interface ScanSummary {
  totalPages: number
  totalIssues: number
  issuesByCategory: Record<IssueCategory, number>
  issuesBySeverity: Record<IssueSeverity, number>
  scores: ScoreBreakdown
}
