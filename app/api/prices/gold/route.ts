import { NextResponse } from 'next/server'
import { getServerCache, setServerCache } from '@/lib/cache'
import type { GoldPrice } from '@/types'

const CACHE_KEY = 'gold_prices'
const CACHE_TTL = 30 // seconds

// Fetch XAU/USD spot price from gold-api.com (free, no key needed)
async function fetchXauUsd(): Promise<number | null> {
  try {
    const res = await fetch('https://api.gold-api.com/price/XAU', {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 30 },
    })
    if (!res.ok) throw new Error('gold-api.com failed')
    const data = await res.json()
    // Returns { price: number } in USD per troy oz
    return typeof data.price === 'number' ? data.price : null
  } catch { /* try next source */ }

  // Fallback: frankfurter.app for XAU (gold in EUR/USD)
  try {
    const res = await fetch(
      'https://api.frankfurter.app/latest?from=XAU&to=USD',
      { next: { revalidate: 30 } }
    )
    if (!res.ok) throw new Error()
    const data = await res.json()
    return data?.rates?.USD ?? null
  } catch { /* final fallback */ }

  return null
}

// Fetch USD/IDR exchange rate
async function fetchUsdIdr(): Promise<number | null> {
  try {
    const res = await fetch(
      'https://api.frankfurter.app/latest?from=USD&to=IDR',
      { next: { revalidate: 300 } } // cache 5 min — exchange rate changes slower
    )
    if (!res.ok) throw new Error()
    const data = await res.json()
    return data?.rates?.IDR ?? null
  } catch {}

  // Hardcoded fallback if API is down
  return 16250
}

function buildPrices(pricePerGramIdr: number): Record<string, GoldPrice> {
  const now = new Date().toISOString()

  // Antam: official LM price — spot + ~5% markup for sell, spot -2% for buyback
  const antamBuy  = Math.round(pricePerGramIdr * 1.050 / 1000) * 1000
  const antamSell = Math.round(pricePerGramIdr * 0.975 / 1000) * 1000

  // Pegadaian: slightly higher than Antam
  const pegBuy  = Math.round(pricePerGramIdr * 1.065 / 1000) * 1000
  const pegSell = Math.round(pricePerGramIdr * 0.960 / 1000) * 1000

  // Treasury (Pegadaian digital): tightest spread
  const treaBuy  = Math.round(pricePerGramIdr * 1.045 / 1000) * 1000
  const treaSell = Math.round(pricePerGramIdr * 0.980 / 1000) * 1000

  return {
    antam:     { source: 'antam',     buyPrice: antamBuy,  sellPrice: antamSell, updatedAt: now, currency: 'IDR' },
    pegadaian: { source: 'pegadaian', buyPrice: pegBuy,    sellPrice: pegSell,   updatedAt: now, currency: 'IDR' },
    treasury:  { source: 'treasury',  buyPrice: treaBuy,   sellPrice: treaSell,  updatedAt: now, currency: 'IDR' },
  }
}

export async function GET() {
  // Serve from cache if fresh
  const cached = getServerCache<Record<string, GoldPrice>>(CACHE_KEY)
  if (cached) {
    return NextResponse.json({ success: true, data: cached, cached: true })
  }

  try {
    // Fetch both in parallel
    const [xauUsd, usdIdr] = await Promise.all([fetchXauUsd(), fetchUsdIdr()])

    let pricePerGramIdr: number

    if (xauUsd && usdIdr) {
      // XAU/USD is per troy oz → convert to per gram (1 troy oz = 31.1035 g)
      const usdPerGram = xauUsd / 31.1035
      pricePerGramIdr = usdPerGram * usdIdr
    } else {
      // Both APIs failed — use latest known price as fallback
      pricePerGramIdr = 1_580_000
      console.warn('[Gold API] Using fallback price')
    }

    const prices = buildPrices(pricePerGramIdr)
    setServerCache(CACHE_KEY, prices, CACHE_TTL)

    return NextResponse.json({
      success: true,
      data: prices,
      cached: false,
      meta: {
        xauUsd,
        usdIdr,
        pricePerGramIdr: Math.round(pricePerGramIdr),
      },
    })
  } catch (err) {
    console.error('[Gold API] Fatal error:', err)
    // Always return something usable
    const fallback = buildPrices(1_580_000)
    return NextResponse.json({ success: true, data: fallback, cached: false, fallback: true })
  }
}
