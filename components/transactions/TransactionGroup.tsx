'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { formatCurrency } from '@/lib/utils'
import type { Transaction } from '@/types'

interface TransactionItemProps {
  transaction: Transaction
  hidden?: boolean
  onEdit: (t: Transaction) => void
  onDelete: (id: string) => void
}

// Forwarded from parent — render one transaction row
// (keep exact same visual as existing TransactionItem / RecentTransactions rows)
function TransactionRow({ transaction: t, hidden, onEdit, onDelete }: TransactionItemProps) {
  const isExpense  = t.type === 'expense'
  const isTransfer = t.type === 'transfer'
  const color = isTransfer ? 'var(--blue)' : isExpense ? 'var(--red)' : 'var(--accent)'
  const sign  = isExpense ? '-' : isTransfer ? '⇄' : '+'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 6 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.15 }}
      onClick={() => onEdit(t)}
      className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors rounded-xl"
      style={{
        background: 'transparent',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Category emoji / icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
        style={{ background: `${color}14` }}
      >
        {t.categoryIcon || (isTransfer ? '↔️' : isExpense ? '💸' : '💰')}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {t.categoryName || (isTransfer ? 'Transfer' : 'Transaksi')}
        </p>
        {t.description && (
          <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {t.description}
          </p>
        )}
      </div>

      {/* Amount */}
      <p className="text-sm font-bold font-mono flex-shrink-0" style={{ color }}>
        {hidden ? '••••' : `${sign}${formatCurrency(t.amount)}`}
      </p>
    </motion.div>
  )
}

// ── Date label helper ────────────────────────────────────────────────────────

function getDateLabel(dateStr: string): string {
  const today     = new Date(); today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const d         = new Date(dateStr); d.setHours(0, 0, 0, 0)

  if (d.getTime() === today.getTime())     return 'Hari ini'
  if (d.getTime() === yesterday.getTime()) return 'Kemarin'

  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

// ── Main grouped list ────────────────────────────────────────────────────────

interface Props {
  transactions: Transaction[]
  hidden?: boolean
  onEdit: (t: Transaction) => void
  onDelete: (id: string) => void
}

interface DayGroup {
  dateKey: string
  label:   string
  items:   Transaction[]
  total:   number  // negative = net expense, positive = net income
}

export function TransactionGroup({ transactions, hidden, onEdit, onDelete }: Props) {
  const groups = useMemo<DayGroup[]>(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of transactions) {
      const key = t.date?.split('T')[0] ?? 'unknown'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a)) // newest first
      .map(([dateKey, items]) => {
        const total = items.reduce((sum, t) => {
          if (t.type === 'income')   return sum + t.amount
          if (t.type === 'expense')  return sum - t.amount
          return sum // transfer = neutral for this calc
        }, 0)
        return { dateKey, label: getDateLabel(dateKey), items, total }
      })
  }, [transactions])

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group, gi) => {
        const isPositive = group.total >= 0
        const totalColor = isPositive ? 'var(--accent)' : 'var(--red)'

        return (
          <motion.div
            key={group.dateKey}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: gi * 0.03, duration: 0.18 }}
          >
            {/* Sticky date header */}
            <div
              className="flex items-center justify-between px-1 mb-1 py-1.5"
              style={{
                position:   'sticky',
                top:        0,
                zIndex:     10,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
            >
              <p className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                {group.label}
              </p>
              {/* Daily total */}
              <p className="text-[11px] font-semibold font-mono" style={{ color: totalColor }}>
                {hidden
                  ? '••••'
                  : `${isPositive ? '+' : ''}${formatCurrency(group.total)}`
                }
              </p>
            </div>

            {/* Transactions for this day */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'var(--surface-2)',
                border:     '1px solid var(--border)',
                boxShadow:  '0 8px 30px rgba(0,0,0,0.25)',
              }}
            >
              {group.items.map((t, ti) => (
                <div
                  key={t.id}
                  style={ti < group.items.length - 1
                    ? { borderBottom: '1px solid rgba(255,255,255,0.04)' }
                    : undefined}
                >
                  <TransactionRow
                    transaction={t}
                    hidden={hidden}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
