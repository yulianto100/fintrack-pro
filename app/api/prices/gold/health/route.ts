import { NextResponse } from 'next/server'
import {
  GOLD_VENDOR_SOURCES,
  scrapeGoldVendor,
  type VendorScraper,
} from '@/lib/gold-scrapers'
import type { GoldSource } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface HealthJob {
  name: GoldSource
  fn: VendorScraper
}

interface HealthOk {
  name: GoldSource
  ok: true
  buyPrice: number
  sellPrice: number
  isLive: boolean
  sourceUrl: string
  durationMs: number
}

interface HealthFail {
  name: GoldSource
  ok: false
  error: string
  durationMs: number
}

type HealthResult = HealthOk | HealthFail

const JOBS: HealthJob[] = GOLD_VENDOR_SOURCES.map((source) => ({
  name: source,
  fn: () => scrapeGoldVendor(source),
}))

function isLiveResult(result: HealthResult): boolean {
  return result.ok && result.isLive
}

export async function GET() {
  const results: HealthResult[] = await Promise.all(
    JOBS.map(async (job) => {
      const start = Date.now()

      try {
        const result = await job.fn()
        return {
          name: job.name,
          ok: true,
          buyPrice: result.buyPrice,
          sellPrice: result.sellPrice,
          isLive: result.isLive,
          sourceUrl: result.sourceUrl,
          durationMs: Date.now() - start,
        }
      } catch (error) {
        return {
          name: job.name,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
          durationMs: Date.now() - start,
        }
      }
    }),
  )

  const allLive = results.every(isLiveResult)

  return NextResponse.json({
    success: allLive,
    results,
    ts: new Date().toISOString(),
  }, { status: allLive ? 200 : 207 })
}
