'use client'

import Link       from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, CreditCard } from 'lucide-react'
import { useCreditCards } from '@/hooks/useCreditCards'

interface Props {
  hidden?: boolean
}

export function CreditCardDashboardSection({ hidden = false }: Props) {
  const { cards, loading, totalDebt, totalLimit, overallUsagePercent } = useCreditCards()

  if (loading) return <div className="skeleton h-24 rounded-2xl" />
  if (cards.length === 0) return null

  const statusColor =
    overallUsagePercent >= 80 ? '#ef4444' :
    overallUsagePercent >= 50 ? '#f59e0b' :
    '#22c55e'

  const statusLabel =
    overallUsagePercent >= 80 ? '⚠️ Perlu Perhatian' :
    overallUsagePercent >= 50 ? '🔔 Cukup Tinggi' :
    '✅ Aman'

  const fmt = (n: number) =>
    hidden ? '••••••' : `Rp ${n.toLocaleString('id-ID')}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Section header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
          KARTU KREDIT
        </p>
        <Link
          href="/credit-card"
          className="flex items-center gap-1 text-xs transition-opacity hover:opacity-70"
          style={{ color: 'var(--accent)' }}
        >
          Kelola <ArrowRight size={12} />
        </Link>
      </div>

      {/* Summary card */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'var(--surface-card)',
          border:     '1px solid var(--border)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(34,197,94,0.10)' }}
            >
              <CreditCard size={18} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                {cards.length} Kartu Aktif
              </p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                Total limit: {fmt(totalLimit)}
              </p>
            </div>
          </div>
          <span
            className="text-[10px] font-semibold px-2 py-1 rounded-full"
            style={{ background: `${statusColor}15`, color: statusColor }}
          >
            {statusLabel}
          </span>
        </div>

        {/* Debt amount */}
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Total Tagihan</p>
            <p
              className="text-lg font-bold font-mono"
              style={{ color: totalDebt > 0 ? '#ef4444' : 'var(--accent)' }}
            >
              {fmt(totalDebt)}
            </p>
          </div>
          <p className="text-xs font-bold" style={{ color: statusColor }}>
            {overallUsagePercent.toFixed(0)}%
          </p>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(overallUsagePercent, 100)}%` }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: statusColor }}
          />
        </div>

        {/* Individual cards */}
        {cards.length > 1 && (
          <div className="mt-3 space-y-1.5">
            {cards.slice(0, 3).map((card) => {
              const pct   = card.limit > 0 ? (card.used / card.limit) * 100 : 0
              const cColor = pct >= 80 ? '#ef4444' : pct >= 50 ? '#f59e0b' : '#22c55e'
              return (
                <div key={card.id} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: card.color || 'var(--accent)' }}
                  />
                  <p className="text-[11px] flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                    {card.name}
                  </p>
                  <p className="text-[11px] font-mono" style={{ color: cColor }}>
                    {hidden ? '••••' : `Rp ${card.used.toLocaleString('id-ID')}`}
                  </p>
                </div>
              )
            })}
            {cards.length > 3 && (
              <p className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>
                +{cards.length - 3} kartu lainnya
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
