'use client'

import { useEffect, useState, useCallback } from 'react'
import { applyAccent, getStoredAccent } from '@/lib/accent'

const STORAGE_KEY = 'finuvo_theme'

export function useDarkMode() {
  const [isDark, setIsDark] = useState<boolean>(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const dark = stored ? stored === 'dark' : prefersDark
    setIsDark(dark)
    setMounted(true)
    if (dark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    applyAccent(getStoredAccent())

    // Listen for OS theme change
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => {
      if (localStorage.getItem(STORAGE_KEY)) return // user has explicit choice
      setIsDark(e.matches)
      document.documentElement.classList.toggle('dark', e.matches)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const toggle = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light')
      if (next) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      applyAccent(getStoredAccent())
      return next
    })
  }, [])

  const setDark = useCallback((dark: boolean) => {
    setIsDark(dark)
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light')
    if (dark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    applyAccent(getStoredAccent())
  }, [])

  return { isDark, toggle, setDark, mounted }
}
