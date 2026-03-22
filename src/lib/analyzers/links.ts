import * as cheerio from 'cheerio'
import type { AnalysisIssue } from '@/types'

export interface LinkCheckResult {
  issues: AnalysisIssue[]
  /** All hrefs discovered on this page (for crawling) */
  discoveredLinks: string[]
}

/**
 * Extract all links from a page and optionally check their HTTP status.
 * For external links we only check them when checkExternal is true (default false
 * to keep scanning fast).
 */
export async function checkLinks(
  $: cheerio.CheerioAPI,
  pageUrl: string,
  checkExternal = false
): Promise<LinkCheckResult> {
  const issues: AnalysisIssue[] = []
  const discoveredLinks: string[] = []

  const baseOrigin = (() => {
    try {
      return new URL(pageUrl).origin
    } catch {
      return ''
    }
  })()

  const hrefs: string[] = []

  $('a[href]').each((_, el) => {
    const raw = $(el).attr('href')?.trim()
    if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('javascript:')) {
      return
    }
    try {
      const resolved = new URL(raw, pageUrl).href
      hrefs.push(resolved)
      if (resolved.startsWith(baseOrigin)) {
        discoveredLinks.push(resolved)
      }
    } catch {
      // relative or malformed URL
      issues.push({
        category: 'links',
        severity: 'moderate',
        type: 'link-malformed',
        description: `Malformed link href: "${raw}"`,
        element: $.html(el)?.slice(0, 200),
        context: 'Verify the href value is a valid URL or relative path.',
      })
    }
  })

  // Check unique links only
  const unique = [...new Set(hrefs)]
  const toCheck = checkExternal
    ? unique
    : unique.filter((u) => u.startsWith(baseOrigin))

  // Parallel link checking with concurrency limit
  const CONCURRENCY = 5
  for (let i = 0; i < toCheck.length; i += CONCURRENCY) {
    const batch = toCheck.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(
      batch.map(async (href) => {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000)
        try {
          const res = await fetch(href, {
            method: 'HEAD',
            redirect: 'follow',
            signal: controller.signal,
            headers: { 'User-Agent': 'WebImprovementBot/1.0' },
          })
          clearTimeout(timeout)
          return { href, status: res.status }
        } catch {
          clearTimeout(timeout)
          return { href, status: 0 }
        }
      })
    )

    for (const result of results) {
      if (result.status !== 'fulfilled') continue
      const { href, status } = result.value
      if (status === 0) {
        issues.push({
          category: 'links',
          severity: 'serious',
          type: 'link-unreachable',
          description: `Link could not be reached: ${href}`,
          context: 'Check if the server is accessible and the URL is correct.',
        })
      } else if (status === 404) {
        issues.push({
          category: 'links',
          severity: 'critical',
          type: 'link-not-found',
          description: `Broken link (404 Not Found): ${href}`,
          context: 'Update or remove this link — broken links hurt user experience and SEO.',
        })
      } else if (status === 403) {
        issues.push({
          category: 'links',
          severity: 'moderate',
          type: 'link-forbidden',
          description: `Link returned 403 Forbidden: ${href}`,
          context: 'Verify the URL and whether authentication is required.',
        })
      } else if (status >= 500) {
        issues.push({
          category: 'links',
          severity: 'serious',
          type: 'link-server-error',
          description: `Link returned ${status} server error: ${href}`,
          context: 'The target server returned an error. Monitor and fix when possible.',
        })
      } else if (status >= 301 && status <= 308) {
        issues.push({
          category: 'links',
          severity: 'minor',
          type: 'link-redirect',
          description: `Link redirects (${status}): ${href}`,
          context: 'Update the link to point directly to the final destination.',
        })
      }
    }
  }

  return { issues, discoveredLinks }
}
