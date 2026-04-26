'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { BudgetStatus } from '@/types'
import { formatCurrency } from '@/lib/utils'

export function BudgetProgress({ budgets }: { budgets: BudgetStatus[] }) {
  const active = budgets.filter((b) => b.percent > 0)
  if (active.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-2 px-1">
        <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>BUDGET BULAN INI</p>
        <Link href="/settings?tab=budget" className="flex items-center gap-1 text-xs" style={{ color: 'var(--accent)' }}>
          Kelola <ArrowRight size={12} />
        </Link>
      </div>
      <div className="glass-card p-4 space-y-3">
        {active.slice(0, 4).map((b) => {
          const over    = b.percent >= 100
          const warning = b.percent >= 80
          const color   = over ? 'var(--red)' : warning ? '#f97316' : 'var(--accent)'
          const bg      = over ? 'rgba(239,68,68,0.12)' : warning ? 'rgba(249,115,22,0.12)' : 'rgba(34,197,94,0.10)'

          return (
            <div key={b.id}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{b.categoryIcon || '📋'}</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                    {b.categoryName || 'Kategori'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {formatCurrency(b.spent)} / {formatCurrency(b.limitAmount)}
                  </span>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                    style={{ background: bg, color }}
                  >
                    {b.percent.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.90)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(b.percent, 100)}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: color }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
