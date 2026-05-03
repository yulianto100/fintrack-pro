'use client'

import { motion } from 'framer-motion'
import type { CreditCard } from '@/types'

interface Props {
  card: CreditCard
  hidden?: boolean
}

export function CreditCardSummary({ card, hidden = false }: Props) {
  const minPayment = Math.ceil(card.used * 0.1)
  const remaining  = card.limit - card.used

  const fmt = (n: number) =>
    hidden ? '••••••' : `Rp ${n.toLocaleString('id-ID')}`

  const summaryCards = [
    {
      icon:    '💳',
      label:   'Total Tagihan',
      value:   fmt(card.used),
      color:   card.used > 0 ? 'var(--red)' : 'var(--accent)',
      bg:      card.used > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
      border:  card.used > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
    },
    {
      icon:    '⚡',
      label:   'Bayar Minimum',
      value:   fmt(minPayment),
      note:    '10% dari tagihan',
      color:   'var(--yellow, #f59e0b)',
      bg:      'rgba(245,158,11,0.08)',
      border:  'rgba(245,158,11,0.15)',
    },
    {
      icon:    '🟢',
      label:   'Sisa Limit',
      value:   fmt(remaining),
      color:   'var(--accent)',
      bg:      'rgba(34,197,94,0.08)',
      border:  'rgba(34,197,94,0.15)',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {summaryCards.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="rounded-2xl p-3 flex flex-col gap-1"
          style={{ background: s.bg, border: `1px solid ${s.border}` }}
        >
          <span className="text-base">{s.icon}</span>
          <p className="text-[9px] font-semibold tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {s.label.toUpperCase()}
          </p>
          <p className="text-xs font-bold font-mono leading-tight" style={{ color: s.color }}>
            {s.value}
          </p>
          {s.note && (
            <p className="text-[8px]" style={{ color: 'var(--text-muted)' }}>{s.note}</p>
          )}
        </motion.div>
      ))}
    </div>
  )
}
