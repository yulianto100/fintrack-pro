import { NextResponse } from 'next/server'
import { getServerCache, setServerCache } from '@/lib/cache'
import type { StockPrice } from '@/types'

const CACHE_TTL = 15 // 15 seconds for stocks

async function fetchStockPrice(symbol: string): Promise<StockPrice | null> {
  // Method 1: Yahoo Finance (via unofficial API)
  try {
    const yahooSymbol = symbol.endsWith('.JK') ? symbol : `${symbol}.JK`
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`
    
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
      },
      next: { revalidate: 15 },
    })
    
    if (!res.ok) throw new Error('Yahoo Finance fetch failed')
    
    const data = await res.json()
    const result = data?.chart?.result?.[0]
    
    if (!result) throw new Error('No data from Yahoo Finance')
    
    const meta = result.meta
    const currentPrice = meta.regularMarketPrice
    const previousClose = meta.previousClose || meta.chartPreviousClose
    const change = currentPrice - previousClose
    const changePercent = (change / previousClose) * 100
    
    return {
      symbol: symbol.toUpperCase(),
      name: meta.longName || meta.shortName || symbol,
      currentPrice,
      change,
      changePercent,
      volume: meta.regularMarketVolume,
      updatedAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error(`Yahoo Finance error for ${symbol}:`, error)
  }
  
  // Method 2: Alpha Vantage (if API key provided)
  if (process.env.ALPHA_VANTAGE_API_KEY) {
    try {
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}.JK&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`
      const res = await fetch(url)
      const data = await res.json()
      const quote = data['Global Quote']
      
      if (quote && quote['05. price']) {
        const currentPrice = parseFloat(quote['05. price'])
        const change = parseFloat(quote['09. change'])
        const changePercent = parseFloat(quote['10. change percent'].replace('%', ''))
        
        return {
          symbol: symbol.toUpperCase(),
          name: symbol,
          currentPrice,
          change,
          changePercent,
          updatedAt: new Date().toISOString(),
        }
      }
    } catch (error) {
      console.error(`Alpha Vantage error for ${symbol}:`, error)
    }
  }
  
  return null
}

export async function GET(
  request: Request,
  { params }: { params: { symbol: string } }
) {
  const symbol = params.symbol.toUpperCase()
  const cacheKey = `stock_${symbol}`
  
  // Check cache
  const cached = getServerCache<StockPrice>(cacheKey)
  if (cached) {
    return NextResponse.json({ success: true, data: cached, cached: true })
  }
  
  try {
    const price = await fetchStockPrice(symbol)
    
    if (!price) {
      return NextResponse.json(
        { success: false, error: `Could not fetch price for ${symbol}` },
        { status: 404 }
      )
    }
    
    setServerCache(cacheKey, price, CACHE_TTL)
    
    return NextResponse.json({ success: true, data: price, cached: false })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stock price' },
      { status: 500 }
    )
  }
}

// Batch fetch multiple stocks
export async function POST(request: Request) {
  try {
    const { symbols } = await request.json()
    
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ success: false, error: 'symbols array required' }, { status: 400 })
    }
    
    const results = await Promise.allSettled(
      symbols.map(async (symbol: string) => {
        const cacheKey = `stock_${symbol.toUpperCase()}`
        const cached = getServerCache<StockPrice>(cacheKey)
        if (cached) return { symbol, data: cached, cached: true }
        
        const data = await fetchStockPrice(symbol)
        if (data) setServerCache(cacheKey, data, CACHE_TTL)
        return { symbol, data, cached: false }
      })
    )
    
    const prices: Record<string, StockPrice | null> = {}
    results.forEach((result, index) => {
      const symbol = symbols[index].toUpperCase()
      if (result.status === 'fulfilled') {
        prices[symbol] = result.value.data
      } else {
        prices[symbol] = null
      }
    })
    
    return NextResponse.json({ success: true, data: prices })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch stock prices' }, { status: 500 })
  }
}
