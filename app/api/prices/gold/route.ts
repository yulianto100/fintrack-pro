import { NextResponse } from 'next/server'
import { getServerCache, setServerCache } from '@/lib/cache'
import {
  GOLD_VENDOR_SOURCES,
  scrapeGoldVendor,
  type VendorPriceResult,
} from '@/lib/gold-scrapers'
import type { GoldPrice, GoldPriceMap, GoldSource } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VENDOR_TTL_S = 30 * 60
const TREASURY_TTL_S = 2 * 60
const RESPONSE_TTL_S = 60
const LAST_KNOWN_TTL_S = 24 * 60 * 60

const RESPONSE_CACHE_KEY = 'gold_prices_v6'
const LAST_KNOWN_KEY = 'gold_prices_v6_last'
const VENDOR_CACHE_KEY = (vendor: GoldSource) => `gold_vendor_${vendor}_v6`

interface ScrapeJob {
  source: GoldSource
  ttl: number
  fn: () => Promise<VendorPriceResult>
}

interface VendorFetchResult {
  price: VendorPriceResult
  cached: boolean
  failed: boolean
  staleSince?: string
}

interface GoldPricesMeta {
  durationMs: number
  failures: GoldSource[]
  failureCount: number
  cachedVendors: GoldSource[]
  livenessByVendor: Record<GoldSource, boolean>
  staleSinceByVendor: Partial<Record<GoldSource, string>>
  isLive: boolean
}

interface CachedGoldResponse {
  data: GoldPriceMap
  meta: GoldPricesMeta
}

const JOBS: ScrapeJob[] = GOLD_VENDOR_SOURCES.map((source) => ({
  source,
  ttl: source === 'treasury' ? TREASURY_TTL_S : VENDOR_TTL_S,
  fn: () => scrapeGoldVendor(source),
}))

function toGoldPrice(price: VendorPriceResult): GoldPrice {
  return {
    source: price.source,
    buyPrice: price.buyPrice,
    sellPrice: price.sellPrice,
    spread: price.spread,
    updatedAt: price.updatedAt,
    currency: 'IDR',
    isLive: price.isLive,
    sourceUrl: price.sourceUrl,
    vendorUpdatedAt: price.vendorUpdatedAt,
  }
}

function buildLivenessMap(results: VendorFetchResult[]): Record<GoldSource, boolean> {
  const map: Partial<Record<GoldSource, boolean>> = {}
  for (const job of JOBS) {
    const result = results.find((item) => item.price.source === job.source)
    map[job.source] = result?.price.isLive ?? false
  }
  return map as Record<GoldSource, boolean>
}

function buildStaleMap(results: VendorFetchResult[]): Partial<Record<GoldSource, string>> {
  const map: Partial<Record<GoldSource, string>> = {}
  for (const result of results) {
    if (result.staleSince) map[result.price.source] = result.staleSince
  }
  return map
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function disasterFallback(source: GoldSource): VendorPriceResult {
  const fallbackBaseBySource: Record<GoldSource, number> = {
    antam: 2_800_000,
    ubs: 2_850_000,
    pegadaian: 2_770_000,
    galeri24: 2_790_000,
    treasury: 2_600_000,
  }
  const buyPrice = fallbackBaseBySource[source]
  const sellPrice = Math.round(buyPrice * 0.95)

  return {
    source,
    buyPrice,
    sellPrice,
    spread: buyPrice - sellPrice,
    updatedAt: new Date().toISOString(),
    isLive: false,
    sourceUrl: 'fallback',
  }
}

async function getVendorPrice(job: ScrapeJob): Promise<VendorFetchResult> {
  const cached = getServerCache<VendorPriceResult>(VENDOR_CACHE_KEY(job.source))
  if (cached) {
    return {
      price: cached,
      cached: true,
      failed: !cached.isLive,
      staleSince: cached.isLive ? undefined : cached.updatedAt,
    }
  }

  try {
    const fresh = await job.fn()
    setServerCache(VENDOR_CACHE_KEY(job.source), fresh, job.ttl)
    return {
      price: fresh,
      cached: false,
      failed: !fresh.isLive,
      staleSince: fresh.isLive ? undefined : fresh.updatedAt,
    }
  } catch (error) {
    console.warn(`[gold/${job.source}] scrape failed:`, error instanceof Error ? error.message : error)
  }

  try {
    await wait(600)
    const fresh = await job.fn()
    setServerCache(VENDOR_CACHE_KEY(job.source), fresh, job.ttl)
    return {
      price: fresh,
      cached: false,
      failed: !fresh.isLive,
      staleSince: fresh.isLive ? undefined : fresh.updatedAt,
    }
  } catch (error) {
    console.warn(`[gold/${job.source}] retry failed:`, error instanceof Error ? error.message : error)
  }

  const last = getServerCache<GoldPriceMap>(LAST_KNOWN_KEY)
  const lastPrice = last?.[job.source]
  if (lastPrice) {
    return {
      price: {
        source: job.source,
        buyPrice: lastPrice.buyPrice,
        sellPrice: lastPrice.sellPrice,
        spread: lastPrice.spread,
        updatedAt: lastPrice.updatedAt,
        isLive: false,
        sourceUrl: 'last-known',
        vendorUpdatedAt: lastPrice.vendorUpdatedAt,
      },
      cached: false,
      failed: true,
      staleSince: lastPrice.updatedAt,
    }
  }

  const fallback = disasterFallback(job.source)
  return {
    price: fallback,
    cached: false,
    failed: true,
    staleSince: fallback.updatedAt,
  }
}

export async function GET() {
  const cached = getServerCache<CachedGoldResponse>(RESPONSE_CACHE_KEY)
  if (cached) {
    return NextResponse.json({
      success: true,
      data: cached.data,
      meta: cached.meta,
      cached: true,
    })
  }

  const startedAt = Date.now()
  const results = await Promise.all(JOBS.map((job) => getVendorPrice(job)))

  const data: GoldPriceMap = {}
  const failures: GoldSource[] = []
  const cachedVendors: GoldSource[] = []

  for (const result of results) {
    if (result.failed) failures.push(result.price.source)
    if (result.cached) cachedVendors.push(result.price.source)
    data[result.price.source] = {
      ...toGoldPrice(result.price),
      staleSince: result.staleSince,
    }
  }

  const hasReusableSnapshot = results.some((result) => result.price.sourceUrl !== 'fallback')
  if (hasReusableSnapshot) setServerCache(LAST_KNOWN_KEY, data, LAST_KNOWN_TTL_S)

  const meta: GoldPricesMeta = {
    durationMs: Date.now() - startedAt,
    failures,
    failureCount: failures.length,
    cachedVendors,
    livenessByVendor: buildLivenessMap(results),
    staleSinceByVendor: buildStaleMap(results),
    isLive: results.some((result) => result.price.isLive),
  }

  setServerCache(RESPONSE_CACHE_KEY, { data, meta }, RESPONSE_TTL_S)

  return NextResponse.json({ success: true, data, meta, cached: false })
}
