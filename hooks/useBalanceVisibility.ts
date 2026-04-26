'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'fintrack_balance_hidden'

/**
 * Persists balance visibility preference in localStorage.
 * Default: HIDDEN (true) — user must tap the eye to reveal.
 */
export function useBalanceVisibility() {
  // Start hidden by default; sync from localStorage after mount
  const [hidden, setHidden] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      // If user previously revealed (stored === 'false'), restore that
      if (stored === 'false') setHidden(false)
      else setHidden(true)   // default: hidden
    } catch { /* no localStorage in SSR */ }
    setMounted(true)
  }, [])

  const toggle = useCallback(() => {
    setHidden((prev) => {
      const next = !prev
      try { localStorage.setItem(STORAGE_KEY, String(next)) } catch { /* ignore */ }
      return next
    })
  }, [])

  return { hidden: mounted ? hidden : true, toggle, mounted }
}
