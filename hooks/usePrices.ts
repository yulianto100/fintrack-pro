'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { GoldPrice, StockPrice } from '@/types'

const GOLD_POLL_MS = 30_000   // 30s
const STOCK_POLL_MS = 15_000  // 15s

export function useGoldPrices() {
  const [prices, setPrices] = useState<Record<string, GoldPrice> | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const timerRef = useRef<NodeJS.Timeout>()

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch('/api/prices/gold')
      const json = await res.json()
      if (json.success) {
        setPrices(json.data)
        setLastUpdated(new Date())
      }
    } catch (err) {
      console.error('Gold price fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch_()
    timerRef.current = setInterval(fetch_, GOLD_POLL_MS)
    return () => clearInterval(timerRef.current)
  }, [fetch_])

  return { prices, loading, lastUpdated, refetch: fetch_ }
}

export function useStockPrices(symbols: string[]) {
  const [prices, setPrices] = useState<Record<string, StockPrice | null>>({})
  const [loading, setLoading] = useState(true)
  const timerRef = useRef<NodeJS.Timeout>()
  const symbolsKey = symbols.sort().join(',')

  const fetch_ = useCallback(async () => {
    if (symbols.length === 0) { setLoading(false); return }
    try {
      const res = await fetch('/api/prices/stock/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols }),
      })
      const json = await res.json()
      if (json.success) setPrices(json.data)
    } catch (err) {
      console.error('Stock prices fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [symbolsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch_()
    timerRef.current = setInterval(fetch_, STOCK_POLL_MS)
    return () => clearInterval(timerRef.current)
  }, [fetch_])

  return { prices, loading, refetch: fetch_ }
}

export function useSingleStockPrice(symbol: string | null) {
  const [price, setPrice] = useState<StockPrice | null>(null)
  const [loading, setLoading] = useState(!!symbol)

  useEffect(() => {
    if (!symbol) return
    const fetch_ = async () => {
      try {
        const res = await fetch(`/api/prices/stock/${symbol}`)
        const json = await res.json()
        if (json.success) setPrice(json.data)
      } finally {
        setLoading(false)
      }
    }
    fetch_()
    const timer = setInterval(fetch_, STOCK_POLL_MS)
    return () => clearInterval(timer)
  }, [symbol])

  return { price, loading }
}
