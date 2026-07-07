'use client'

import { TrendingDown, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { dashboardColors, dashboardRadius } from './dashboardTokens'

interface Props {
  income: number
  expense: number
  balance: number
  hidden: boolean
}

const MASKED = '******'

function signedCurrency(value: number, sign: '+' | '-') {
  return `${sign}${formatCurrency(Math.abs(value))}`
}

export function MonthlyCashflowCard({ income, expense, balance, hidden }: Props) {
  const balancePositive = balance >= 0
  const balanceTone = balancePositive ? dashboardColors.income : dashboardColors.expenseStrong

  const secondaryItems = [
    {
      label: 'Masuk',
      value: hidden ? MASKED : signedCurrency(income, '+'),
      color: dashboardColors.income,
      bg: dashboardColors.incomeSoft,
      Icon: TrendingUp,
    },
    {
      label: 'Keluar',
      value: hidden ? MASKED : signedCurrency(expense, '-'),
      color: dashboardColors.expense,
      bg: dashboardColors.expenseSoft,
      Icon: TrendingDown,
    },
  ]

  return (
    <section className="glass-card p-3.5" style={{ borderRadius: dashboardRadius.cardSm }}>
      <div className="mb-3 flex items-center justify-between gap-3 px-0.5">
        <h2 className="text-[15px] font-semibold leading-tight" style={{ color: dashboardColors.text }}>
          Cashflow
        </h2>
        <p className="truncate text-base font-bold leading-tight font-mono" style={{ color: hidden ? dashboardColors.muted : balanceTone, letterSpacing: hidden ? 2 : 0 }}>
          {hidden ? MASKED : signedCurrency(balance, balancePositive ? '+' : '-')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {secondaryItems.map(({ label, value, color, bg, Icon }) => (
          <div
            key={label}
            className="min-w-0 rounded-2xl px-3 py-2.5"
            style={{ background: bg, border: `1px solid ${dashboardColors.border}` }}
          >
            <div className="mb-1.5 flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg" style={{ background: 'rgba(0,0,0,0.10)', color }}>
                <Icon size={14} strokeWidth={2.2} />
              </span>
              <p className="text-[11px] leading-snug" style={{ color: dashboardColors.muted }}>
                {label}
              </p>
            </div>
            <p className="truncate text-sm font-bold leading-tight font-mono" style={{ color: hidden ? dashboardColors.muted : color, letterSpacing: hidden ? 2 : 0 }}>
              {value}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
