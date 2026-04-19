'use client'

import { SessionProvider } from 'next-auth/react'
import { useEffect } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('SW registered:', reg.scope))
        .catch((err) => console.error('SW registration failed:', err))
    }
  }, [])

  return <SessionProvider>{children}</SessionProvider>
}
