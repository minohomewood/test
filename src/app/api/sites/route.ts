import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const sites = await prisma.site.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        scans: {
          orderBy: { startedAt: 'desc' },
          take: 1,
          include: {
            pages: {
              include: {
                issues: {
                  select: { category: true, severity: true },
                },
              },
            },
          },
        },
      },
    })

    return NextResponse.json(sites)
  } catch (err) {
    console.error('GET /api/sites error:', err)
    return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    let body: { url?: string; name?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const { url, name } = body

    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }

    // Validate URL
    let normalizedUrl: string
    try {
      const parsed = new URL(url)
      normalizedUrl = parsed.origin + parsed.pathname
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    const site = await prisma.site.create({
      data: {
        url: normalizedUrl,
        name: name ?? new URL(normalizedUrl).hostname,
      },
    })

    return NextResponse.json(site, { status: 201 })
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      err.message.includes('Unique constraint')
    ) {
      return NextResponse.json(
        { error: 'This URL has already been added.' },
        { status: 409 }
      )
    }
    console.error('POST /api/sites error:', err)
    return NextResponse.json({ error: 'Failed to create site' }, { status: 500 })
  }
}
