import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Web Improvement Service',
  description:
    'Audit your website for accessibility, SEO, broken links, and content quality.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <a href="/" className="text-lg font-semibold text-gray-900 hover:text-blue-600">
                  Web Improvement Service
                </a>
              </div>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="bg-white border-t border-gray-200 py-4 text-center text-sm text-gray-500">
            Web Improvement Service — Accessibility · SEO · Broken Links · Content Quality
          </footer>
        </div>
      </body>
    </html>
  )
}
