import type { IssueCategory, IssueSeverity, ScoreBreakdown } from '@/types'

interface IssueSummary {
  category: IssueCategory
  severity: IssueSeverity
}

const SEVERITY_WEIGHTS: Record<IssueSeverity, number> = {
  critical: 25,
  serious: 10,
  moderate: 5,
  minor: 2,
}

/**
 * Calculate a 0–100 score for a given category based on the number and severity
 * of issues found across all pages.
 *
 * The score starts at 100 and is reduced by the weighted sum of issues,
 * normalised by the number of pages so that larger sites don't get penalised
 * unfairly for having more pages.
 */
function categoryScore(
  issues: IssueSummary[],
  category: IssueCategory,
  pageCount: number
): number {
  const relevant = issues.filter((i) => i.category === category)
  if (relevant.length === 0) return 100

  const totalWeight = relevant.reduce(
    (acc, i) => acc + SEVERITY_WEIGHTS[i.severity],
    0
  )

  // Normalise: assume a "perfect" site has 0 issues per page
  // Deduct proportionally; cap at 0
  const deduction = (totalWeight / Math.max(1, pageCount)) * 2
  return Math.round(Math.max(0, 100 - deduction))
}

export function calculateScores(
  issues: IssueSummary[],
  pageCount: number
): ScoreBreakdown {
  const accessibility = categoryScore(issues, 'accessibility', pageCount)
  const seo = categoryScore(issues, 'seo', pageCount)
  const links = categoryScore(issues, 'links', pageCount)
  const content = categoryScore(issues, 'content', pageCount)
  const overall = Math.round((accessibility + seo + links + content) / 4)

  return { accessibility, seo, links, content, overall }
}
