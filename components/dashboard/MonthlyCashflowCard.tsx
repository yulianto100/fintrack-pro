'use client'

import { TrendingDown, TrendingUp, WalletCards } from 'lucide-react'
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
      label: 'Pemasukan bulan ini',
      value: hidden ? MASKED : signedCurrency(income, '+'),
      color: dashboardColors.income,
      bg: dashboardColors.incomeSoft,
      Icon: TrendingUp,
    },
    {
      label: 'Pengeluaran bulan ini',
      value: hidden ? MASKED : signedCurrency(expense, '-'),
      color: dashboardColors.expense,
      bg: dashboardColors.expenseSoft,
      Icon: TrendingDown,
    },
  ]

  return (
    <section className="glass-card p-4" style={{ borderRadius: dashboardRadius.cardSm }}>
      <div className="mb-3 flex items-center justify-between px-0.5">
        <h2 className="text-[15px] font-semibold leading-tight" style={{ color: dashboardColors.text }}>
          Cashflow Bulan Ini
        </h2>
      </div>

      <div
        className="mb-3 flex items-center justify-between gap-3 rounded-2xl p-3.5"
        style={{
          background: balancePositive ? dashboardColors.incomeSoft : dashboardColors.criticalSoft,
          border: `1px solid ${dashboardColors.border}`,
        }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ background: 'rgba(0,0,0,0.12)', color: balanceTone }}>
            <WalletCards size={19} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <p className="text-xs leading-snug" style={{ color: dashboardColors.muted }}>
              Saldo bulan ini
            </p>
            <p className="mt-1 truncate text-xl font-bold leading-tight font-mono" style={{ color: hidden ? dashboardColors.muted : balanceTone, letterSpacing: hidden ? 2 : 0 }}>
              {hidden ? MASKED : signedCurrency(balance, balancePositive ? '+' : '-')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {secondaryItems.map(({ label, value, color, bg, Icon }) => (
          <div
            key={label}
            className="min-w-0 rounded-2xl p-3"
            style={{ background: bg, border: `1px solid ${dashboardColors.border}` }}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(0,0,0,0.12)', color }}>
                <Icon size={15} strokeWidth={2.2} />
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
