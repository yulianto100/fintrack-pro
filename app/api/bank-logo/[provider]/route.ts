import { NextResponse } from 'next/server'
import { getBankLogo } from '@/lib/bank-logos'

export const runtime = 'nodejs'

export async function GET(_req: Request, { params }: { params: { provider: string } }) {
  const entry = getBankLogo(params.provider)
  if (!entry) return new NextResponse('Not found', { status: 404 })

  for (const url of [entry.logoUrl, entry.fallbackUrl]) {
    if (!url) continue

    try {
      const res = await fetch(url, {
        next: { revalidate: 60 * 60 * 24 * 7 },
        headers: { 'User-Agent': 'Finuvo/4.0 bank-logo-proxy' },
      })

      if (res.ok) {
        const buf = await res.arrayBuffer()
        return new NextResponse(buf, {
          headers: {
            'Content-Type': res.headers.get('content-type') || 'image/png',
            'Cache-Control': 'public, max-age=604800, immutable',
          },
        })
      }
    } catch {
      // Try the next source.
    }
  }

  return new NextResponse('Logo unavailable', { status: 502 })
}
