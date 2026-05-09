'use client'

import { motion } from 'framer-motion'
import { Eye, EyeOff, TrendingDown, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { dashboardColors, dashboardRadius } from './dashboardTokens'

interface Props {
  totalWealth: number
  animatedWealth: number
  monthlyChange: number
  monthlyChangePct: number
  hidden: boolean
  mounted: boolean
  onToggleHidden: () => void
}

const MASKED_MAIN = '********'

export function NetWorthCard({
  totalWealth,
  animatedWealth,
  monthlyChange,
  monthlyChangePct,
  hidden,
  mounted,
  onToggleHidden,
}: Props) {
  const isMonthlyUp = monthlyChange >= 0
  const hasMonthlyChange = mounted && !hidden && totalWealth > 0 && Math.abs(monthlyChange) > 0
  const changeTone = isMonthlyUp ? dashboardColors.accent : dashboardColors.expenseStrong

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.08 }}
      className="glass-hero relative overflow-hidden p-5"
      style={{
        borderRadius: dashboardRadius.card,
        boxShadow: isMonthlyUp
          ? '0 10px 34px rgba(34,197,94,0.14), 0 0 0 1px rgba(34,197,94,0.12)'
          : undefined,
      }}
    >
      <div
        className="absolute -top-12 -right-12 h-48 w-48 rounded-full blur-3xl pointer-events-none"
        style={{ background: `rgba(34,197,94,${isMonthlyUp && !hidden ? '0.14' : '0.07'})` }}
      />
      <div
        className="absolute -bottom-10 -left-10 h-36 w-36 rounded-full blur-2xl pointer-events-none"
        style={{ background: 'rgba(45,212,191,0.06)' }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold leading-tight" style={{ color: dashboardColors.accent }}>
            Total Kekayaan Bersih
          </p>
          <p className="mt-1 text-xs leading-snug" style={{ color: dashboardColors.muted }}>
            Total aset dikurangi kewajiban
          </p>
        </div>

        {mounted && (
          <motion.button
            type="button"
            onClick={onToggleHidden}
            whileTap={{ scale: 0.92 }}
            className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{
              background: hidden ? 'rgba(34,197,94,0.16)' : 'rgba(34,197,94,0.10)',
              border: `1px solid ${hidden ? 'rgba(34,197,94,0.34)' : 'rgba(34,197,94,0.22)'}`,
              color: dashboardColors.accent,
            }}
            aria-label={hidden ? 'Tampilkan saldo' : 'Sembunyikan saldo'}
          >
            {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
            <span className="text-xs font-semibold">{hidden ? 'Tampilkan' : 'Sembunyikan'}</span>
          </motion.button>
        )}
      </div>

      <motion.p
        className="relative mt-4 font-display font-bold"
        style={{
          fontSize: 'clamp(1.8rem, 7vw, 2.125rem)',
          lineHeight: 1.12,
          color: hidden ? dashboardColors.muted : dashboardColors.text,
          letterSpacing: hidden ? 2 : 0,
          opacity: mounted ? 1 : 0,
        }}
      >
        {hidden ? MASKED_MAIN : formatCurrency(animatedWealth)}
      </motion.p>

      <div className="relative mt-4 min-h-[42px]">
        {hasMonthlyChange && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="inline-flex max-w-full items-center gap-2 rounded-2xl px-3 py-2"
            style={{
              background: isMonthlyUp ? dashboardColors.incomeSoft : dashboardColors.expenseSoft,
              border: `1px solid ${isMonthlyUp ? 'rgba(34,197,94,0.22)' : 'rgba(248,113,113,0.22)'}`,
              color: changeTone,
            }}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-xl" style={{ background: 'rgba(0,0,0,0.12)' }}>
              {isMonthlyUp ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-medium leading-tight" style={{ color: dashboardColors.muted }}>
                {isMonthlyUp ? 'Naik dibanding bulan lalu' : 'Turun dibanding bulan lalu'}
              </span>
              <span className="block truncate text-[13px] font-bold leading-snug">
                {isMonthlyUp ? '+' : '-'}{formatCurrency(Math.abs(monthlyChange))}
                {Math.abs(monthlyChangePct) >= 0.01 && ` (${isMonthlyUp ? '+' : '-'}${Math.abs(monthlyChangePct).toFixed(1)}%)`}
              </span>
            </span>
          </motion.div>
        )}
      </div>
    </motion.section>
  )
}
