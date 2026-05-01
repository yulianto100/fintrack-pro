'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Smoothly animates a number from its previous value to `target`.
 *
 * - Uses requestAnimationFrame (no heavy lib dependency)
 * - Ease-out cubic curve for a natural deceleration feel
 * - When `enabled` is false (e.g. balance is hidden), returns the
 *   raw target immediately so callers can still mask the value.
 * - Re-animates whenever `target` changes (e.g. data refresh).
 */
export function useCountUp(
  target: number,
  duration = 800,
  enabled = true,
): number {
  const [display, setDisplay] = useState(0)

  const rafRef    = useRef<number | undefined>(undefined)
  const startRef  = useRef<number | undefined>(undefined)
  const fromRef   = useRef(0)

  useEffect(() => {
    // When hidden, skip animation and return raw value
    if (!enabled) {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current)
      setDisplay(target)
      fromRef.current = target
      return
    }

    const from = fromRef.current
    const diff = target - from

    // Skip animation for negligible changes
    if (Math.abs(diff) < 1) {
      setDisplay(target)
      fromRef.current = target
      return
    }

    // Reset start time for new animation
    startRef.current = undefined

    const tick = (timestamp: number) => {
      if (startRef.current === undefined) startRef.current = timestamp

      const elapsed  = timestamp - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic: fast start, smooth deceleration
      const eased    = 1 - Math.pow(1 - progress, 3)

      setDisplay(from + diff * eased)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        // Animation complete — persist exact target
        setDisplay(target)
        fromRef.current = target
        startRef.current = undefined
        rafRef.current = undefined
      }
    }

    // Cancel any in-progress animation before starting new one
    if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration, enabled])

  return display
}
