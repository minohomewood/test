import * as cheerio from 'cheerio'
import type { AnalysisIssue } from '@/types'

/** Flesch Reading Ease score */
function fleschReadingEase(text: string): number {
  const sentences = (text.match(/[.!?]+/g) ?? []).length || 1
  const words = (text.match(/\b\w+\b/g) ?? []).length || 1
  // Simple syllable count: count vowel groups
  const syllables = text
    .toLowerCase()
    .replace(/[^a-z]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .reduce((acc, word) => {
      const count = (word.match(/[aeiou]+/g) ?? []).length || 1
      return acc + count
    }, 0)

  const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)
  return Math.round(Math.max(0, Math.min(100, score)))
}

function getReadingLevel(score: number): string {
  if (score >= 90) return 'Very Easy (5th grade)'
  if (score >= 80) return 'Easy (6th grade)'
  if (score >= 70) return 'Fairly Easy (7th grade)'
  if (score >= 60) return 'Standard (8th–9th grade)'
  if (score >= 50) return 'Fairly Difficult (10th–12th grade)'
  if (score >= 30) return 'Difficult (College level)'
  return 'Very Difficult (Professional)'
}

export function checkContent(
  $: cheerio.CheerioAPI,
  url: string
): { issues: AnalysisIssue[]; wordCount: number } {
  const issues: AnalysisIssue[] = []

  // Extract readable text (exclude scripts, styles, nav, header, footer)
  $('script, style, nav, header, footer, aside').remove()
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim()
  const wordCount = (bodyText.match(/\b\w+\b/g) ?? []).length

  // ── Word count ─────────────────────────────────────────────────────────────
  if (wordCount < 100) {
    issues.push({
      category: 'content',
      severity: 'moderate',
      type: 'thin-content',
      description: `Page has very little content (${wordCount} words).`,
      context:
        'Pages with thin content may rank poorly. Add more meaningful content.',
    })
  } else if (wordCount < 300) {
    issues.push({
      category: 'content',
      severity: 'minor',
      type: 'low-word-count',
      description: `Page has low word count (${wordCount} words).`,
      context: 'Pages with at least 300 words tend to rank better in search engines.',
    })
  }

  // ── Readability ────────────────────────────────────────────────────────────
  if (wordCount > 50) {
    const score = fleschReadingEase(bodyText)
    const level = getReadingLevel(score)

    if (score < 30) {
      issues.push({
        category: 'content',
        severity: 'moderate',
        type: 'readability-very-difficult',
        description: `Content is very difficult to read (Flesch score: ${score} — ${level}).`,
        context:
          'Consider simplifying sentence structure and vocabulary for a broader audience.',
      })
    } else if (score < 50) {
      issues.push({
        category: 'content',
        severity: 'minor',
        type: 'readability-difficult',
        description: `Content is difficult to read (Flesch score: ${score} — ${level}).`,
        context: 'Shorter sentences and simpler words improve comprehension.',
      })
    }
  }

  // ── Broken / empty paragraphs ──────────────────────────────────────────────
  let emptyParagraphs = 0
  $('p').each((_, el) => {
    if ($(el).text().trim() === '') emptyParagraphs++
  })
  if (emptyParagraphs > 3) {
    issues.push({
      category: 'content',
      severity: 'minor',
      type: 'empty-paragraphs',
      description: `Page contains ${emptyParagraphs} empty <p> elements.`,
      context: 'Remove empty paragraph tags; use CSS margin/padding for spacing instead.',
    })
  }

  // ── Duplicate title & heading ──────────────────────────────────────────────
  const titleText = $('title').text().trim()
  const h1Text = $('h1').first().text().trim()
  if (titleText && h1Text && titleText.toLowerCase() === h1Text.toLowerCase()) {
    issues.push({
      category: 'content',
      severity: 'minor',
      type: 'title-h1-duplicate',
      description: 'The <title> tag and <h1> have identical text.',
      context:
        'Differentiate the title (for SERPs) from the H1 (for on-page context) to improve relevance signals.',
    })
  }

  // ── Broken placeholder content ─────────────────────────────────────────────
  const placeholders = ['lorem ipsum', 'placeholder', 'coming soon', 'under construction', 'todo:']
  const lowerBody = bodyText.toLowerCase()
  for (const placeholder of placeholders) {
    if (lowerBody.includes(placeholder)) {
      issues.push({
        category: 'content',
        severity: 'serious',
        type: 'placeholder-content',
        description: `Page contains placeholder text: "${placeholder}".`,
        context: 'Replace placeholder content with real, relevant content before publishing.',
      })
    }
  }

  // ── Long paragraphs ────────────────────────────────────────────────────────
  let longParaCount = 0
  $('p').each((_, el) => {
    const words = ($(el).text().match(/\b\w+\b/g) ?? []).length
    if (words > 150) longParaCount++
  })
  if (longParaCount > 0) {
    issues.push({
      category: 'content',
      severity: 'minor',
      type: 'long-paragraphs',
      description: `${longParaCount} paragraph(s) exceed 150 words.`,
      context: 'Break long paragraphs into smaller chunks to improve readability.',
    })
  }

  return { issues, wordCount }
}
