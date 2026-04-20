'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useStore } from '@/store/useStore'
import type { GoldPriceMap, StockPrice } from '@/types'

const GOLD_POLL_MS  = 10_000  // 10s per spec
const STOCK_POLL_MS = 15_000

// ─── Gold prices (global state via Zustand) ───────────────────────────────────
export function useGoldPrices() {
  const { goldPrices, goldLastUpdated, goldIsLive, goldLoading, setGoldPrices } = useStore()
  const timer = useRef<NodeJS.Timeout>()

  const fetch_ = useCallback(async () => {
    try {
      const res  = await fetch('/api/prices/gold', { cache: 'no-store' })
      const json = await res.json()
      if (json.success) {
        setGoldPrices(json.data as GoldPriceMap, json.meta?.isLive ?? false)
      }
    } catch (err) {
      console.error('[useGoldPrices]', err)
    }
  }, [setGoldPrices])

  useEffect(() => {
    fetch_()
    timer.current = setInterval(fetch_, GOLD_POLL_MS)
    return () => clearInterval(timer.current)
  }, [fetch_])

  return {
    prices:      goldPrices,
    loading:     goldLoading,
    lastUpdated: goldLastUpdated,
    isLive:      goldIsLive,
    refetch:     fetch_,
  }
}

// ─── Stock prices ─────────────────────────────────────────────────────────────
export function useStockPrices(symbols: string[]) {
  const { stockPrices, setStockPrices } = useStore()
  const timer      = useRef<NodeJS.Timeout>()
  const symbolsKey = [...symbols].sort().join(',')

  const fetch_ = useCallback(async () => {
    if (symbols.length === 0) return
    try {
      const res  = await fetch('/api/prices/stock/batch', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ symbols }),
      })
      const json = await res.json()
      if (json.success) setStockPrices(json.data as Record<string, StockPrice | null>)
    } catch (err) {
      console.error('[useStockPrices]', err)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey, setStockPrices])

  useEffect(() => {
    fetch_()
    timer.current = setInterval(fetch_, STOCK_POLL_MS)
    return () => clearInterval(timer.current)
  }, [fetch_])

  return { prices: stockPrices, refetch: fetch_ }
}
