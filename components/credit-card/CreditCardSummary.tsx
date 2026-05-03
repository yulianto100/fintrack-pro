'use client'

import { motion } from 'framer-motion'
import type { CreditCard } from '@/types'

interface Props {
  card: CreditCard
  hidden?: boolean
  onPayFull: () => void
  onPayMinimum: () => void
}

function formatDue(day: number): string {
  const today = new Date()
  let d = new Date(today.getFullYear(), today.getMonth(), day)
  if (d < today) d = new Date(today.getFullYear(), today.getMonth() + 1, day)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })
}

export function CreditCardSummary({ card, hidden = false, onPayFull, onPayMinimum }: Props) {
  const minPayment = Math.ceil(card.used * 0.1)
  const hasDebt    = card.used > 0

  const fmt = (n: number) =>
    hidden ? '••••••' : `Rp ${n.toLocaleString('id-ID')}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-3xl overflow-hidden"
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      }}
    >
      {/* Top: billing summary */}
      <div className="px-5 pt-5 pb-4">
        {/* Total tagihan — most prominent */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] font-semibold tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
              TOTAL TAGIHAN
            </p>
            <motion.p
              key={`bill-${hidden}-${card.used}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold"
              style={{
                color: hasDebt ? 'var(--red)' : 'var(--accent)',
                fontFamily: 'var(--font-syne)',
                letterSpacing: '-0.5px',
              }}
            >
              {fmt(card.used)}
            </motion.p>
          </div>
          {hasDebt && (
            <div
              className="px-2.5 py-1 rounded-full text-[10px] font-semibold"
              style={{ background: 'rgba(239,68,68,0.10)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.18)' }}
            >
              Belum Lunas
            </div>
          )}
          {!hasDebt && (
            <div
              className="px-2.5 py-1 rounded-full text-[10px] font-semibold"
              style={{ background: 'rgba(34,197,94,0.10)', color: 'var(--accent)', border: '1px solid rgba(34,197,94,0.18)' }}
            >
              ✓ Lunas
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px mb-4" style={{ background: 'var(--border)' }} />

        {/* Minimum + Due Date row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[9px] tracking-widest font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
              BAYAR MINIMUM
            </p>
            <p className="text-sm font-bold" style={{ color: 'var(--gold, #f59e0b)', fontFamily: 'var(--font-jetbrains)' }}>
              {fmt(minPayment)}
            </p>
            <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>10% dari tagihan</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] tracking-widest font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
              JATUH TEMPO
            </p>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jetbrains)' }}>
              {formatDue(card.dueDate)}
            </p>
            <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Tanggal {card.dueDate} tiap bulan</p>
          </div>
        </div>
      </div>

      {/* Bottom: action buttons */}
      <div
        className="px-4 pb-4 pt-1 flex gap-3"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        {/* Primary: Bayar Tagihan */}
        <button
          onClick={onPayFull}
          disabled={!hasDebt}
          className="flex-1 py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-[0.97] disabled:opacity-40"
          style={{
            background: hasDebt
              ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
              : 'rgba(34,197,94,0.18)',
            color: '#fff',
            boxShadow: hasDebt ? '0 4px 18px rgba(34,197,94,0.30)' : 'none',
            fontFamily: 'var(--font-space)',
            letterSpacing: '0.01em',
          }}
        >
          💳 Bayar Tagihan
        </button>

        {/* Secondary: Bayar Minimum */}
        <button
          onClick={onPayMinimum}
          disabled={!hasDebt}
          className="flex-1 py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-[0.97] disabled:opacity-40"
          style={{
            background: 'transparent',
            border: `1.5px solid ${hasDebt ? 'rgba(245,158,11,0.45)' : 'var(--border)'}`,
            color: hasDebt ? '#f59e0b' : 'var(--text-muted)',
            fontFamily: 'var(--font-space)',
          }}
        >
          ⚡ Bayar Minimum
        </button>
      </div>
    </motion.div>
  )
}
