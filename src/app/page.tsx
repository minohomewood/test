'use client'

import { useState, useEffect } from 'react'
import ScoreBadge from '@/components/ScoreBadge'
import CategoryIcon from '@/components/CategoryIcon'
import { calculateScores } from '@/lib/scores'
import type { IssueCategory, IssueSeverity } from '@/types'

interface Issue {
  category: IssueCategory
  severity: IssueSeverity
}

interface Page {
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

export default function Dashboard() {
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [addUrl, setAddUrl] = useState('')
  const [addName, setAddName] = useState('')
  const [addError, setAddError] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [scanningId, setScanningId] = useState<string | null>(null)

  async function loadSites() {
    const res = await fetch('/api/sites')
    const data = await res.json()
    setSites(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => {
    loadSites()
  }, [])

  async function handleAddSite(e: React.FormEvent) {
    e.preventDefault()
    setAddError('')
    setAddLoading(true)
    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: addUrl, name: addName || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAddError(data.error ?? 'Failed to add site')
      } else {
        setAddUrl('')
        setAddName('')
        await loadSites()
      }
    } catch {
      setAddError('Network error')
    } finally {
      setAddLoading(false)
    }
  }

  async function handleScan(siteId: string) {
    setScanningId(siteId)
    try {
      await fetch(`/api/sites/${siteId}/scan`, { method: 'POST' })
      await loadSites()
    } catch (err) {
      console.error(err)
    } finally {
      setScanningId(null)
    }
  }

  async function handleDelete(siteId: string) {
    if (!confirm('Delete this site and all its scan data?')) return
    await fetch(`/api/sites/${siteId}`, { method: 'DELETE' })
    await loadSites()
  }

  function getSiteScores(site: Site) {
    const latestScan = site.scans[0]
    if (!latestScan || latestScan.pages.length === 0) return null
    const allIssues = latestScan.pages.flatMap((p) => p.issues)
    return calculateScores(allIssues, latestScan.pages.length)
  }

  const categories: IssueCategory[] = ['accessibility', 'seo', 'links', 'content']
  const categoryLabels: Record<IssueCategory, string> = {
    accessibility: 'Accessibility',
    seo: 'SEO',
    links: 'Links',
    content: 'Content',
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-600">
          Monitor accessibility, SEO, broken links, and content quality across your websites.
        </p>
      </div>

      {/* Add Site Form */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add a website</h2>
        <form onSubmit={handleAddSite} className="flex flex-col sm:flex-row gap-3">
          <input
            type="url"
            placeholder="https://example.com"
            value={addUrl}
            onChange={(e) => setAddUrl(e.target.value)}
            required
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Website URL"
          />
          <input
            type="text"
            placeholder="Site name (optional)"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            className="w-48 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Site name"
          />
          <button
            type="submit"
            disabled={addLoading}
            className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {addLoading ? 'Adding…' : 'Add Site'}
          </button>
        </form>
        {addError && <p className="mt-2 text-sm text-red-600">{addError}</p>}
      </div>

      {/* Sites List */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : sites.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No sites yet</p>
          <p className="text-sm mt-1">Add a website above to get started.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {sites.map((site) => {
            const scores = getSiteScores(site)
            const latestScan = site.scans[0]
            const isScanning = scanningId === site.id

            return (
              <div key={site.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {site.name}
                        </h3>
                        {latestScan && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            latestScan.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : latestScan.status === 'running'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {latestScan.status}
                          </span>
                        )}
                      </div>
                      <a
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline truncate block"
                      >
                        {site.url}
                      </a>
                      {latestScan && (
                        <p className="text-xs text-gray-400 mt-1">
                          Last scanned: {new Date(latestScan.startedAt).toLocaleString()} ·{' '}
                          {latestScan.pagesScanned} pages
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/sites/${site.id}`}
                        className="px-4 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        View Report
                      </a>
                      <button
                        onClick={() => handleScan(site.id)}
                        disabled={isScanning}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isScanning ? 'Scanning…' : latestScan ? 'Re-scan' : 'Scan Now'}
                      </button>
                      <button
                        onClick={() => handleDelete(site.id)}
                        className="px-3 py-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="Delete site"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Scores */}
                  {scores ? (
                    <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-4 pt-4 border-t border-gray-100">
                      <div className="flex flex-col items-center">
                        <ScoreBadge score={scores.overall} size="md" label="Overall" />
                      </div>
                      {categories.map((cat) => (
                        <div key={cat} className="flex flex-col items-center gap-1">
                          <ScoreBadge score={scores[cat]} size="sm" />
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <CategoryIcon category={cat} className="w-3.5 h-3.5" />
                            {categoryLabels[cat]}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-400 text-center">
                      {isScanning ? 'Scanning in progress…' : 'No scan data yet — click "Scan Now" to start.'}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
