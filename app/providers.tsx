'use client'

import { SessionProvider } from 'next-auth/react'
import { useEffect } from 'react'

// ─── TIDAK menggunakan Firebase Auth client SDK ───
// Semua data dibaca via API routes (Next.js) yang pakai Firebase Admin SDK
// Firebase client SDK hanya dibutuhkan untuk Realtime Database listener (opsional)
// Untuk simplisitas, kita pakai polling via fetch biasa

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  return <SessionProvider>{children}</SessionProvider>
}
