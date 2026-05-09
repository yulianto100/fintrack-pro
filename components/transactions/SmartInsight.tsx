'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Lightbulb, TrendingDown, TrendingUp, X } from 'lucide-react'
import { isExpenseForSummary } from '@/lib/transaction-rules'
import type { Transaction } from '@/types'

interface Props {
  transactions: Transaction[]
}

const DISMISS_KEY = 'finuvo:transactions-smart-insight-dismissed'

function getWeekRange(weeksAgo: number) {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const startOfThisWeek = new Date(now)
  startOfThisWeek.setDate(now.getDate() - dayOfWeek)
  startOfThisWeek.setHours(0, 0, 0, 0)

  const start = new Date(startOfThisWeek)
  start.setDate(start.getDate() - weeksAgo * 7)

  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

function isInRange(dateStr: string, range: { start: Date; end: Date }) {
  const date = new Date(dateStr)
  return date >= range.start && date <= range.end
}

export function SmartInsight({ transactions }: Props) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try {
      setDismissed(window.sessionStorage.getItem(DISMISS_KEY) === '1')
    } catch {
      setDismissed(false)
    }
  }, [])

  const insight = useMemo(() => {
    const thisWeek = getWeekRange(0)
    const lastWeek = getWeekRange(1)

    const thisWeekTx = transactions.filter(
      transaction => isExpenseForSummary(transaction) && isInRange(transaction.date, thisWeek)
    )
    const lastWeekTx = transactions.filter(
      transaction => isExpenseForSummary(transaction) && isInRange(transaction.date, lastWeek)
    )

    if (thisWeekTx.length === 0) return null

    const byCategory: Record<string, number> = {}
    for (const transaction of thisWeekTx) {
      const category = transaction.categoryName || 'Lainnya'
      byCategory[category] = (byCategory[category] || 0) + transaction.amount
    }

    const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]
    if (!topCategory) return null

    const [categoryName, thisTotal] = topCategory
    const lastTotal = lastWeekTx
      .filter(transaction => (transaction.categoryName || 'Lainnya') === categoryName)
      .reduce((sum, transaction) => sum + transaction.amount, 0)

    const pct = lastTotal > 0
      ? Math.round(((thisTotal - lastTotal) / lastTotal) * 100)
      : null

    return { categoryName, pct }
  }, [transactions])

  if (!insight || dismissed) return null

  const isUp = insight.pct !== null && insight.pct > 0
  const dismiss = () => {
    setDismissed(true)
    try {
      window.sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // Ignore storage failures; the in-memory dismissal still works.
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 6, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(34,197,94,0.10) 0%, rgba(16,185,129,0.06) 100%)',
          border: '1px solid rgba(34,197,94,0.18)',
          boxShadow: '0 8px 24px rgba(34,197,94,0.07)',
        }}
      >
        <div
          className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl"
          style={{ background: 'rgba(34,197,94,0.12)' }}
        />

        <div className="relative flex items-start gap-3 p-3">
          <div
            className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--accent)' }}
          >
            <Lightbulb size={14} strokeWidth={2} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(34,197,94,0.7)' }}>
              Smart Insight
            </p>
            <p className="text-[13px] font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
              Pengeluaran terbesar minggu ini:{' '}
              <span style={{ color: 'var(--accent)' }}>{insight.categoryName}</span>
            </p>

            {insight.pct !== null ? (
              <div className="mt-1 flex items-center gap-1.5">
                <div
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{
                    background: isUp ? 'rgba(248,113,113,0.12)' : 'rgba(34,197,94,0.12)',
                    color: isUp ? 'var(--expenseNormal)' : 'var(--accent)',
                  }}
                >
                  {isUp
                    ? <TrendingUp size={10} strokeWidth={2.5} />
                    : <TrendingDown size={10} strokeWidth={2.5} />}
                  {isUp ? '+' : ''}{insight.pct}% dibanding minggu lalu
                </div>
              </div>
            ) : (
              <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Belum ada data minggu lalu untuk perbandingan.
              </p>
            )}
          </div>

          <button
            onClick={dismiss}
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Tutup insight"
          >
            <X size={13} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
