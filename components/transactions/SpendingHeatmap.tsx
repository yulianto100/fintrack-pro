'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { isExpenseForSummary } from '@/lib/transaction-rules'
import type { Transaction } from '@/types'

interface Props {
  transactions: Transaction[]
  hidden?: boolean
  selectedDate?: string
  onSelectDate?: (date: string | undefined) => void
  weeks?: number
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildDateGrid(weeks: number) {
  const days: string[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const start = new Date(today)
  start.setDate(start.getDate() - (weeks * 7 - 1))
  const dayOfWeek = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - dayOfWeek)

  const cursor = new Date(start)
  while (cursor <= today) {
    days.push(toDateKey(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return days
}

export function SpendingHeatmap({
  transactions,
  hidden,
  selectedDate,
  onSelectDate,
  weeks = 8,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const days = useMemo(() => buildDateGrid(weeks), [weeks])
  const dailyTotals = useMemo(() => {
    const map = new Map<string, number>()

    for (const tx of transactions) {
      if (!isExpenseForSummary(tx)) continue
      const key = (tx.date || '').split('T')[0]
      if (!key) continue
      map.set(key, (map.get(key) || 0) + tx.amount)
    }

    return map
  }, [transactions])

  const p90 = useMemo(() => {
    const values = Array.from(dailyTotals.values())
      .filter((value) => value > 0)
      .sort((a, b) => a - b)

    if (values.length === 0) return 1
    const index = Math.max(0, Math.min(values.length - 1, Math.floor(values.length * 0.9)))
    return values[index] || 1
  }, [dailyTotals])

  const columns = useMemo(() => {
    const result: string[][] = []
    for (let i = 0; i < days.length; i += 7) result.push(days.slice(i, i + 7))
    return result
  }, [days])

  const todayKey = toDateKey(new Date())

  const getCellColor = (amount: number) => {
    if (amount === 0) return 'var(--surface-2)'
    const ratio = Math.min(1, amount / p90)
    if (ratio >= 0.75) return 'var(--expenseStrong)'
    if (ratio >= 0.5) return 'var(--expenseNormal)'
    if (ratio >= 0.25) return 'var(--gold)'
    return 'var(--accent-dim)'
  }

  return (
    <section
      className="overflow-hidden rounded-2xl"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
    >
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <div className="text-left">
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            Aktivitas {weeks} minggu
          </p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Tap hari untuk filter
          </p>
        </div>
        <ChevronDown
          size={16}
          style={{
            color: 'var(--text-muted)',
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
          }}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-4 pb-4">
              <div className="-mx-4 overflow-x-auto px-4" style={{ scrollbarWidth: 'none' }}>
                <div className="flex gap-1" style={{ minWidth: columns.length * 16 }}>
                  {columns.map((week, columnIndex) => (
                    <div key={columnIndex} className="flex flex-col gap-1">
                      {week.map((day) => {
                        const amount = dailyTotals.get(day) || 0
                        const isFuture = day > todayKey
                        const isSelected = selectedDate === day
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => onSelectDate?.(isSelected ? undefined : day)}
                            disabled={isFuture}
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: 3,
                              background: isFuture ? 'transparent' : getCellColor(amount),
                              border: isSelected ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,0.04)',
                              cursor: isFuture ? 'default' : 'pointer',
                              opacity: isFuture ? 0.3 : 1,
                            }}
                            title={`${day}${amount > 0 && !hidden ? `: ${formatCurrency(amount)}` : ''}`}
                            aria-label={`Filter tanggal ${day}`}
                          />
                        )
                      })}
                      {Array.from({ length: 7 - week.length }).map((_, index) => (
                        <div key={`pad-${index}`} style={{ width: 14, height: 14 }} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-2 flex items-center justify-end gap-1">
                <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Sedikit</span>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--accent-dim)' }} />
                <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--gold)' }} />
                <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--expenseNormal)' }} />
                <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--expenseStrong)' }} />
                <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Banyak</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
