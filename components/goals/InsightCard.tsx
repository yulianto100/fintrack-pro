'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import type { FinanceInsight, InsightType } from '@/lib/goals-finance'

interface Props {
  insight: FinanceInsight
}

const PALETTE: Record<InsightType, { bg: string; border: string; accent: string }> = {
  danger:  { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.22)',  accent: '#ef4444' },
  warning: { bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.22)', accent: '#f97316' },
  success: { bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.22)',  accent: '#22c55e' },
  info:    { bg: 'rgba(99,179,237,0.08)', border: 'rgba(99,179,237,0.22)', accent: '#63b3ed' },
}

/**
 * InsightCard — dismissible, animated insight tile.
 * Used on the unified Goals page to surface smart financial insights.
 */
export function InsightCard({ insight }: Props) {
  const [dismissed, setDismissed] = useState(false)
  const p = PALETTE[insight.type]

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          layout
          initial={{ opacity: 0, y: 6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95, y: -4 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-start gap-3 p-3 rounded-2xl"
          style={{ background: p.bg, border: `1px solid ${p.border}` }}
        >
          {/* Icon */}
          <span className="text-xl flex-shrink-0 mt-0.5 select-none">{insight.icon}</span>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p
              className="text-xs font-semibold mb-0.5 leading-tight"
              style={{ color: p.accent }}
            >
              {insight.title}
            </p>
            <p
              className="text-xs leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              {insight.message}
            </p>
          </div>

          {/* Dismiss */}
          <button
            onClick={() => setDismissed(true)}
            aria-label="Tutup insight"
            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-opacity hover:opacity-70 active:scale-90"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}
          >
            <X size={11} strokeWidth={2.5} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
