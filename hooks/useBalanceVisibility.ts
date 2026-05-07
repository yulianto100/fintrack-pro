'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'finuvo_balance_hidden'
const VISIBILITY_EVENT = 'finuvo:balance-visibility'

function readStoredHidden() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'false'
  } catch {
    return true
  }
}

/**
 * Persists balance visibility preference in localStorage.
 * Default: HIDDEN (true) — user must tap the eye to reveal.
 */
export function useBalanceVisibility() {
  // Start hidden by default; sync from localStorage after mount
  const [hidden, setHidden] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const syncFromStorage = () => setHidden(readStoredHidden())
    const syncFromEvent = (event: Event) => {
      const next = (event as CustomEvent<{ hidden?: boolean }>).detail?.hidden
      if (typeof next === 'boolean') setHidden(next)
      else syncFromStorage()
    }
    const syncFromOtherTab = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) syncFromStorage()
    }

    syncFromStorage()
    setMounted(true)
    window.addEventListener(VISIBILITY_EVENT, syncFromEvent)
    window.addEventListener('storage', syncFromOtherTab)

    return () => {
      window.removeEventListener(VISIBILITY_EVENT, syncFromEvent)
      window.removeEventListener('storage', syncFromOtherTab)
    }
  }, [])

  const toggle = useCallback(() => {
    const next = !hidden
    setHidden(next)
    try { localStorage.setItem(STORAGE_KEY, String(next)) } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent(VISIBILITY_EVENT, { detail: { hidden: next } }))
  }, [hidden])

  return { hidden: mounted ? hidden : true, toggle, mounted }
}
