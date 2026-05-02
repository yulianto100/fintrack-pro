'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, X, TrendingUp, TrendingDown } from 'lucide-react'
import type { Transaction } from '@/types'

interface Props {
  transactions: Transaction[]
}

function getWeekRange(weeksAgo: number) {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=Sun
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
  const d = new Date(dateStr)
  return d >= range.start && d <= range.end
}

export function SmartInsight({ transactions }: Props) {
  const [dismissed, setDismissed] = useState(false)

  const insight = useMemo(() => {
    const thisWeek = getWeekRange(0)
    const lastWeek = getWeekRange(1)

    const thisWeekTx = transactions.filter(
      t => t.type === 'expense' && isInRange(t.date, thisWeek)
    )
    const lastWeekTx = transactions.filter(
      t => t.type === 'expense' && isInRange(t.date, lastWeek)
    )

    if (thisWeekTx.length === 0) return null

    // Group by category this week
    const byCat: Record<string, number> = {}
    for (const t of thisWeekTx) {
      const cat = t.categoryName || 'Lainnya'
      byCat[cat] = (byCat[cat] || 0) + t.amount
    }

    const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0]
    if (!topCat) return null

    const [catName, thisTotal] = topCat

    // Last week same category
    const lastTotal = lastWeekTx
      .filter(t => (t.categoryName || 'Lainnya') === catName)
      .reduce((s, t) => s + t.amount, 0)

    const pct = lastTotal > 0
      ? Math.round(((thisTotal - lastTotal) / lastTotal) * 100)
      : null

    return { catName, thisTotal, lastTotal, pct }
  }, [transactions])

  if (!insight || dismissed) return null

  const isUp = insight.pct !== null && insight.pct > 0

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-2xl overflow-hidden"
        style={{
          background:  'linear-gradient(135deg, rgba(34,197,94,0.10) 0%, rgba(16,185,129,0.06) 100%)',
          border:      '1px solid rgba(34,197,94,0.18)',
          boxShadow:   '0 8px 30px rgba(34,197,94,0.08)',
        }}
      >
        {/* Ambient glow */}
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl pointer-events-none"
          style={{ background: 'rgba(34,197,94,0.12)' }} />

        <div className="relative flex items-start gap-3 p-4">
          {/* Icon */}
          <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center mt-0.5"
            style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--accent)' }}>
            <Lightbulb size={15} strokeWidth={2} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1"
              style={{ color: 'rgba(34,197,94,0.7)' }}>
              💡 Smart Insight
            </p>
            <p className="text-sm font-semibold leading-snug"
              style={{ color: 'var(--text-primary)' }}>
              Pengeluaran terbesar minggu ini:{' '}
              <span style={{ color: 'var(--accent)' }}>{insight.catName}</span>
            </p>
            {insight.pct !== null && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{
                    background: isUp ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
                    color:      isUp ? 'var(--red)' : 'var(--accent)',
                  }}>
                  {isUp
                    ? <TrendingUp size={10} strokeWidth={2.5} />
                    : <TrendingDown size={10} strokeWidth={2.5} />
                  }
                  {isUp ? '+' : ''}{insight.pct}% dibanding minggu lalu
                </div>
              </div>
            )}
            {insight.pct === null && (
              <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                Tidak ada data minggu lalu untuk perbandingan
              </p>
            )}
          </div>

          {/* Dismiss */}
          <button
            onClick={() => setDismissed(true)}
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={13} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
