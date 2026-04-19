import { NextResponse } from 'next/server'
import { getServerCache, setServerCache } from '@/lib/cache'
import type { StockPrice } from '@/types'

async function fetchStockPrice(symbol: string): Promise<StockPrice | null> {
  try {
    const yahooSymbol = `${symbol}.JK`
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 15 },
    })
    if (!res.ok) return null
    const data = await res.json()
    const meta = data?.chart?.result?.[0]?.meta
    if (!meta) return null
    const currentPrice = meta.regularMarketPrice
    const previousClose = meta.previousClose || meta.chartPreviousClose
    const change = currentPrice - previousClose
    return {
      symbol,
      name: meta.longName || meta.shortName || symbol,
      currentPrice,
      change,
      changePercent: (change / previousClose) * 100,
      volume: meta.regularMarketVolume,
      updatedAt: new Date().toISOString(),
    }
  } catch { return null }
}

export async function POST(request: Request) {
  try {
    const { symbols } = await request.json()
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ success: false, error: 'symbols array required' }, { status: 400 })
    }

    const prices: Record<string, StockPrice | null> = {}
    await Promise.all(
      symbols.map(async (symbol: string) => {
        const key = `stock_${symbol.toUpperCase()}`
        const cached = getServerCache<StockPrice>(key)
        if (cached) { prices[symbol.toUpperCase()] = cached; return }
        const data = await fetchStockPrice(symbol)
        if (data) setServerCache(key, data, 15)
        prices[symbol.toUpperCase()] = data
      })
    )

    return NextResponse.json({ success: true, data: prices })
  } catch {
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}
