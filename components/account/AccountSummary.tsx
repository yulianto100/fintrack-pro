'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, TrendingUp, TrendingDown } from 'lucide-react'
import type { AccountSummaryData } from '@/types/account'

interface Props {
  summary: AccountSummaryData
  hidden: boolean
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
        border: '1px solid rgba(34,197,94,0.18)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.40), 0 2px 0 rgba(34,197,94,0.08) inset',
        padding: '20px 20px 18px',
      }}
    >
      {/* Label + eye toggle */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold tracking-[0.16em] uppercase" style={{ color: 'rgba(255,255,255,0.38)' }}>
          Net Saldo
        </span>
        <button
          onClick={onToggleHidden}
          className="p-1 rounded-lg transition-opacity active:opacity-60"
          style={{ color: 'rgba(255,255,255,0.4)' }}
          aria-label={hidden ? 'Tampilkan saldo' : 'Sembunyikan saldo'}
        >
          {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>

      {/* ── PRIMARY: Big Net Balance ── */}
      <motion.div
        className="mb-1"
        key={hidden ? 'hidden' : net}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <span
          className="font-bold tracking-tight"
          style={{
            fontSize: 34,
            lineHeight: 1.05,
            letterSpacing: '-0.035em',
            color: netPositive ? 'var(--accent)' : '#f97316',
            fontFamily: 'var(--font-syne)',
          }}
        >
          {fmt(Math.abs(net), hidden)}
        </span>
        {!hidden && !netPositive && (
          <span
            className="ml-2 text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316' }}
          >
            defisit
          </span>
        )}
      </motion.div>

      {/* Trend line (visual accent) */}
      <div className="mb-4 flex items-center gap-1.5">
        {netPositive ? (
          <TrendingUp size={11} style={{ color: 'rgba(34,197,94,0.5)' }} />
        ) : (
          <TrendingDown size={11} style={{ color: 'rgba(249,115,22,0.5)' }} />
        )}
        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
          Saldo bersih dari semua akun
        </span>
      </div>

      {/* ── SECONDARY: Aset & Hutang ── */}
      <div
        className="grid grid-cols-2 gap-3 pt-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Aset — green, affirming */}
        <div className="rounded-2xl p-3" style={{ background: 'rgba(34,197,94,0.07)' }}>
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[9px] font-bold tracking-[0.14em] uppercase" style={{ color: 'rgba(34,197,94,0.55)' }}>
              Aset
            </span>
          </div>
          <p className="text-[14px] font-bold leading-tight" style={{ color: '#22c55e', fontFamily: 'var(--font-syne)' }}>
            {fmt(aset, hidden)}
          </p>
          <p className="text-[9px] mt-1" style={{ color: 'rgba(255,255,255,0.28)' }}>
            Rekening + E-Wallet
          </p>
        </div>

        {/* Hutang — orange/muted, less dominant */}
        <div
          className="rounded-2xl p-3"
          style={{ background: liabilitas > 0 ? 'rgba(249,115,22,0.07)' : 'rgba(255,255,255,0.03)' }}
        >
          <div className="flex items-center gap-1 mb-1">
            <span
              className="text-[9px] font-bold tracking-[0.14em] uppercase"
              style={{ color: liabilitas > 0 ? 'rgba(249,115,22,0.55)' : 'rgba(255,255,255,0.22)' }}
            >
              Hutang
            </span>
          </div>
          <p
            className="text-[14px] font-bold leading-tight"
            style={{
              color: liabilitas > 0 ? '#f97316' : 'rgba(255,255,255,0.3)',
              fontFamily: 'var(--font-syne)',
            }}
          >
            {fmt(liabilitas, hidden)}
          </p>
          <p className="text-[9px] mt-1" style={{ color: 'rgba(255,255,255,0.28)' }}>
            Kartu kredit
          </p>
        </div>
      </div>
    </motion.div>
  )
})
