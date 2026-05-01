'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

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
  const mountedRef = useRef(true)
  // Keep a stable ref to the latest url so refetch() always uses current url
  const urlRef = useRef(url)
  urlRef.current = url

  const fetch_ = useCallback(async () => {
    const currentUrl = urlRef.current
    if (!currentUrl) return
    try {
      const result = await apiFetch<T>(currentUrl)
      if (mountedRef.current) { setData(result); setError(null) }
    } catch (err) {
      if (mountedRef.current) setError(String(err))
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, []) // stable — never recreated

  useEffect(() => {
    mountedRef.current = true

    if (!url) {
      setLoading(false)
      return () => { mountedRef.current = false }
    }

    setLoading(true)
    fetch_()

    if (refreshMs > 0) {
      timer.current = setInterval(fetch_, refreshMs)
    }

    return () => {
      mountedRef.current = false
      clearInterval(timer.current)
    }
  }, [url, refreshMs]) // fetch_ intentionally omitted — it's stable

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
