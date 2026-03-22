import * as cheerio from 'cheerio'
import type { AnalysisIssue } from '@/types'

/**
 * Runs WCAG 2.1 accessibility checks on the parsed HTML.
 * Covers a meaningful subset of Level A and AA criteria.
 */
export function checkAccessibility(
  $: cheerio.CheerioAPI,
  url: string
): AnalysisIssue[] {
  const issues: AnalysisIssue[] = []

  // 1.1.1 Non-text Content — images must have alt attributes
  $('img').each((_, el) => {
    const alt = $(el).attr('alt')
    if (alt === undefined) {
      issues.push({
        category: 'accessibility',
        severity: 'serious',
        type: 'img-alt-missing',
        description: 'Image is missing an alt attribute.',
        element: $.html(el)?.slice(0, 200),
        context:
          'Add an alt attribute describing the image content, or alt="" for decorative images.',
      })
    } else if (alt.trim() === '' && $(el).attr('role') !== 'presentation') {
      // Decorative images should have role="presentation" or be in aria-hidden container
      // Empty alt is acceptable for decorative images — we flag only suspicious cases
      const src = $(el).attr('src') ?? ''
      if (src && !src.includes('spacer') && !src.includes('blank')) {
        // likely a content image with empty alt — moderate warning
        issues.push({
          category: 'accessibility',
          severity: 'moderate',
          type: 'img-alt-empty',
          description:
            'Image has an empty alt attribute but may not be decorative.',
          element: $.html(el)?.slice(0, 200),
          context:
            'If this image conveys meaning, add descriptive alt text. Otherwise add role="presentation".',
        })
      }
    }
  })

  // 2.4.2 Page Titled — document must have a title
  const title = $('title').text().trim()
  if (!title) {
    issues.push({
      category: 'accessibility',
      severity: 'serious',
      type: 'page-title-missing',
      description: 'Page is missing a <title> element.',
      context: 'Add a descriptive <title> tag inside <head>.',
    })
  }

  // 3.1.1 Language of Page — html element must have a lang attribute
  const lang = $('html').attr('lang')
  if (!lang || lang.trim() === '') {
    issues.push({
      category: 'accessibility',
      severity: 'serious',
      type: 'html-lang-missing',
      description: 'The <html> element is missing a lang attribute.',
      context: 'Add lang="en" (or the appropriate language code) to <html>.',
    })
  }

  // 1.3.1 Info and Relationships — form inputs need labels
  $('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"])').each(
    (_, el) => {
      const id = $(el).attr('id')
      const ariaLabel = $(el).attr('aria-label')
      const ariaLabelledby = $(el).attr('aria-labelledby')
      const title = $(el).attr('title')

      const hasLabel =
        ariaLabel ||
        ariaLabelledby ||
        title ||
        (id && $(`label[for="${id}"]`).length > 0)

      if (!hasLabel) {
        issues.push({
          category: 'accessibility',
          severity: 'critical',
          type: 'input-label-missing',
          description: 'Form input is missing an associated label.',
          element: $.html(el)?.slice(0, 200),
          context:
            'Associate a <label> element via the for attribute, or use aria-label / aria-labelledby.',
        })
      }
    }
  )

  // Select elements without labels
  $('select').each((_, el) => {
    const id = $(el).attr('id')
    const ariaLabel = $(el).attr('aria-label')
    const ariaLabelledby = $(el).attr('aria-labelledby')
    const hasLabel =
      ariaLabel ||
      ariaLabelledby ||
      (id && $(`label[for="${id}"]`).length > 0)
    if (!hasLabel) {
      issues.push({
        category: 'accessibility',
        severity: 'serious',
        type: 'select-label-missing',
        description: 'Select element is missing an associated label.',
        element: $.html(el)?.slice(0, 200),
        context: 'Use a <label for="..."> or aria-label attribute.',
      })
    }
  })

  // 2.4.4 Link Purpose — links must have discernible text
  $('a').each((_, el) => {
    const text = $(el).text().trim()
    const ariaLabel = $(el).attr('aria-label')
    const ariaLabelledby = $(el).attr('aria-labelledby')
    const title = $(el).attr('title')
    const hasImg = $(el).find('img[alt]').length > 0

    const hasAccessibleText = text || ariaLabel || ariaLabelledby || title || hasImg

    if (!hasAccessibleText) {
      issues.push({
        category: 'accessibility',
        severity: 'serious',
        type: 'link-empty',
        description: 'Link has no accessible text.',
        element: $.html(el)?.slice(0, 200),
        context: 'Add visible text, an aria-label, or an img with alt text inside the link.',
      })
    }

    // Ambiguous link text
    const ambiguous = ['click here', 'here', 'read more', 'more', 'learn more', 'link']
    if (text && ambiguous.includes(text.toLowerCase())) {
      issues.push({
        category: 'accessibility',
        severity: 'moderate',
        type: 'link-ambiguous',
        description: `Link text "${text}" is ambiguous and does not describe the destination.`,
        element: $.html(el)?.slice(0, 200),
        context: 'Use descriptive link text that makes sense out of context.',
      })
    }
  })

  // Heading hierarchy — check for skipped heading levels
  const headingLevels: number[] = []
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    headingLevels.push(parseInt(el.tagName.slice(1), 10))
  })
  for (let i = 1; i < headingLevels.length; i++) {
    const prev = headingLevels[i - 1]
    const curr = headingLevels[i]
    if (curr > prev + 1) {
      issues.push({
        category: 'accessibility',
        severity: 'moderate',
        type: 'heading-skipped',
        description: `Heading level skipped: <h${prev}> followed by <h${curr}>.`,
        context: 'Headings should not skip levels (e.g. h2 → h4). Use sequential levels.',
      })
      break // report only once per page
    }
  }

  // 1.2.1 Audio-only / Video-only — video without captions track
  $('video').each((_, el) => {
    const hasCaptions =
      $(el).find('track[kind="captions"], track[kind="subtitles"]').length > 0
    if (!hasCaptions) {
      issues.push({
        category: 'accessibility',
        severity: 'serious',
        type: 'video-no-captions',
        description: 'Video element has no captions or subtitles track.',
        element: `<video ...>`,
        context: 'Add a <track kind="captions"> element inside the video.',
      })
    }
  })

  // Tables — check for table headers
  $('table').each((_, el) => {
    const hasHeaders = $(el).find('th').length > 0
    if (!hasHeaders) {
      issues.push({
        category: 'accessibility',
        severity: 'moderate',
        type: 'table-no-headers',
        description: 'Data table has no header cells (<th>).',
        element: '<table ...>',
        context: 'Use <th> elements with scope attributes to identify column/row headers.',
      })
    }
  })

  return issues
}
