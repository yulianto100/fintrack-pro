'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// Generic API polling hook — replaces useFirebaseList for all data reads.
// Much more reliable than Firebase client SDK reads which require Firebase Auth.
async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
  const json = await res.json()
  return json.data as T
}

export function useApiData<T>(
  url: string | null,
  opts: { refreshMs?: number; defaultValue?: T } = {}
) {
  const { refreshMs = 0, defaultValue = null } = opts
  const [data, setData] = useState<T | null>(defaultValue as T | null)
  const [loading, setLoading] = useState(!!url)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<NodeJS.Timeout>()
  const mounted = useRef(true)

  const fetch_ = useCallback(async () => {
    if (!url) return
    try {
      const result = await apiFetch<T>(url)
      if (mounted.current) { setData(result); setError(null) }
    } catch (err) {
      if (mounted.current) setError(String(err))
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [url])

  useEffect(() => {
    mounted.current = true
    if (!url) { setLoading(false); return }
    setLoading(true)
    fetch_()
    if (refreshMs > 0) {
      timer.current = setInterval(fetch_, refreshMs)
    }
    return () => {
      mounted.current = false
      clearInterval(timer.current)
    }
  }, [url, fetch_, refreshMs])

  // Expose refetch so callers can force a refresh after mutations
  const refetch = useCallback(() => { fetch_() }, [fetch_])

  return { data, loading, error, refetch }
}

// List variant — always returns an array, never null
export function useApiList<T>(
  url: string | null,
  opts: { refreshMs?: number } = {}
) {
  const result = useApiData<T[]>(url, { ...opts, defaultValue: [] })
  return { ...result, data: result.data ?? [] }
}
