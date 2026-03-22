'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import ScoreBadge from '@/components/ScoreBadge'
import SeverityBadge from '@/components/SeverityBadge'
import CategoryIcon from '@/components/CategoryIcon'
import { calculateScores } from '@/lib/scores'
import type { IssueCategory, IssueSeverity } from '@/types'

interface Issue {
  id: string
  category: IssueCategory
  severity: IssueSeverity
  type: string
  description: string
  element?: string
  context?: string
}

interface Page {
  id: string
  url: string
  title?: string
  statusCode?: number
  loadTimeMs?: number
  wordCount?: number
  issues: Issue[]
}

interface Scan {
  id: string
  status: string
  startedAt: string
  finishedAt?: string
  pagesScanned: number
  pages: Page[]
}

interface Site {
  id: string
  name: string
  url: string
  createdAt: string
  scans: Scan[]
}

type TabKey = 'overview' | IssueCategory

const CATEGORY_COLORS: Record<IssueCategory, string> = {
  accessibility: 'text-purple-700 bg-purple-50 border-purple-200',
  seo: 'text-blue-700 bg-blue-50 border-blue-200',
  links: 'text-orange-700 bg-orange-50 border-orange-200',
  content: 'text-green-700 bg-green-50 border-green-200',
}

const CATEGORY_LABELS: Record<IssueCategory, string> = {
  accessibility: 'Accessibility',
  seo: 'SEO',
  links: 'Broken Links',
  content: 'Content Quality',
}

