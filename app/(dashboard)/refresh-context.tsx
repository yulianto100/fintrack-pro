'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'

type Handler = () => Promise<void>

interface RefreshContextValue {
  setHandler: (handler: Handler | null) => void
  trigger: () => Promise<void>
}

const RefreshContext = createContext<RefreshContextValue | null>(null)

export function RefreshProvider({ children }: { children: ReactNode }) {
  const [handler, setHandlerState] = useState<Handler | null>(null)

  const setHandler = useCallback((nextHandler: Handler | null) => {
    setHandlerState(() => nextHandler)
  }, [])

  const trigger = useCallback(async () => {
    if (handler) await handler()
  }, [handler])

  return (
    <RefreshContext.Provider value={{ setHandler, trigger }}>
      {children}
    </RefreshContext.Provider>
  )
}

export function useRefreshContext() {
  const context = useContext(RefreshContext)
  if (!context) throw new Error('useRefreshContext must be inside RefreshProvider')
  return context
}
