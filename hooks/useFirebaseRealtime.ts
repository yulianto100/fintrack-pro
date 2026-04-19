'use client'

import { useEffect, useState, useCallback } from 'react'
import { ref, onValue, off, DataSnapshot } from 'firebase/database'
import { database } from '@/lib/firebase'
import { useSession } from 'next-auth/react'

export function useFirebaseRealtime<T>(
  path: string | null,
  transform?: (val: Record<string, T>) => T[]
): { data: T | null; loading: boolean; error: string | null } {
  const { data: session } = useSession()
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session?.user?.id || !path) {
      setLoading(false)
      return
    }

    const fullPath = `users/${session.user.id}/${path}`
    const dbRef = ref(database, fullPath)

    const handleValue = (snapshot: DataSnapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val()
        if (transform && typeof val === 'object' && val !== null) {
          setData(transform(val) as unknown as T)
        } else {
          setData(val as T)
        }
      } else {
        setData(transform ? ([] as unknown as T) : null)
      }
      setLoading(false)
    }

    const handleError = (err: Error) => {
      setError(err.message)
      setLoading(false)
    }

    onValue(dbRef, handleValue, handleError)

    return () => off(dbRef, 'value', handleValue)
  }, [session?.user?.id, path, transform])

  return { data, loading, error }
}

// Hook for a list (object → array)
export function useFirebaseList<T>(path: string | null) {
  const transform = useCallback(
    (val: Record<string, T>) => Object.values(val),
    []
  )
  return useFirebaseRealtime<T[]>(path, transform as (val: Record<string, T>) => T[])
}
