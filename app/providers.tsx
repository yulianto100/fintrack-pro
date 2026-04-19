'use client'

import { SessionProvider, useSession } from 'next-auth/react'
import { useEffect, useRef } from 'react'
import { signInWithCustomToken, onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'

// Bridges NextAuth session → Firebase Auth so Realtime Database rules work
function FirebaseAuthBridge() {
  const { data: session, status } = useSession()
  const signedInUid = useRef<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user?.id) {
      // NextAuth logged out → sign out of Firebase too
      auth.signOut().catch(() => {})
      signedInUid.current = null
      return
    }

    // Already signed in with correct uid — skip
    if (signedInUid.current === session.user.id) return

    // Fetch custom token from our API and sign into Firebase
    const signIn = async () => {
      try {
        const res = await fetch('/api/auth/firebase-token')
        if (!res.ok) throw new Error('Token fetch failed')
        const { token } = await res.json()
        await signInWithCustomToken(auth, token)
        signedInUid.current = session.user.id
      } catch (err) {
        console.error('Firebase sign-in error:', err)
      }
    }

    signIn()
  }, [session?.user?.id, status])

  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('SW registered:', reg.scope))
        .catch((err) => console.error('SW registration failed:', err))
    }
  }, [])

  return (
    <SessionProvider>
      <FirebaseAuthBridge />
      {children}
    </SessionProvider>
  )
}
