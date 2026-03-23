import * as cheerio from 'cheerio'
import { checkAccessibility } from './analyzers/accessibility'
import { checkSEO } from './analyzers/seo'
import { checkLinks } from './analyzers/links'
import { checkContent } from './analyzers/content'
import type { PageAnalysis } from '@/types'

const DEFAULT_MAX_PAGES = 50
const DEFAULT_MAX_DEPTH = 3
const REQUEST_TIMEOUT_MS = 15_000
const CONCURRENCY = 3

interface CrawlOptions {
  maxPages?: number
  maxDepth?: number
  onProgress?: (scanned: number, total: number, url: string) => void
}

interface CrawlQueue {
  url: string
  depth: number
}

export async function crawlSite(
  startUrl: string,
  options: CrawlOptions = {}
): Promise<PageAnalysis[]> {
  const { maxPages = DEFAULT_MAX_PAGES, maxDepth = DEFAULT_MAX_DEPTH, onProgress } = options

  const origin = new URL(startUrl).origin
  const visited = new Set<string>()
  const queue: CrawlQueue[] = [{ url: normalizeUrl(startUrl), depth: 0 }]
  const results: PageAnalysis[] = []

  while (queue.length > 0 && results.length < maxPages) {
    // Take up to CONCURRENCY items from the front of the queue
    const batch = queue.splice(0, CONCURRENCY)

    // Pre-mark all batch items as visited so concurrent pages in the same
    // batch don't re-enqueue each other's URLs.
    for (const item of batch) {
      visited.add(item.url)
    }

    const batchResults = await Promise.allSettled(
      batch.map(({ url, depth }) => analyzePage(url, origin, depth, maxDepth))
    )

    for (let i = 0; i < batchResults.length; i++) {
      const item = batch[i]
      const result = batchResults[i]

      if (result.status === 'rejected') {
        results.push({
          url: item.url,
          statusCode: 0,
          issues: [
            {
              category: 'links',
              severity: 'critical',
              type: 'page-fetch-failed',
              description: `Failed to fetch page: ${result.reason?.message ?? 'Unknown error'}`,
              context: 'Check if the URL is accessible and the server is running.',
            },
          ],
        })
        continue
      }

      const { analysis, discoveredLinks } = result.value

      results.push(analysis)
      onProgress?.(results.length, Math.min(results.length + queue.length, maxPages), item.url)

      // Enqueue discovered links that haven't been visited or queued.
      // Adding to `visited` immediately prevents the same URL from being
      // enqueued multiple times (e.g. when it appears in discoveredLinks
      // more than once, or is found by concurrent pages in the same batch).
      if (item.depth < maxDepth) {
        for (const link of discoveredLinks) {
          const normalized = normalizeUrl(link)
          if (
            !visited.has(normalized) &&
            normalized.startsWith(origin) &&
            results.length + queue.length < maxPages
          ) {
            visited.add(normalized)
            queue.push({ url: normalized, depth: item.depth + 1 })
          }
        }
      }
    }
  }

  return results
}

async function analyzePage(
  url: string,
  origin: string,
  depth: number,
  maxDepth: number
): Promise<{ analysis: PageAnalysis; discoveredLinks: string[] }> {
  const startTime = Date.now()

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let html = ''
  let statusCode = 0

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'WebImprovementBot/1.0 (+https://github.com/web-improvement-service)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en,ja;q=0.9',
      },
    })
    clearTimeout(timeout)
    statusCode = res.status

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) {
      return {
        analysis: { url, statusCode, issues: [] },
        discoveredLinks: [],
      }
    }

    html = await res.text()
  } catch (err) {
    clearTimeout(timeout)
    throw err
  }

  const loadTimeMs = Date.now() - startTime
  const $ = cheerio.load(html)

  const title = $('title').text().trim() || undefined
  const htmlSize = Buffer.byteLength(html, 'utf8')

  // Run all analyzers
  const accessibilityIssues = checkAccessibility($, url)
  const seoIssues = checkSEO($, url, loadTimeMs)
  const { issues: linkIssues, discoveredLinks } = await checkLinks($, url, false)
  const { issues: contentIssues, wordCount } = checkContent($, url)

  const issues = [
    ...accessibilityIssues,
    ...seoIssues,
    ...linkIssues,
    ...contentIssues,
  ]

  return {
    analysis: {
      url,
      title,
      statusCode,
      loadTimeMs,
      wordCount,
      htmlSize,
      issues,
    },
    discoveredLinks,
  }
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    // Remove fragment
    u.hash = ''
    // Remove trailing slash (except for root)
    if (u.pathname !== '/') {
      u.pathname = u.pathname.replace(/\/$/, '')
    }
    return u.href
  } catch {
    return url
  }
}