export default function SitePage() {
  const params = useParams()
  const siteId = params.siteId as string

  const [site, setSite] = useState<Site | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [severityFilter, setSeverityFilter] = useState<IssueSeverity | 'all'>('all')
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set())

  const loadSite = useCallback(async () => {
    const res = await fetch(`/api/sites/${siteId}`)
    if (res.ok) {
      const data = await res.json()
      setSite(data)
    }
    setLoading(false)
  }, [siteId])

  useEffect(() => {
    loadSite()
  }, [loadSite])

  async function handleScan() {
    setScanning(true)
    try {
      await fetch(`/api/sites/${siteId}/scan`, { method: 'POST' })
      await loadSite()
    } finally {
      setScanning(false)
    }
  }

  function toggleIssue(id: string) {
    setExpandedIssues((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-gray-400">
        Loading…
      </div>
    )
  }

  if (!site) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-600">Site not found.</p>
        <a href="/" className="mt-4 inline-block text-blue-600 hover:underline">
          Back to Dashboard
        </a>
      </div>
    )
  }

  const latestScan = site.scans[0]
  const allIssues: Issue[] = latestScan?.pages.flatMap((p) => p.issues) ?? []
  const scores = latestScan
    ? calculateScores(
        allIssues.map((i) => ({ category: i.category, severity: i.severity })),
        latestScan.pages.length
      )
    : null

  const categories: IssueCategory[] = ['accessibility', 'seo', 'links', 'content']

  function filterIssues(issues: Issue[]): Issue[] {
    if (severityFilter === 'all') return issues
    return issues.filter((i) => i.severity === severityFilter)
  }

  const categoryIssues =
    activeTab !== 'overview'
      ? filterIssues(allIssues.filter((i) => i.category === activeTab))
      : []

  const severities: IssueSeverity[] = ['critical', 'serious', 'moderate', 'minor']

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-gray-500" aria-label="Breadcrumb">
        <a href="/" className="hover:text-blue-600">Dashboard</a>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{site.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{site.name}</h1>
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            {site.url}
          </a>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {scanning ? 'Scanning…' : latestScan ? 'Re-scan' : 'Scan Now'}
        </button>
      </div>

      {!latestScan ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center text-gray-400">
          <p className="text-lg font-medium">No scan data</p>
          <p className="text-sm mt-1">Click "Scan Now" to analyse this website.</p>
        </div>
      ) : (
        <>
          {/* Score Cards */}
          {scores && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col items-center col-span-2 sm:col-span-1">
                <ScoreBadge score={scores.overall} size="lg" />
                <p className="text-sm font-semibold text-gray-700 mt-2">Overall</p>
              </div>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className={`bg-white rounded-xl border p-4 flex flex-col items-center transition-all hover:shadow-md ${
                    activeTab === cat ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-200'
                  }`}
                >
                  <ScoreBadge score={scores[cat]} size="md" />
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-600">
                    <CategoryIcon category={cat} className="w-3.5 h-3.5" />
                    <span className="font-medium">{CATEGORY_LABELS[cat]}</span>
                  </div>
                  <span className="text-xs text-gray-400 mt-0.5">
                    {allIssues.filter((i) => i.category === cat).length} issues
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Scan Meta */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-6 text-sm text-gray-600">
            <span>
              <strong className="text-gray-900">{latestScan.pagesScanned}</strong> pages scanned
            </span>
            <span>
              <strong className="text-gray-900">{allIssues.length}</strong> total issues
            </span>
            <span>
              Last scan:{' '}
              <strong className="text-gray-900">
                {new Date(latestScan.startedAt).toLocaleString()}
              </strong>
            </span>
            {latestScan.finishedAt && (
              <span>
                Duration:{' '}
                <strong className="text-gray-900">
                  {Math.round(
                    (new Date(latestScan.finishedAt).getTime() -
                      new Date(latestScan.startedAt).getTime()) /
                      1000
                  )}
                  s
                </strong>
              </span>
            )}
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <div className="flex overflow-x-auto gap-1">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === 'overview'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Pages Overview
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === cat
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <CategoryIcon category={cat} className="w-4 h-4" />
                  {CATEGORY_LABELS[cat]}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    allIssues.filter((i) => i.category === cat).length > 0
                      ? 'bg-red-100 text-red-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {allIssues.filter((i) => i.category === cat).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Page</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Load time</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Words</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Issues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {latestScan.pages.map((page) => (
                    <tr key={page.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 max-w-xs">
                        <div className="truncate">
                          <a
                            href={page.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {page.url.replace(site.url, '') || '/'}
                          </a>
                        </div>
                        {page.title && (
                          <div className="text-xs text-gray-400 truncate">{page.title}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                          !page.statusCode || page.statusCode >= 400
                            ? 'bg-red-100 text-red-700'
                            : page.statusCode >= 300
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {page.statusCode ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {page.loadTimeMs ? `${(page.loadTimeMs / 1000).toFixed(1)}s` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {page.wordCount ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${
                          page.issues.length === 0
                            ? 'text-green-600'
                            : page.issues.some((i) => i.severity === 'critical')
                            ? 'text-red-600'
                            : 'text-orange-600'
                        }`}>
                          {page.issues.length}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Category Issue Tab */}
          {activeTab !== 'overview' && (
            <div>
              {/* Severity filter */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => setSeverityFilter('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                    severityFilter === 'all'
                      ? 'bg-gray-800 text-white border-gray-800'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  All ({allIssues.filter((i) => i.category === activeTab).length})
                </button>
                {severities.map((s) => {
                  const count = allIssues.filter(
                    (i) => i.category === activeTab && i.severity === s
                  ).length
                  if (count === 0) return null
                  return (
                    <button
                      key={s}
                      onClick={() => setSeverityFilter(s)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                        severityFilter === s
                          ? 'bg-gray-800 text-white border-gray-800'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)} ({count})
                    </button>
                  )
                })}
              </div>

              {categoryIssues.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
                  <svg className="w-8 h-8 mx-auto mb-2 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="font-medium text-green-600">No issues found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Group by page */}
                  {latestScan.pages
                    .filter((p) => p.issues.some((i) => i.category === activeTab))
                    .map((page) => {
                      const pageIssues = filterIssues(
                        page.issues.filter((i) => i.category === activeTab)
                      )
                      if (pageIssues.length === 0) return null
                      return (
                        <div key={page.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                            <a
                              href={page.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline font-medium truncate"
                            >
                              {page.url}
                            </a>
                            <span className="text-xs text-gray-400 ml-2 shrink-0">
                              {pageIssues.length} issue{pageIssues.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <ul className="divide-y divide-gray-100">
                            {pageIssues.map((issue) => (
                              <li key={issue.id}>
                                <button
                                  onClick={() => toggleIssue(issue.id)}
                                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="mt-0.5 shrink-0">
                                      <SeverityBadge severity={issue.severity} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-gray-800">{issue.description}</p>
                                      {expandedIssues.has(issue.id) && (
                                        <div className="mt-2 space-y-2">
                                          {issue.element && (
                                            <pre className="text-xs bg-gray-100 rounded p-2 overflow-x-auto text-gray-600 whitespace-pre-wrap break-all">
                                              {issue.element}
                                            </pre>
                                          )}
                                          {issue.context && (
                                            <div className="text-xs text-blue-700 bg-blue-50 rounded p-2 flex gap-1.5">
                                              <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                              </svg>
                                              {issue.context}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <svg
                                      className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${
                                        expandedIssues.has(issue.id) ? 'rotate-180' : ''
                                      }`}
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </div>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
