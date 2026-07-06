'use client'

import { SessionProvider } from 'next-auth/react'
import { useEffect } from 'react'
import { applyAccent, getStoredAccent } from '@/lib/accent'

// ─── TIDAK menggunakan Firebase Auth client SDK ───
// Semua data dibaca via API routes (Next.js) yang pakai Firebase Admin SDK
// Firebase client SDK hanya dibutuhkan untuk Realtime Database listener (opsional)
// Untuk simplisitas, kita pakai polling via fetch biasa

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyAccent(getStoredAccent())

    const recoverFromStaleChunk = () => {
      if (sessionStorage.getItem('finuvo-chunk-reloaded') === '1') return
      sessionStorage.setItem('finuvo-chunk-reloaded', '1')
      const reload = () => globalThis.location.reload()
      const cacheStorage = globalThis.caches
      if (!cacheStorage) {
        reload()
        return
      }
      cacheStorage.keys().then((keys) => Promise.all(keys.map((key) => cacheStorage.delete(key)))).finally(reload)
    }

    const isStaleChunkError = (value: unknown) => {
      const message = value instanceof Error ? value.message : String(value)
      return /ChunkLoadError|Loading chunk|dynamically imported module|failed to fetch/i.test(message)
    }

    const onError = (event: ErrorEvent) => {
      if (isStaleChunkError(event.error || event.message)) recoverFromStaleChunk()
    }
    const onRejection = (event: PromiseRejectionEvent) => {
      if (isStaleChunkError(event.reason)) recoverFromStaleChunk()
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)

    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        registration.update().catch(() => {})
      }).catch(() => {})

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (sessionStorage.getItem('finuvo-sw-reloaded') === '1') return
        sessionStorage.setItem('finuvo-sw-reloaded', '1')
        window.location.reload()
      })
    }

    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return <SessionProvider>{children}</SessionProvider>
}
