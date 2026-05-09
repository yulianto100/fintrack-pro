'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { TrendingDown, TrendingUp } from 'lucide-react'
import type { Transaction } from '@/types'
import { generateWeeklySummary } from '@/lib/prediction'
import { formatCurrency } from '@/lib/utils'
import { dashboardColors, dashboardRadius } from './dashboardTokens'

const MASKED = '******'

export function WeeklySummary({ transactions, hidden = false }: { transactions: Transaction[]; hidden?: boolean }) {
  const summary = useMemo(() => generateWeeklySummary(transactions), [transactions])

  if (summary.txCount === 0) return null

  const isPositive = summary.balance >= 0
  const vsPositive = summary.vsLastWeek <= 0
  const vsAbs = Math.abs(summary.vsLastWeek)

  const items = [
    { label: 'Masuk minggu ini', value: summary.income, color: dashboardColors.income },
    { label: 'Keluar minggu ini', value: summary.expense, color: dashboardColors.expense },
    { label: 'Saldo minggu ini', value: summary.balance, color: isPositive ? dashboardColors.income : dashboardColors.expenseStrong },
  ]

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4"
      style={{ borderRadius: dashboardRadius.cardSm }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold leading-tight" style={{ color: dashboardColors.text }}>
            Ringkasan Minggu Ini
          </h2>
          <p className="mt-1 text-xs leading-snug" style={{ color: dashboardColors.muted }}>
            {summary.txCount} transaksi - Top: {summary.topCategory}
          </p>
        </div>

        {summary.vsLastWeek !== 0 && (
          <div
            className="flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold"
            style={{
              background: vsPositive ? dashboardColors.incomeSoft : dashboardColors.expenseSoft,
              color: vsPositive ? dashboardColors.income : dashboardColors.expenseStrong,
            }}
          >
            {vsPositive ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
            {vsPositive ? '-' : '+'}{vsAbs.toFixed(0)}%
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {items.map(({ label, value, color }) => (
          <div
            key={label}
            className="min-w-0 rounded-2xl p-3"
            style={{ background: 'var(--surface-3)', border: `1px solid ${dashboardColors.border}` }}
          >
            <p className="min-h-[30px] text-[11px] leading-snug" style={{ color: dashboardColors.muted }}>
              {label}
            </p>
            <p
              className="mt-1 truncate text-[13px] font-bold leading-tight font-mono"
              style={{ color: hidden ? dashboardColors.muted : color, letterSpacing: hidden ? 2 : 0 }}
            >
              {hidden ? MASKED : (value < 0 ? '-' : '') + formatCurrency(Math.abs(value))}
            </p>
          </div>
        ))}
      </div>
    </motion.section>
  )
}
