import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateScores } from '@/lib/scores'
import type { IssueCategory, IssueSeverity } from '@/types'

export async function GET(
  _request: Request,
  { params }: { params: { scanId: string } }
) {
  try {
    const scan = await prisma.scan.findUnique({
      where: { id: params.scanId },
      include: {
        site: true,
        pages: {
          include: {
            issues: true,
          },
          orderBy: { url: 'asc' },
        },
      },
    })

    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
    }

    // Compute summary
    const allIssues = scan.pages.flatMap((p) =>
      p.issues.map((i) => ({
        category: i.category as IssueCategory,
        severity: i.severity as IssueSeverity,
      }))
    )

    const issuesByCategory = allIssues.reduce(
      (acc, i) => {
        acc[i.category] = (acc[i.category] ?? 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    const issuesBySeverity = allIssues.reduce(
      (acc, i) => {
        acc[i.severity] = (acc[i.severity] ?? 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    const scores = calculateScores(allIssues, scan.pages.length)

    return NextResponse.json({
      ...scan,
      summary: {
        totalPages: scan.pages.length,
        totalIssues: allIssues.length,
        issuesByCategory,
        issuesBySeverity,
        scores,
      },
    })
  } catch (err) {
    console.error('GET /api/scans/[scanId] error:', err)
    return NextResponse.json({ error: 'Failed to fetch scan' }, { status: 500 })
  }
}
