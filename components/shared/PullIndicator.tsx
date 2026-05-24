'use client'

import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'

interface Props {
  distance: number
  threshold: number
  refreshing: boolean
}

export function PullIndicator({ distance, threshold, refreshing }: Props) {
  const ratio = Math.min(1, distance / threshold)
  const visible = distance > 8 || refreshing

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        height: 0,
        overflow: 'visible',
        zIndex: 20,
        pointerEvents: 'none',
      }}
    >
      <motion.div
        animate={{
          y: refreshing ? 32 : Math.min(distance * 0.6, 48),
          opacity: visible ? 1 : 0,
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full px-3 py-2"
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.20)',
        }}
      >
        <RefreshCw
          size={13}
          className={refreshing ? 'animate-spin' : ''}
          style={{
            color: refreshing || ratio >= 1 ? 'var(--accent)' : 'var(--text-muted)',
            transform: !refreshing ? `rotate(${ratio * 270}deg)` : undefined,
            transition: 'color 0.2s',
          }}
        />
        <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
          {refreshing ? 'Memuat...' : ratio >= 1 ? 'Lepas untuk refresh' : 'Tarik untuk refresh'}
        </span>
      </motion.div>
    </div>
  )
}
