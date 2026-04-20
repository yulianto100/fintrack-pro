'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { useStore } from '@/store/useStore'
import type { GoldPriceMap, StockPrice } from '@/types'

const GOLD_POLL_MS  = 10_000  // 10s per spec
const STOCK_POLL_MS = 15_000

// ─── Gold prices (global Zustand store) ──────────────────────────────────────
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
  const [loading, setLoading] = useState(symbols.length > 0)
  const timer      = useRef<NodeJS.Timeout>()
  const symbolsKey = [...symbols].sort().join(',')

  const fetch_ = useCallback(async () => {
    if (symbols.length === 0) { setLoading(false); return }
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
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey, setStockPrices])

  useEffect(() => {
    setLoading(symbols.length > 0)
    fetch_()
    timer.current = setInterval(fetch_, STOCK_POLL_MS)
    return () => clearInterval(timer.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetch_])

  return { prices: stockPrices, loading, refetch: fetch_ }
}

// ─── Single stock (for detail view) ──────────────────────────────────────────
export function useSingleStockPrice(symbol: string | null) {
  const [price,   setPrice  ] = useState<StockPrice | null>(null)
  const [loading, setLoading] = useState(!!symbol)

  useEffect(() => {
    if (!symbol) return
    const fetch_ = async () => {
      try {
        const res  = await fetch(`/api/prices/stock/${symbol}`)
        const json = await res.json()
        if (json.success) setPrice(json.data)
      } finally { setLoading(false) }
    }
    fetch_()
    const t = setInterval(fetch_, STOCK_POLL_MS)
    return () => clearInterval(t)
  }, [symbol])

  return { price, loading }
}
