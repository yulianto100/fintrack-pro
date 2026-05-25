import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface GoldPricesApiResponse {
  cached?: boolean
  meta?: unknown
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const requestUrl = new URL(request.url)
  const baseUrl = process.env.NEXTAUTH_URL || requestUrl.origin || 'http://localhost:3000'

  try {
    const res = await fetch(`${baseUrl}/api/prices/gold`, { cache: 'no-store' })
    const json = await res.json() as GoldPricesApiResponse

    return NextResponse.json({
      success: res.ok,
      cached: json.cached,
      meta: json.meta,
      ts: new Date().toISOString(),
    }, { status: res.ok ? 200 : 502 })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}
