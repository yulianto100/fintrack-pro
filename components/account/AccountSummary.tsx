'use client'

import { memo }          from 'react'
import { motion }        from 'framer-motion'
import { Eye, EyeOff }  from 'lucide-react'
import type { AccountSummaryData } from '@/types/account'

interface Props {
  summary: AccountSummaryData
  hidden:  boolean
  onToggleHidden: () => void
}

const fmt = (n: number, hidden: boolean) =>
  hidden ? 'Rp ••••••' : `Rp ${n.toLocaleString('id-ID')}`

export const AccountSummary = memo(function AccountSummary({
  summary,
  hidden,
  onToggleHidden,
}: Props) {
  const { aset, liabilitas, net } = summary
  const netPositive = net >= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="mx-4 rounded-3xl overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, #0B3B2E 0%, #071f18 60%, #040f0b 100%)',
        border:     '1px solid rgba(34,197,94,0.18)',
        boxShadow:  '0 12px 40px rgba(0,0,0,0.40), 0 2px 0 rgba(34,197,94,0.08) inset',
        padding:    '20px 20px 18px',
      }}
    >
      {/* Label + toggle */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium tracking-wide" style={{ color: 'rgba(255,255,255,0.45)' }}>
          NET SALDO
        </span>
        <button
          onClick={onToggleHidden}
          className="p-1 rounded-lg transition-opacity active:opacity-60"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>

      {/* Big net number */}
      <div className="mb-4">
        <span
          className="text-3xl font-bold tracking-tight"
          style={{
            color: netPositive ? 'var(--accent)' : '#ef4444',
            letterSpacing: '-0.03em',
          }}
        >
          {fmt(Math.abs(net), hidden)}
        </span>
        {!hidden && !netPositive && (
          <span className="ml-1.5 text-xs font-semibold" style={{ color: '#ef4444' }}>defisit</span>
        )}
      </div>

      {/* Aset / Liabilitas row */}
      <div
        className="grid grid-cols-2 gap-3 pt-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Aset */}
        <div className="rounded-2xl p-3" style={{ background: 'rgba(34,197,94,0.07)' }}>
          <p className="text-[10px] font-semibold mb-0.5" style={{ color: 'rgba(34,197,94,0.6)' }}>
            ASET
          </p>
          <p className="text-sm font-bold" style={{ color: '#22c55e' }}>
            {fmt(aset, hidden)}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Rekening + E-Wallet
          </p>
        </div>

        {/* Liabilitas */}
        <div className="rounded-2xl p-3" style={{ background: 'rgba(239,68,68,0.07)' }}>
          <p className="text-[10px] font-semibold mb-0.5" style={{ color: 'rgba(239,68,68,0.6)' }}>
            LIABILITAS
          </p>
          <p className="text-sm font-bold" style={{ color: liabilitas > 0 ? '#ef4444' : 'rgba(255,255,255,0.45)' }}>
            {fmt(liabilitas, hidden)}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Kartu kredit
          </p>
        </div>
      </div>
    </motion.div>
  )
})
