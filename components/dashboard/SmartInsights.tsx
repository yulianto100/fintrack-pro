'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import type { Transaction, GoldHolding, StockHolding, Deposit, Insight, BudgetStatus } from '@/types'
import { generateAllInsights } from '@/lib/insight-engine'

interface Props {
  transactions: Transaction[]
  goldHoldings: GoldHolding[]
  stocks:       StockHolding[]
  deposits:     Deposit[]
  totalWealth:  number
  goldValue:    number
  stockValue?:  number
  walletTotal?: number
  budgets?:     BudgetStatus[]
}

function toKey(title: string): string {
  return 'insight_dismissed_' + title.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 60)
}

const STYLE: Record<string, { bg: string; border: string; text: string }> = {
  warning: { bg: 'rgba(252,129,129,0.06)', border: 'rgba(252,129,129,0.20)', text: '#F87171' },
  info:    { bg: 'rgba(99,179,237,0.06)',  border: 'rgba(99,179,237,0.20)',  text: '#63b3ed' },
  success: { bg: 'rgba(34,197,94,0.06)',  border: 'rgba(34,197,94,0.16)', text: '#22C55E' },
}

const STORAGE_KEY = 'finuvo_dismissed_insights'
function loadDismissed(): Set<string> {
  try { const r = localStorage.getItem(STORAGE_KEY); return new Set(r ? JSON.parse(r) : []) } catch { return new Set() }
}
function saveDismissed(s: Set<string>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...s])) } catch { /* noop */ }
}

export function SmartInsights(props: Props) {
  const allInsights = useMemo(() => generateAllInsights(props), [props])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => { setDismissed(loadDismissed()) }, [])

  const dismiss = useCallback((title: string) => {
    setDismissed((prev) => {
      const next = new Set(prev); next.add(toKey(title)); saveDismissed(next); return next
    })
  }, [])

  const visible = useMemo(
    () => allInsights.filter((ins) => !dismissed.has(toKey(ins.title))),
    [allInsights, dismissed]
  )

  const hiddenCount = allInsights.length - visible.length

  const restoreAll = useCallback(() => {
    const next = new Set(dismissed)
    allInsights.forEach((ins) => next.delete(toKey(ins.title)))
    setDismissed(next); saveDismissed(next)
  }, [dismissed, allInsights])

  if (allInsights.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>INSIGHTS</p>
        {hiddenCount > 0 && hiddenCount === allInsights.length && (
          <button onClick={restoreAll}
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid rgba(34,197,94,0.16)' }}>
            Tampilkan ({hiddenCount})
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {visible.map((ins) => {
          const s = STYLE[ins.type]
          return (
            <motion.div key={ins.title} layout
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0, scale: 0.97, transition: { duration: 0.2 } }}
              transition={{ duration: 0.22, ease: 'easeOut' }} className="overflow-hidden">
              <div className="flex items-start gap-3 p-3.5 rounded-2xl relative"
                style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                <span className="text-xl flex-shrink-0 mt-0.5">{ins.icon}</span>
                <div className="flex-1 min-w-0 pr-5">
                  <p className="text-sm font-semibold leading-tight" style={{ color: s.text }}>{ins.title}</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{ins.message}</p>
                </div>
                <button onClick={() => dismiss(ins.title)} aria-label="Tutup"
                  className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center transition-all"
                  style={{ background: s.border, color: s.text, opacity: 0.7 }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}>
                  <X size={10} strokeWidth={2.5} />
                </button>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>

      {hiddenCount > 0 && hiddenCount < allInsights.length && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end px-1">
          <button onClick={restoreAll} className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
            + {hiddenCount} insight disembunyikan · Tampilkan
          </button>
        </motion.div>
      )}
    </div>
  )
}
