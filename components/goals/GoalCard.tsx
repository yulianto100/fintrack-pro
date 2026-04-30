'use client'

import { motion } from 'framer-motion'
import type { Goal } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Trash2 } from 'lucide-react'
import { calculateGoalProgress } from '@/lib/goals-finance'

interface Props {
  goal: Goal
  onDelete: (id: string) => void
  onTopUp: (goal: Goal) => void
  /** Pass monthly net-savings so the card can show an ETA. */
  monthlyContribution?: number
  /** Staggered animation delay index */
  index?: number
}

function motivationFor(pct: number, remaining: number): string {
  if (pct >= 100) return '🎉 Goal tercapai! Luar biasa!'
  if (pct >= 80)  return `🔥 Hampir sampai! Kurang ${formatCurrency(remaining)}`
  if (pct >= 50)  return '💪 Sudah separuh jalan!'
  if (pct >= 25)  return '📈 Terus semangat!'
  return '🚀 Perjalanan baru dimulai'
}

/**
 * GoalCard — displays a single financial goal with progress bar,
 * percentage, motivational message, ETA, and action buttons.
 */
export function GoalCard({ goal, onDelete, onTopUp, monthlyContribution, index = 0 }: Props) {
  const progress   = calculateGoalProgress(goal, monthlyContribution)
  const motivation = motivationFor(progress.percentage, progress.remaining)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      whileTap={{ scale: 0.99 }}
      className="glass-card p-4"
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Icon badge */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: `${goal.color}18`, border: `1px solid ${goal.color}25` }}
          >
            {goal.icon}
          </div>

          {/* Title + amounts */}
          <div>
            <p className="font-semibold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>
              {goal.title}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {formatCurrency(goal.currentAmount)}{' '}
              <span style={{ color: 'var(--text-muted)', opacity: 0.5 }}>/</span>{' '}
              {formatCurrency(goal.targetAmount)}
            </p>
          </div>
        </div>

        {/* Right: % badge + delete */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div
            className="px-2 py-1 rounded-lg"
            style={{ background: `${goal.color}18` }}
          >
            <p className="text-xs font-bold font-mono" style={{ color: goal.color }}>
              {progress.percentage.toFixed(1)}%
            </p>
          </div>
          <button
            onClick={() => onDelete(goal.id)}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-transform active:scale-90"
            style={{ background: 'var(--red-dim)', color: 'var(--red)' }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="progress-bar mb-3">
        <motion.div
          className="progress-bar-fill"
          initial={{ width: 0 }}
          animate={{ width: `${progress.percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.04 }}
          style={{ background: `linear-gradient(90deg, ${goal.color}, ${goal.color}cc)` }}
        />
      </div>

      {/* ── Bottom row: motivation + ETA ── */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <p className="text-xs leading-snug flex-1" style={{ color: 'var(--text-secondary)' }}>
          {motivation}
        </p>
        {progress.estimatedLabel && (
          <p
            className="text-[10px] font-medium flex-shrink-0 px-2 py-0.5 rounded-lg"
            style={{
              color: 'var(--text-muted)',
              background: 'var(--surface-3)',
              border: '1px solid var(--border)',
            }}
          >
            ⏱ {progress.estimatedLabel}
          </p>
        )}
      </div>

      {/* ── Action button ── */}
      {!progress.isCompleted ? (
        <button
          onClick={() => onTopUp(goal)}
          className="w-full py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.97]"
          style={{
            background: `${goal.color}18`,
            color: goal.color,
            border: `1px solid ${goal.color}35`,
          }}
        >
          + Top Up Progress
        </button>
      ) : (
        <div
          className="w-full py-2 rounded-xl text-xs font-semibold text-center"
          style={{ background: `${goal.color}15`, color: goal.color }}
        >
          🎉 Goal Selesai!
        </div>
      )}
    </motion.div>
  )
}
