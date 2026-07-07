'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { Transaction, BudgetStatus } from '@/types'
import { getBudgetPace, type PaceStatus } from '@/lib/budget-pace'
import { DashboardSectionHeader } from './DashboardSectionHeader'
import { dashboardColors, dashboardRadius } from './dashboardTokens'

interface Props {
  transactions: Transaction[]
  budgets: BudgetStatus[]
}

const TONE: Record<PaceStatus, { bg: string; border: string; text: string }> = {
  critical:   { bg: 'rgba(251,113,133,0.10)', border: 'rgba(251,113,133,0.28)', text: '#FB7185' },
  over_pace:  { bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.28)',  text: '#FBBF24' },
  warn:       { bg: 'rgba(45,212,191,0.10)',  border: 'rgba(45,212,191,0.24)',  text: '#2DD4BF' },
  on_track:   { bg: 'rgba(34,197,94,0.10)',   border: 'rgba(34,197,94,0.22)',   text: '#4ADE80' },
  no_data:    { bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.22)', text: '#94A3B8' },
}

export function BudgetPaceGuard({ transactions, budgets }: Props) {
  const now = useMemo(() => new Date(), [])
  const paces = useMemo(() => getBudgetPace(budgets, transactions, now), [budgets, transactions, now])
  const actionable = useMemo(() => paces.filter((p) => ['critical', 'over_pace', 'warn'].includes(p.status)), [paces])

  if (actionable.length === 0) return null

  const first = actionable[0]
  const tone = TONE[first.status]

  return (
    <section className="space-y-2">
      <DashboardSectionHeader title="Budget" />
      <div className="glass-card overflow-hidden" style={{ borderRadius: dashboardRadius.cardSm }}>
        {actionable.slice(0, 2).map((p, i) => {
          const pTone = TONE[p.status]
          return (
            <div key={p.budgetId} className="flex items-center gap-2.5 px-3.5 py-3" style={{ borderBottom: i < 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: pTone.bg, color: pTone.text }}>
                <span className="text-base">{p.categoryIcon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[13px] font-semibold leading-tight" style={{ color: dashboardColors.text }}>{p.categoryName}</p>
                  <p className="shrink-0 text-[11px] font-bold" style={{ color: pTone.text }}>{p.projectedOver > 0 ? `+${p.projectedOver.toLocaleString('id-ID')}` : 'On-track'}</p>
                </div>
                <p className="mt-1 line-clamp-1 text-[11px] leading-snug" style={{ color: dashboardColors.muted }}>{p.message}</p>
              </div>
            </div>
          )
        })}
        <Link
          href="/goals?tab=budget"
          className="flex items-center justify-center gap-1 py-2.5 text-xs font-semibold"
          style={{ color: tone.text, background: tone.bg }}
        >
          Atur budget <ChevronRight size={13} />
        </Link>
      </div>
    </section>
  )
}
