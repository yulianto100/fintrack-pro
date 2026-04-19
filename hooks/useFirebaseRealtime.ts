'use client'

import { useEffect, useState } from 'react'
import { ref, onValue, off, DataSnapshot } from 'firebase/database'
import { onAuthStateChanged } from 'firebase/auth'
import { database, auth } from '@/lib/firebase'

// Waits for Firebase Auth (signed in via custom token from providers.tsx)
// before attaching any Realtime Database listener.
// Without this, Firebase security rules block all reads.
export function useFirebaseRealtime<T>(
  path: string | null,
  asList = false
): { data: T | null; loading: boolean; error: string | null } {
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null)
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Step 1: watch Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUid(user ? user.uid : null)
      if (!user) {
        setData(asList ? ([] as unknown as T) : null)
        setLoading(false)
      }
    })
    return () => unsub()
  }, [asList])

  // Step 2: once Firebase is authed, subscribe to DB path
  useEffect(() => {
    if (!firebaseUid || !path) return

    setLoading(true)
    const dbRef = ref(database, `users/${firebaseUid}/${path}`)

    const handleValue = (snapshot: DataSnapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val()
        if (asList && typeof val === 'object' && val !== null) {
          setData(Object.values(val) as unknown as T)
        } else {
          setData(val as T)
        }
      } else {
        setData(asList ? ([] as unknown as T) : null)
      }
      setLoading(false)
    }

    const handleError = (err: Error) => {
      console.error(`[Firebase] read error [${path}]:`, err.message)
      setError(err.message)
      setLoading(false)
    }

    onValue(dbRef, handleValue, handleError)
    return () => off(dbRef, 'value', handleValue)
  }, [firebaseUid, path, asList])

  return { data, loading, error }
}

export function useFirebaseList<T>(path: string | null) {
  return useFirebaseRealtime<T[]>(path, true)
}
