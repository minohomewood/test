import * as cheerio from 'cheerio'
import type { AnalysisIssue } from '@/types'

export function checkSEO(
  $: cheerio.CheerioAPI,
  url: string,
  loadTimeMs: number
): AnalysisIssue[] {
  const issues: AnalysisIssue[] = []

  // ── Title tag ──────────────────────────────────────────────────────────────
  const title = $('title').text().trim()
  if (!title) {
    issues.push({
      category: 'seo',
      severity: 'critical',
      type: 'title-missing',
      description: 'Page is missing a <title> tag.',
      context: 'Add a unique, descriptive <title> tag (50–60 characters recommended).',
    })
  } else if (title.length < 10) {
    issues.push({
      category: 'seo',
      severity: 'moderate',
      type: 'title-too-short',
      description: `Title tag is too short (${title.length} chars): "${title}"`,
      context: 'Use 50–60 characters to maximise visibility in search results.',
    })
  } else if (title.length > 60) {
    issues.push({
      category: 'seo',
      severity: 'minor',
      type: 'title-too-long',
      description: `Title tag is too long (${title.length} chars): "${title.slice(0, 60)}…"`,
      context: 'Keep titles under 60 characters to avoid truncation in SERPs.',
    })
  }

  // ── Meta description ───────────────────────────────────────────────────────
  const metaDesc = $('meta[name="description"]').attr('content')?.trim() ?? ''
  if (!metaDesc) {
    issues.push({
      category: 'seo',
      severity: 'serious',
      type: 'meta-description-missing',
      description: 'Page is missing a meta description.',
      context: 'Add <meta name="description" content="…"> (120–160 chars).',
    })
  } else if (metaDesc.length < 50) {
    issues.push({
      category: 'seo',
      severity: 'moderate',
      type: 'meta-description-too-short',
      description: `Meta description is too short (${metaDesc.length} chars).`,
      context: 'Use 120–160 characters to give search engines enough context.',
    })
  } else if (metaDesc.length > 160) {
    issues.push({
      category: 'seo',
      severity: 'minor',
      type: 'meta-description-too-long',
      description: `Meta description is too long (${metaDesc.length} chars).`,
      context: 'Keep meta descriptions under 160 characters.',
    })
  }

  // ── H1 heading ─────────────────────────────────────────────────────────────
  const h1Count = $('h1').length
  if (h1Count === 0) {
    issues.push({
      category: 'seo',
      severity: 'serious',
      type: 'h1-missing',
      description: 'Page has no <h1> heading.',
      context: 'Every page should have exactly one <h1> that describes its main topic.',
    })
  } else if (h1Count > 1) {
    issues.push({
      category: 'seo',
      severity: 'moderate',
      type: 'h1-multiple',
      description: `Page has ${h1Count} <h1> headings (only one is recommended).`,
      context: 'Use a single <h1> per page; use <h2>–<h6> for sub-sections.',
    })
  }

  // ── Image alt text (SEO perspective) ───────────────────────────────────────
  $('img').each((_, el) => {
    const alt = $(el).attr('alt')
    if (alt === undefined) {
      issues.push({
        category: 'seo',
        severity: 'moderate',
        type: 'img-alt-missing-seo',
        description: 'Image missing alt text — search engines cannot index image content.',
        element: $.html(el)?.slice(0, 200),
        context: 'Descriptive alt text helps search engines understand image content.',
      })
    }
  })

  // ── Canonical URL ──────────────────────────────────────────────────────────
  const canonical = $('link[rel="canonical"]').attr('href')
  if (!canonical) {
    issues.push({
      category: 'seo',
      severity: 'moderate',
      type: 'canonical-missing',
      description: 'Page is missing a canonical link element.',
      context: 'Add <link rel="canonical" href="…"> to prevent duplicate content issues.',
    })
  }

  // ── Open Graph tags ────────────────────────────────────────────────────────
  const ogTitle = $('meta[property="og:title"]').attr('content')
  const ogDesc = $('meta[property="og:description"]').attr('content')
  const ogImage = $('meta[property="og:image"]').attr('content')

  if (!ogTitle || !ogDesc || !ogImage) {
    issues.push({
      category: 'seo',
      severity: 'minor',
      type: 'og-tags-incomplete',
      description: `Open Graph tags incomplete: missing ${[
        !ogTitle && 'og:title',
        !ogDesc && 'og:description',
        !ogImage && 'og:image',
      ]
        .filter(Boolean)
        .join(', ')}.`,
      context:
        'Complete Open Graph tags improve appearance when shared on social media.',
    })
  }

  // ── Robots meta ────────────────────────────────────────────────────────────
  const robotsMeta = $('meta[name="robots"]').attr('content')?.toLowerCase() ?? ''
  if (robotsMeta.includes('noindex')) {
    issues.push({
      category: 'seo',
      severity: 'critical',
      type: 'robots-noindex',
      description: 'Page has robots meta tag set to "noindex".',
      context: 'This page will not be indexed by search engines. Verify this is intentional.',
    })
  }
  if (robotsMeta.includes('nofollow')) {
    issues.push({
      category: 'seo',
      severity: 'serious',
      type: 'robots-nofollow',
      description: 'Page has robots meta tag set to "nofollow".',
      context: 'Search engines will not follow links on this page.',
    })
  }

  // ── Structured data ────────────────────────────────────────────────────────
  const jsonLd = $('script[type="application/ld+json"]')
  if (jsonLd.length === 0) {
    issues.push({
      category: 'seo',
      severity: 'minor',
      type: 'structured-data-missing',
      description: 'No structured data (JSON-LD) found on the page.',
      context:
        'Adding Schema.org structured data can enable rich results in Google Search.',
    })
  }

  // ── Page speed ─────────────────────────────────────────────────────────────
  if (loadTimeMs > 3000) {
    issues.push({
      category: 'seo',
      severity: 'serious',
      type: 'slow-load-time',
      description: `Page loaded in ${(loadTimeMs / 1000).toFixed(1)}s, which is above the 3s threshold.`,
      context:
        'Page speed is a ranking factor. Optimise images, minify CSS/JS, and use caching.',
    })
  } else if (loadTimeMs > 1500) {
    issues.push({
      category: 'seo',
      severity: 'moderate',
      type: 'moderate-load-time',
      description: `Page loaded in ${(loadTimeMs / 1000).toFixed(1)}s.`,
      context: 'Consider optimisations to reach sub-1.5s load time.',
    })
  }

  // ── Viewport meta ──────────────────────────────────────────────────────────
  const viewport = $('meta[name="viewport"]').attr('content')
  if (!viewport) {
    issues.push({
      category: 'seo',
      severity: 'serious',
      type: 'viewport-missing',
      description: 'Page is missing the viewport meta tag.',
      context:
        'Add <meta name="viewport" content="width=device-width, initial-scale=1"> for mobile-friendliness.',
    })
  }

  return issues
}
