# Web Improvement Service

Siteimprove-like website quality monitoring service.
Analyse any website for **accessibility**, **SEO**, **broken links**, and **content quality**.

## Features

| Category | What is checked |
|---|---|
| **Accessibility** | WCAG 2.1 A/AA — missing alt text, unlabelled inputs, heading hierarchy, missing lang/title, empty links, video captions, table headers |
| **SEO** | Title tag, meta description, H1, canonical URL, Open Graph, robots meta, structured data (JSON-LD), viewport, load time |
| **Broken Links** | HTTP status of internal links — 404s, 5xx errors, unreachable URLs, redirects |
| **Content Quality** | Word count, Flesch readability score, empty paragraphs, placeholder text, duplicate title/H1 |

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite via Prisma ORM
- **HTML parsing**: Cheerio

## Getting Started

```bash
# Install dependencies
npm install

# Set up the database
npm run db:push

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

1. Enter a website URL on the dashboard and click **Add Site**.
2. Click **Scan Now** to crawl the website (up to 20 pages, depth 2 by default).
3. View the overall and per-category scores on the site report page.
4. Click any category card to drill into the full list of issues.
5. Expand individual issues to see the HTML element and fix suggestions.

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Dashboard
│   ├── sites/[siteId]/page.tsx     # Site report page
│   └── api/
│       ├── sites/                  # GET list, POST create
│       ├── sites/[siteId]/         # GET detail, DELETE
│       ├── sites/[siteId]/scan/    # POST trigger scan
│       └── scans/[scanId]/         # GET scan with summary
├── components/
│   ├── ScoreBadge.tsx              # Circular score indicator
│   ├── SeverityBadge.tsx           # Critical/Serious/Moderate/Minor pill
│   └── CategoryIcon.tsx            # SVG icons per category
├── lib/
│   ├── db.ts                       # Prisma client singleton
│   ├── crawler.ts                  # Website crawler (fetch + cheerio)
│   ├── scores.ts                   # Score calculation logic
│   └── analyzers/
│       ├── accessibility.ts        # WCAG checks
│       ├── seo.ts                  # SEO checks
│       ├── links.ts                # Broken link detection
│       └── content.ts              # Content quality checks
└── types/index.ts                  # Shared TypeScript types
```
