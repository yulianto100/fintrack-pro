'use client'

import { motion } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import type { BudgetStatus } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { calculateBudgetUsage } from '@/lib/goals-finance'

interface Props {
  budget: BudgetStatus
  onDelete: (id: string, name: string) => void
  /** Staggered animation delay index */
  index?: number
}

/**
 * BudgetCard — displays one budget category with color-coded usage bar.
 * Green < 70%, Orange 70–99%, Red ≥ 100%.
 */
export function BudgetCard({ budget, onDelete, index = 0 }: Props) {
  const usage = calculateBudgetUsage(budget)

  // Derive border color from status
  const borderColor =
    usage.status === 'over'    ? 'rgba(239,68,68,0.25)' :
    usage.status === 'warning' ? 'rgba(249,115,22,0.20)' :
    'var(--border)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card p-4"
      style={{ borderColor }}
    >
      {/* ── Header row ── */}
      <div className="flex items-center justify-between mb-3">
        {/* Left: icon + name */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ background: usage.bgColor }}
          >
            {budget.categoryIcon || '📋'}
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>
              {budget.categoryName || 'Kategori'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {usage.remainingLabel}
            </p>
          </div>
        </div>

        {/* Right: % + delete */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-sm font-bold font-mono leading-tight" style={{ color: usage.color }}>
              {usage.percentage.toFixed(0)}%
            </p>
            <p className="text-[10px] leading-tight" style={{ color: 'var(--text-muted)' }}>
              {formatCurrency(budget.spent)} / {formatCurrency(budget.limitAmount)}
            </p>
          </div>
          <button
            onClick={() => onDelete(budget.id, budget.categoryName || '')}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-transform active:scale-90"
            style={{ background: 'var(--red-dim)', color: 'var(--red)' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(usage.percentage, 100)}%` }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: index * 0.04 }}
          className="h-full rounded-full"
          style={{ background: usage.color }}
        />
      </div>

      {/* Over-budget annotation */}
      {usage.status === 'over' && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[10px] mt-1.5 font-medium"
          style={{ color: 'var(--red)' }}
        >
          ⚠ Melebihi limit sebesar {formatCurrency(-budget.remaining)}
        </motion.p>
      )}

      {/* Warning annotation */}
      {usage.status === 'warning' && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[10px] mt-1.5 font-medium"
          style={{ color: '#f97316' }}
        >
          🔥 Hampir mencapai batas budget
        </motion.p>
      )}
    </motion.div>
  )
}
