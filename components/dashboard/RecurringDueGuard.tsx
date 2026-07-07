'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { CalendarClock, ChevronRight } from 'lucide-react'
import { useApiList } from '@/hooks/useApiData'
import type { RecurringTransaction } from '@/types'
import { getRecurringDue } from '@/lib/recurring-guard'
import { formatCurrency } from '@/lib/utils'
import { DashboardSectionHeader } from './DashboardSectionHeader'
import { dashboardColors, dashboardRadius } from './dashboardTokens'

const TONE = {
  overdue:  { bg: 'rgba(251,113,133,0.10)', border: 'rgba(251,113,133,0.26)', text: '#FB7185' },
  due:      { bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.26)',  text: '#FBBF24' },
  upcoming: { bg: 'rgba(45,212,191,0.10)',  border: 'rgba(45,212,191,0.22)',  text: '#2DD4BF' },
}

export function RecurringDueGuard() {
  const { data: recurring } = useApiList<RecurringTransaction>('/api/recurring-transactions', { refreshMs: 60000 })
  const now = useMemo(() => new Date(), [])
  const due = useMemo(() => getRecurringDue(recurring, now), [recurring, now])

  if (due.length === 0) return null

  const first = due[0]
  const tone = TONE[first.status]

  return (
    <section className="space-y-2">
      <DashboardSectionHeader title="Jatuh Tempo" />
      <div className="glass-card overflow-hidden" style={{ borderRadius: dashboardRadius.cardSm }}>
        {due.slice(0, 2).map((item, i) => {
          const itemTone = TONE[item.status]
          const amountTone = item.type === 'income' ? dashboardColors.income : dashboardColors.expense
          return (
            <div key={item.id} className="flex items-center gap-2.5 px-3.5 py-3" style={{ borderBottom: i < Math.min(due.length, 2) - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: itemTone.bg, color: itemTone.text }}>
                {item.categoryIcon ? <span className="text-base">{item.categoryIcon}</span> : <CalendarClock size={17} strokeWidth={2.2} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[13px] font-semibold leading-tight" style={{ color: dashboardColors.text }}>{item.description}</p>
                  <p className="shrink-0 text-[11px] font-bold" style={{ color: amountTone }}>{formatCurrency(item.amount).replace(/\s/g, '')}</p>
                </div>
                <p className="mt-1 line-clamp-1 text-[11px] leading-snug" style={{ color: dashboardColors.muted }}>
                  {item.daysLabel} · {item.categoryName || 'Transaksi berulang'}
                </p>
              </div>
            </div>
          )
        })}
        <Link
          href="/settings?section=recurring"
          className="flex items-center justify-center gap-1 py-2.5 text-xs font-semibold"
          style={{ color: tone.text, background: tone.bg, borderTop: `1px solid ${tone.border}` }}
        >
          Kelola recurring <ChevronRight size={13} />
        </Link>
      </div>
    </section>
  )
}