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
  }, [])

  return <SessionProvider>{children}</SessionProvider>
}
