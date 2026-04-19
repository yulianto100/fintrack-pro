'use client'

import { useEffect, useState } from 'react'
import { ref, onValue, off, DataSnapshot } from 'firebase/database'
import { database } from '@/lib/firebase'
import { useSession } from 'next-auth/react'

export function useFirebaseRealtime<T>(
  path: string | null,
  asList = false
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
      setError(err.message)
      setLoading(false)
    }

    onValue(dbRef, handleValue, handleError)

    return () => off(dbRef, 'value', handleValue)
  }, [session?.user?.id, path, asList])

  return { data, loading, error }
}

// Convenience: subscribe to a Firebase path and return items as an array
export function useFirebaseList<T>(path: string | null) {
  return useFirebaseRealtime<T[]>(path, true)
}
