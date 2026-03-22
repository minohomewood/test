import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _request: Request,
  { params }: { params: { siteId: string } }
) {
  try {
    const site = await prisma.site.findUnique({
      where: { id: params.siteId },
      include: {
        scans: {
          orderBy: { startedAt: 'desc' },
          include: {
            pages: {
              include: {
                issues: true,
              },
            },
          },
        },
      },
    })

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    return NextResponse.json(site)
  } catch (err) {
    console.error('GET /api/sites/[siteId] error:', err)
    return NextResponse.json({ error: 'Failed to fetch site' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { siteId: string } }
) {
  try {
    await prisma.site.delete({ where: { id: params.siteId } })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('DELETE /api/sites/[siteId] error:', err)
    return NextResponse.json({ error: 'Failed to delete site' }, { status: 500 })
  }
}
