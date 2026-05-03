'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { isExpenseForSummary } from '@/lib/transaction-rules'
import type { Transaction, TransactionFilters } from '@/types'

interface Props {
  transactions: Transaction[]   // current period (filtered by month, etc.)
  allTransactions: Transaction[] // full unfiltered list for prev-period calc
  filters: TransactionFilters
  setFilters: (f: TransactionFilters) => void
}

function getPrevMonth(yyyyMM: string) {
  const [y, m] = yyyyMM.split('-').map(Number)
  const d = new Date(y, m - 2, 1) // month is 0-indexed, -2 = previous month
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return null
  return ((curr - prev) / prev) * 100
}

export function SummaryCards({ transactions, allTransactions, filters, setFilters }: Props) {
  // Determine active month — default to current month if no filter set
  const activeMonth = useMemo(() => {
    if (filters.month) return filters.month
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [filters.month])

  const prevMonth = useMemo(() => getPrevMonth(activeMonth), [activeMonth])

  const curr = useMemo(() => {
    const txs = allTransactions.filter(t => t.date?.startsWith(activeMonth))
    const income  = txs.filter(t => t.type === 'income') .reduce((s, t) => s + t.amount, 0)
    const expense = txs.filter(isExpenseForSummary).reduce((s, t) => s + t.amount, 0)
    return { income, expense, balance: income - expense }
  }, [allTransactions, activeMonth])

  const prev = useMemo(() => {
    const txs = allTransactions.filter(t => t.date?.startsWith(prevMonth))
    const income  = txs.filter(t => t.type === 'income') .reduce((s, t) => s + t.amount, 0)
    const expense = txs.filter(isExpenseForSummary).reduce((s, t) => s + t.amount, 0)
    return { income, expense, balance: income - expense }
  }, [allTransactions, prevMonth])

  const incomeChg  = pctChange(curr.income,  prev.income)
  const expenseChg = pctChange(curr.expense, prev.expense)
  const balanceChg = pctChange(curr.balance, Math.abs(prev.balance))

  function handleClick(type: 'income' | 'expense' | undefined) {
    if (!type) {
      // Saldo → show all, clear type filter
      setFilters({ ...filters, type: undefined })
    } else {
      // Toggle: if already filtering this type, clear it
      setFilters({ ...filters, type: filters.type === type ? undefined : type })
    }
  }

  const cards = [
    {
      key:    'income',
      label:  'Pemasukan',
      value:  curr.income,
      prev:   prev.income,
      pct:    incomeChg,
      icon:   TrendingUp,
      color:  'var(--accent)',
      bg:     'rgba(34,197,94,0.08)',
      border: 'rgba(34,197,94,0.18)',
      active: filters.type === 'income',
      type:   'income' as const,
      positiveIsGood: true,
    },
    {
      key:    'expense',
      label:  'Pengeluaran',
      value:  curr.expense,
      prev:   prev.expense,
      pct:    expenseChg,
      icon:   TrendingDown,
      color:  'var(--red)',
      bg:     'rgba(239,68,68,0.08)',
      border: 'rgba(239,68,68,0.18)',
      active: filters.type === 'expense',
      type:   'expense' as const,
      positiveIsGood: false, // spending going up is bad
    },
    {
      key:    'balance',
      label:  'Saldo',
      value:  curr.balance,
      prev:   prev.balance,
      pct:    balanceChg,
      icon:   Wallet,
      color:  curr.balance >= 0 ? 'var(--accent)' : 'var(--red)',
      bg:     curr.balance >= 0 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
      border: curr.balance >= 0 ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.18)',
      active: !filters.type,
      type:   undefined,
      positiveIsGood: true,
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {cards.map((card, i) => {
        const Icon = card.icon
        const isUp = (card.pct ?? 0) >= 0
        // For expense, up is bad; for others, up is good
        const isPositive = card.positiveIsGood ? isUp : !isUp
        const pctColor = isPositive ? 'var(--accent)' : 'var(--red)'

        return (
          <motion.button
            key={card.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => handleClick(card.type)}
            className="flex flex-col items-start p-3 rounded-2xl text-left w-full"
            style={{
              background:  card.active ? card.bg : 'var(--surface-2)',
              border:      `1px solid ${card.active ? card.border : 'var(--border)'}`,
              boxShadow:   card.active
                ? `0 8px 30px ${card.color}22`
                : '0 2px 8px rgba(0,0,0,0.15)',
              transition:  'all 0.18s ease',
            }}
          >
            {/* Icon */}
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center mb-2"
              style={{ background: card.bg, color: card.color }}
            >
              <Icon size={14} strokeWidth={2.2} />
            </div>

            {/* Label */}
            <p className="text-[9px] font-semibold uppercase tracking-wide mb-0.5"
              style={{ color: 'var(--text-muted)' }}>
              {card.label}
            </p>

            {/* Value */}
            <p className="text-[11px] font-bold font-mono leading-tight"
              style={{ color: card.color }}>
              {formatCurrency(Math.abs(card.value))}
            </p>

            {/* Period + change */}
            <p className="text-[8px] mt-1" style={{ color: 'var(--text-muted)' }}>
              Bulan ini
            </p>
            {card.pct !== null && (
              <p className="text-[8px] font-semibold mt-0.5" style={{ color: pctColor }}>
                {isUp ? '↑' : '↓'} {Math.abs(card.pct).toFixed(0)}% vs bln lalu
              </p>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}
