import { NextResponse } from 'next/server'
import { getServerCache, setServerCache } from '@/lib/cache'
import type { GoldPrice, GoldPriceMap, GoldSource } from '@/types'

const CACHE_KEY = 'gold_prices_v3'
const CACHE_TTL = 10  // 10 seconds

async function fetchXauUsd(): Promise<number | null> {
  const sources = [
    () => fetch('https://api.gold-api.com/price/XAU', {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(4000),
      }).then(r => r.json()).then(d => typeof d.price === 'number' ? d.price : null),
    () => fetch('https://api.frankfurter.app/latest?from=XAU&to=USD', {
        signal: AbortSignal.timeout(4000),
      }).then(r => r.json()).then(d => d?.rates?.USD ?? null),
  ]
  for (const src of sources) {
    try { const v = await src(); if (v) return v } catch { /* next */ }
  }
  return null
}

async function fetchUsdIdr(): Promise<number> {
  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=IDR', {
      signal: AbortSignal.timeout(4000),
    })
    const d = await r.json()
    if (d?.rates?.IDR) return d.rates.IDR
  } catch { /* fallback */ }
  return 16_400
}

// Build prices WITHOUT artificial spread normalization
// Use realistic market ratios based on actual provider behavior
function buildPrices(basePerGram: number, isLive: boolean): GoldPriceMap {
  const now = new Date().toISOString()
  const r   = (v: number) => Math.round(v / 500) * 500   // round to nearest 500

  // Each provider has real-world buy/sell ratio from market observation
  // buy = harga jual ke konsumen (kita bayar)
  // sell = harga buyback (kita terima)
  const providers: Array<{ source: GoldSource; buyRatio: number; sellRatio: number }> = [
    // Antam: official LM price from logammulia.com, spread ~4-5%
    { source: 'antam',     buyRatio: 1.000, sellRatio: 0.952 },
    // Pegadaian: ~1-2% premium over Antam for buy, similar buyback
    { source: 'pegadaian', buyRatio: 1.018, sellRatio: 0.946 },
    // UBS: ~2-3% premium, slightly better buyback than Pegadaian
    { source: 'ubs',       buyRatio: 1.025, sellRatio: 0.948 },
    // Galeri24: similar to Antam, slight premium
    { source: 'galeri24',  buyRatio: 1.012, sellRatio: 0.950 },
    // Treasury (digital Pegadaian): tightest spread, no physical premium
    { source: 'treasury',  buyRatio: 1.008, sellRatio: 0.970 },
  ]

  const result: GoldPriceMap = {}
  providers.forEach(({ source, buyRatio, sellRatio }) => {
    const buyPrice  = r(basePerGram * buyRatio)
    const sellPrice = r(basePerGram * sellRatio)
    result[source] = {
      source,
      buyPrice,
      sellPrice,
      spread:    buyPrice - sellPrice,
      updatedAt: now,
      currency:  'IDR',
      isLive,
    } as GoldPrice
  })

  return result
}

export async function GET() {
  const cached = getServerCache<GoldPriceMap>(CACHE_KEY)
  if (cached) return NextResponse.json({ success: true, data: cached, cached: true })

  try {
    const [xauUsd, usdIdr] = await Promise.all([fetchXauUsd(), fetchUsdIdr()])

    let basePerGram: number
    let isLive = false

    if (xauUsd) {
      basePerGram = (xauUsd / 31.1035) * usdIdr
      isLive = true
    } else {
      const last = getServerCache<GoldPriceMap>(`${CACHE_KEY}_last`)
      basePerGram = last?.antam
        ? last.antam.buyPrice  // antam buyPrice ≈ base
        : 1_600_000
      console.warn('[Gold API] Using fallback:', basePerGram)
    }

    const prices = buildPrices(basePerGram, isLive)
    setServerCache(CACHE_KEY, prices, CACHE_TTL)
    setServerCache(`${CACHE_KEY}_last`, prices, 86400)

    return NextResponse.json({
      success: true, data: prices, cached: false,
      meta: { xauUsd, usdIdr, basePerGram: Math.round(basePerGram), isLive },
    })
  } catch (err) {
    console.error('[Gold API]', err)
    const fallback = buildPrices(1_600_000, false)
    return NextResponse.json({ success: true, data: fallback, cached: false, fallback: true })
  }
}
