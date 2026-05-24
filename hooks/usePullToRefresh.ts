'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface Options {
  threshold?: number
  resistance?: number
  onRefresh: () => Promise<void>
}

export function usePullToRefresh({ threshold = 80, resistance = 2.2, onRefresh }: Options) {
  const startY = useRef<number | null>(null)
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const containerRef = useRef<HTMLElement | null>(null)

  const isAtTop = useCallback(() => {
    if (!containerRef.current) return false
    return containerRef.current.scrollTop <= 0
  }, [])

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const onTouchStart = (event: TouchEvent) => {
      if (refreshing) return
      if (!isAtTop()) {
        startY.current = null
        return
      }
      startY.current = event.touches[0].clientY
    }

    const onTouchMove = (event: TouchEvent) => {
      if (refreshing || startY.current === null) return
      const delta = event.touches[0].clientY - startY.current
      if (delta <= 0) {
        setPullDistance(0)
        return
      }
      const damped = delta / resistance
      setPullDistance(Math.min(damped, threshold * 1.6))
    }

    const onTouchEnd = async () => {
      const distance = pullDistance
      startY.current = null
      if (distance >= threshold && !refreshing) {
        setRefreshing(true)
        const minDuration = new Promise((resolve) => setTimeout(resolve, 400))
        try {
          await Promise.all([onRefresh(), minDuration])
        } catch {
          // Refresh callbacks are best-effort; pages keep their current data on failure.
        }
        setRefreshing(false)
      }
      setPullDistance(0)
    }

    element.addEventListener('touchstart', onTouchStart, { passive: true })
    element.addEventListener('touchmove', onTouchMove, { passive: true })
    element.addEventListener('touchend', onTouchEnd)
    element.addEventListener('touchcancel', onTouchEnd)
    return () => {
      element.removeEventListener('touchstart', onTouchStart)
      element.removeEventListener('touchmove', onTouchMove)
      element.removeEventListener('touchend', onTouchEnd)
      element.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [refreshing, threshold, resistance, onRefresh, pullDistance, isAtTop])

  return { containerRef, pullDistance, refreshing, threshold }
}
