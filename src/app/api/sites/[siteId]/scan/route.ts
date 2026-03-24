import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { crawlSite } from '@/lib/crawler'

export async function POST(
  request: Request,
  { params }: { params: { siteId: string } }
) {
  try {
    const site = await prisma.site.findUnique({ where: { id: params.siteId } })
    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    // Parse optional options from request body
    const body = await request.json().catch(() => ({})) as {
      maxPages?: number
      maxDepth?: number
    }
    const maxPages = Math.min(body.maxPages ?? 200, 200)
    const maxDepth = Math.min(body.maxDepth ?? 3, 3)

    // Create a scan record
    const scan = await prisma.scan.create({
      data: {
        siteId: site.id,
        status: 'running',
        maxPages,
        maxDepth,
      },
    })

    // Run the crawl synchronously (for simplicity; limit pages to keep it fast)
    try {
      const rawResults = await crawlSite(site.url, { maxPages, maxDepth })

      // Deduplicate by URL as a safety net against any edge-case duplicates
      // in the crawler (duplicate URLs cause a unique constraint violation).
      const seenUrls = new Set<string>()
      const pageResults = rawResults.filter((p) => {
        if (seenUrls.has(p.url)) return false
        seenUrls.add(p.url)
        return true
      })

      // Persist results in a single transaction
      await prisma.$transaction(async (tx) => {
        for (const pageResult of pageResults) {
          const page = await tx.page.create({
            data: {
              scanId: scan.id,
              url: pageResult.url,
              title: pageResult.title,
              statusCode: pageResult.statusCode,
              loadTimeMs: pageResult.loadTimeMs,
              wordCount: pageResult.wordCount,
              htmlSize: pageResult.htmlSize,
            },
          })

          if (pageResult.issues.length > 0) {
            await tx.issue.createMany({
              data: pageResult.issues.map((issue) => ({
                pageId: page.id,
                category: issue.category,
                severity: issue.severity,
                type: issue.type,
                description: issue.description,
                element: issue.element,
                context: issue.context,
              })),
            })
          }
        }

        await tx.scan.update({
          where: { id: scan.id },
          data: {
            status: 'completed',
            finishedAt: new Date(),
            pagesScanned: pageResults.length,
          },
        })
      })

      const completedScan = await prisma.scan.findUnique({
        where: { id: scan.id },
        include: {
          pages: {
            include: { issues: true },
          },
        },
      })

      return NextResponse.json(completedScan, { status: 201 })
    } catch (crawlError) {
      await prisma.scan.update({
        where: { id: scan.id },
        data: {
          status: 'failed',
          finishedAt: new Date(),
          error:
            crawlError instanceof Error
              ? crawlError.message
              : 'Unknown crawl error',
        },
      })
      throw crawlError
    }
  } catch (err) {
    console.error('POST /api/sites/[siteId]/scan error:', err)
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 })
  }
}
