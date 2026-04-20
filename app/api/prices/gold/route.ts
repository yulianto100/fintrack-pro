import { NextResponse } from 'next/server'
import { getServerCache, setServerCache } from '@/lib/cache'
import type { GoldPrice, GoldPriceMap, GoldSource } from '@/types'

const CACHE_KEY  = 'gold_prices_v2'
const CACHE_TTL  = 10    // 10 seconds per spec
const MAX_SPREAD = 200_000  // IDR

// ─── Fetch XAU/USD spot ─────────────────────────────────────────────────────
async function fetchXauUsd(): Promise<number | null> {
  const sources = [
    async () => {
      const r = await fetch('https://api.gold-api.com/price/XAU', {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(4000),
      })
      const d = await r.json()
      return typeof d.price === 'number' ? d.price : null
    },
    async () => {
      const r = await fetch('https://api.frankfurter.app/latest?from=XAU&to=USD', {
        signal: AbortSignal.timeout(4000),
      })
      const d = await r.json()
      return d?.rates?.USD ?? null
    },
  ]
  for (const src of sources) {
    try { const v = await src(); if (v) return v } catch { /* next */ }
  }
  return null
}

// ─── Fetch USD/IDR ──────────────────────────────────────────────────────────
async function fetchUsdIdr(): Promise<number> {
  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=IDR', {
      signal: AbortSignal.timeout(4000),
    })
    const d = await r.json()
    if (d?.rates?.IDR) return d.rates.IDR
  } catch { /* fallback */ }
  return 16_350  // latest fallback
}

// ─── Normalize spread (max 200k IDR) ────────────────────────────────────────
function normalizeSpread(buy: number, sell: number): { buy: number; sell: number } {
  const spread = buy - sell
  if (spread > MAX_SPREAD) {
    const mid  = (buy + sell) / 2
    buy  = Math.round((mid + MAX_SPREAD / 2) / 1000) * 1000
    sell = Math.round((mid - MAX_SPREAD / 2) / 1000) * 1000
  }
  return { buy, sell }
}

// ─── Build all 6 provider prices from base XAU price ────────────────────────
function buildAllPrices(pricePerGramIdr: number, isLive: boolean): GoldPriceMap {
  const now = new Date().toISOString()
  const p   = pricePerGramIdr
  const r   = (v: number) => Math.round(v / 1000) * 1000

  const providers: Array<{ source: GoldSource; buyMul: number; sellMul: number }> = [
    { source: 'antam',     buyMul: 1.052, sellMul: 0.975 },  // official LM spread
    { source: 'pegadaian', buyMul: 1.065, sellMul: 0.960 },  // slightly higher
    { source: 'treasury',  buyMul: 1.045, sellMul: 0.982 },  // digital, tightest spread
    { source: 'ubs',       buyMul: 1.058, sellMul: 0.970 },  // mock
    { source: 'galeri24',  buyMul: 1.055, sellMul: 0.972 },  // mock
  ]

  const result: GoldPriceMap = {}
  providers.forEach(({ source, buyMul, sellMul }) => {
    const rawBuy  = r(p * buyMul)
    const rawSell = r(p * sellMul)
    const { buy, sell } = normalizeSpread(rawBuy, rawSell)
    result[source] = {
      source, buyPrice: buy, sellPrice: sell,
      spread: buy - sell, updatedAt: now,
      currency: 'IDR', isLive,
    }
  })
  return result
}

export async function GET() {
  // Serve from cache if fresh (10s)
  const cached = getServerCache<GoldPriceMap>(CACHE_KEY)
  if (cached) {
    return NextResponse.json({ success: true, data: cached, cached: true })
  }

  try {
    const [xauUsd, usdIdr] = await Promise.all([fetchXauUsd(), fetchUsdIdr()])

    let pricePerGramIdr: number
    let isLive = false

    if (xauUsd) {
      const usdPerGram = xauUsd / 31.1035  // troy oz → gram
      pricePerGramIdr  = usdPerGram * usdIdr
      isLive = true
    } else {
      // Use last cached or hardcoded fallback
      const last = getServerCache<GoldPriceMap>(`${CACHE_KEY}_last`)
      pricePerGramIdr = last?.antam
        ? last.antam.buyPrice / 1.052
        : 1_590_000
      console.warn('[Gold API] Using fallback price:', pricePerGramIdr)
    }

    const prices = buildAllPrices(pricePerGramIdr, isLive)

    setServerCache(CACHE_KEY, prices, CACHE_TTL)
    setServerCache(`${CACHE_KEY}_last`, prices, 86400) // keep last known for 24h

    return NextResponse.json({
      success: true, data: prices, cached: false,
      meta: { xauUsd, usdIdr, pricePerGramIdr: Math.round(pricePerGramIdr), isLive },
    })
  } catch (err) {
    console.error('[Gold API] Fatal:', err)
    const fallback = buildAllPrices(1_590_000, false)
    return NextResponse.json({ success: true, data: fallback, cached: false, fallback: true })
  }
}
