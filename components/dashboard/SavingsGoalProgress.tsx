'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ChevronRight, Target } from 'lucide-react'
import { useApiList } from '@/hooks/useApiData'
import type { Goal, Transaction } from '@/types'
import { isExpenseForSummary } from '@/lib/transaction-rules'
import { getSavingsRate } from '@/lib/insights-engine'
import { formatCurrency } from '@/lib/utils'
import { DashboardSectionHeader } from './DashboardSectionHeader'
import { dashboardColors, dashboardRadius } from './dashboardTokens'

interface Props {
  transactions: Transaction[]
}

export function SavingsGoalProgress({ transactions }: Props) {
  const { data: goals } = useApiList<Goal>('/api/goals', { refreshMs: 60000 })

  const totals = useMemo(() => {
    const target = goals.reduce((sum, g) => sum + g.targetAmount, 0)
    const current = goals.reduce((sum, g) => sum + g.currentAmount, 0)
    return { target, current, count: goals.length }
  }, [goals])

  const savings = useMemo(() => getSavingsRate(transactions), [transactions])

  if (totals.count === 0) return null

  const progressPct = totals.target > 0 ? Math.min(100, (totals.current / totals.target) * 100) : 0
  const remaining = Math.max(0, totals.target - totals.current)
  const tone =
    progressPct >= 80 ? 'var(--accent)' :
    progressPct >= 50 ? 'var(--gold)' : 'var(--accent-light)'

  return (
    <section className="space-y-2">
      <DashboardSectionHeader title="Target Tabungan" />
      <div className="glass-card p-4 space-y-3" style={{ borderRadius: dashboardRadius.cardSm }}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: 'var(--accent-dim)' }}>
            <Target size={18} style={{ color: 'var(--accent)' }} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium" style={{ color: dashboardColors.muted }}>{totals.count} target aktif</p>
            <p className="truncate text-sm font-bold leading-tight" style={{ color: dashboardColors.text }}>
              {progressPct >= 100 ? 'Seluruh target tercapai 🎉' : `Sisa ${formatCurrency(remaining).replace(/\s/g, '')}`}
            </p>
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <p className="text-lg font-bold" style={{ color: tone }}>
              {formatCurrency(totals.current).replace(/\s/g, '')}
            </p>
            <p className="text-[11px]" style={{ color: dashboardColors.muted }}>
              dari {formatCurrency(totals.target).replace(/\s/g, '')}
            </p>
          </div>
          <div className="h-2 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, var(--accent-light), ${tone})` }} />
          </div>
          <p className="mt-1 text-[10px]" style={{ color: dashboardColors.muted }}>{progressPct.toFixed(0)}% tercapai</p>
        </div>

        <div className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: 'rgba(34,197,94,0.06)' }}>
          <div>
            <p className="text-[10px]" style={{ color: dashboardColors.muted }}>Bulan ini</p>
            <p className="text-sm font-bold" style={{ color: savings.saved >= 0 ? 'var(--accent)' : 'var(--red)' }}>
              {savings.saved >= 0 ? '+' : '-'}{formatCurrency(Math.abs(savings.saved)).replace(/\s/g, '')}
            </p>
          </div>
          <p className="text-[10px] text-right" style={{ color: dashboardColors.muted }}>
            Rate {savings.rate.toFixed(0)}%
            <br />
            <span className="text-[9px] opacity-70">{savings.status === 'excellent' ? 'luar biasa' : savings.status === 'good' ? 'bagus' : savings.status === 'low' ? 'kurangi' : 'minus'}</span>
          </p>
        </div>

        <Link href="/goals" className="flex items-center justify-center gap-1 py-2 text-xs font-semibold" style={{ color: 'var(--accent)', background: 'var(--accent-dim)' }}>
          Kelola target <ChevronRight size={13} />
        </Link>
      </div>
    </section>
  )
}