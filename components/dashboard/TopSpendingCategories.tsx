'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ArrowDown, ArrowUp, ChevronRight, Minus } from 'lucide-react'
import type { Transaction } from '@/types'
import { getTopCategories } from '@/lib/insights-engine'
import { formatCurrency } from '@/lib/utils'
import { DashboardSectionHeader } from './DashboardSectionHeader'
import { dashboardColors, dashboardRadius } from './dashboardTokens'

interface Props {
  transactions: Transaction[]
}

export function TopSpendingCategories({ transactions }: Props) {
  const categories = useMemo(() => getTopCategories(transactions, 3), [transactions])

  if (categories.length === 0) return null

  return (
    <section className="space-y-2">
      <DashboardSectionHeader title="Pengeluaran Terbesar" />
      <div className="glass-card overflow-hidden" style={{ borderRadius: dashboardRadius.cardSm }}>
        {categories.map((cat, index) => (
          <div
            key={cat.categoryName}
            className="px-3.5 py-3"
            style={{ borderBottom: index < categories.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
          >
            <div className="mb-1.5 flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(34,197,94,0.10)' }}>
                <span className="text-base">{cat.categoryIcon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[13px] font-semibold" style={{ color: dashboardColors.text }}>{cat.categoryName}</p>
                  <p className="shrink-0 text-[11px] font-bold" style={{ color: dashboardColors.expense }}>
                    {formatCurrency(cat.amount).replace(/\s/g, '')}
                  </p>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px]" style={{ color: dashboardColors.muted }}>
                  <span>{cat.transactionCount} transaksi · {cat.percent.toFixed(0)}%</span>
                  <Trend trend={cat.trend} percent={cat.trendPercent} />
                </div>
              </div>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(cat.percent, 100)}%`, background: 'linear-gradient(90deg,#FB7185,#FBBF24)' }}
              />
            </div>
          </div>
        ))}
        <Link href="/transactions" className="flex items-center justify-center gap-1 py-2.5 text-xs font-semibold" style={{ color: dashboardColors.accent, background: 'rgba(34,197,94,0.08)' }}>
          Lihat transaksi <ChevronRight size={13} />
        </Link>
      </div>
    </section>
  )
}

function Trend({ trend, percent }: { trend: 'up' | 'down' | 'same'; percent: number }) {
  const Icon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus
  const color = trend === 'up' ? dashboardColors.expense : trend === 'down' ? dashboardColors.income : dashboardColors.muted
  const label = trend === 'same' ? 'stabil' : `${Math.abs(percent).toFixed(0)}%`
  return (
    <span className="inline-flex items-center gap-0.5" style={{ color }}>
      <Icon size={10} /> {label}
    </span>
  )
}
