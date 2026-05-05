'use client'

import { memo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import type { AccountSummaryData, UnifiedAccount } from '@/types/account'

interface Insight {
  id:     string
  emoji:  string
  text:   string
  color?: string
  cta?:   string
}

function deriveInsights(summary: AccountSummaryData, accounts: UnifiedAccount[]): Insight[] {
  try {
    const insights: Insight[] = []
    const { aset, liabilitas, net } = summary ?? {}

    // Kartu kredit hampir habis limit
    const highUsageCc = (accounts ?? []).filter(a => {
      if (a.type !== 'credit') return false
      const pct = a.creditLimit ? (a.creditUsed ?? 0) / a.creditLimit : 0
      return pct >= 0.75
    })
    if (highUsageCc.length > 0) {
      const names = highUsageCc.map(a => a.name?.split(' ')[0] ?? 'Kartu').join(', ')
      insights.push({
        id: 'high-cc',
        emoji: '⚠️',
        text: `Limit ${names} hampir habis`,
        color: '#f97316',
        cta: 'Bayar sekarang',
      })
    }

    // Net positif
    if (net > 0 && aset > 0) {
      const ratio = Math.round((net / aset) * 100)
      if (ratio > 60) {
        insights.push({
          id: 'healthy-net',
          emoji: '✅',
          text: `Keuanganmu sehat — ${ratio}% aset bebas hutang`,
          color: '#22c55e',
        })
      }
    }

    // Akun idle
    const idleAccounts = (accounts ?? []).filter(
      a => a.type !== 'credit' && (a.balance ?? 0) === 0
    )
    if (idleAccounts.length > 0) {
      insights.push({
        id: 'idle',
        emoji: '💤',
        text: `${idleAccounts.length} akun belum digunakan`,
        color: 'var(--text-muted)',
        cta: 'Mulai gunakan',
      })
    }

    // Liabilitas tinggi
    if (liabilitas > 0 && aset > 0 && liabilitas / aset > 0.4) {
      insights.push({
        id: 'high-debt',
        emoji: '📉',
        text: 'Hutang kartu cukup tinggi — pertimbangkan pelunasan',
        color: '#f97316',
      })
    }

    // Default fallback — always at least 1 insight
    if (insights.length === 0) {
      insights.push({
        id: 'default',
        emoji: '🚀',
        text: 'Semua akun aktif. Keuangan kamu terpantau!',
        color: 'var(--accent)',
      })
    }

    return insights.slice(0, 3)
  } catch {
    // Absolute safety net
    return [{
      id: 'default',
      emoji: '🚀',
      text: 'Semua akun aktif. Keuangan kamu terpantau!',
      color: 'var(--accent)',
    }]
  }
}

interface Props {
  summary:  AccountSummaryData
  accounts: UnifiedAccount[]
}

export const AccountInsights = memo(function AccountInsights({ summary, accounts }: Props) {
  const insights = deriveInsights(summary, accounts)
  const [activeIdx, setActiveIdx] = useState(0)

  // Auto-rotate
  useEffect(() => {
    if (insights.length <= 1) return
    const t = setInterval(() => {
      setActiveIdx(i => (i + 1) % insights.length)
    }, 4500)
    return () => clearInterval(t)
  }, [insights.length])

  // ✅ KEY FIX: reset activeIdx whenever insights array shrinks
  useEffect(() => {
    if (activeIdx >= insights.length) {
      setActiveIdx(0)
    }
  }, [insights.length, activeIdx])

  // Clamp index — never let it go out of bounds
  const safeIdx = Math.min(activeIdx, insights.length - 1)
  const current = insights[safeIdx]

  // Should never happen after the fix above, but guard anyway
  if (!current) return null

  return (
    <div className="mx-4">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'var(--surface-card)',
          border: '1px solid rgba(255,255,255,0.07)',
          padding: '11px 14px',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.18 }}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[14px] flex-shrink-0">{current.emoji}</span>
              <p
                className="text-[12px] font-medium truncate"
                style={{ color: current.color || 'var(--text-primary)' }}
              >
                {current.text}
              </p>
            </div>
            {current.cta && (
              <button
                className="flex-shrink-0 flex items-center gap-0.5 text-[11px] font-semibold"
                style={{ color: 'var(--accent)' }}
              >
                {current.cta}
                <ChevronRight size={11} />
              </button>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Dot indicators */}
        {insights.length > 1 && (
          <div className="flex items-center gap-1 mt-2.5">
            {insights.map((ins, i) => (
              <button
                key={ins.id}
                onClick={() => setActiveIdx(i)}
                className="rounded-full transition-all"
                style={{
                  width:      i === safeIdx ? 14 : 5,
                  height:     5,
                  background: i === safeIdx ? 'var(--accent)' : 'rgba(255,255,255,0.15)',
                  transition: 'width 250ms ease, background 200ms ease',
                }}
                aria-label={`Insight ${i + 1}`}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
})
