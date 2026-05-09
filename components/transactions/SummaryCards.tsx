'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { isExpenseForSummary } from '@/lib/transaction-rules'
import type { Transaction, TransactionFilters } from '@/types'

interface Props {
  allTransactions: Transaction[]
  filters: TransactionFilters
  setFilters: (f: TransactionFilters) => void
  hidden?: boolean
}

const MASKED_AMOUNT = '••••••'

function getActiveMonth(month?: string) {
  if (month) return month
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getDisplayAmount(value: number, hidden: boolean, showSign = false) {
  if (hidden) return MASKED_AMOUNT
  const sign = showSign && value < 0 ? '-' : ''
  return `${sign}${formatCurrency(Math.abs(value))}`
}

export function SummaryCards({ allTransactions, filters, setFilters, hidden = false }: Props) {
  const activeMonth = useMemo(() => getActiveMonth(filters.month), [filters.month])

  const monthStats = useMemo(() => {
    const txs = allTransactions.filter(t => t.date?.startsWith(activeMonth))
    const income = txs
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
    const expense = txs
      .filter(isExpenseForSummary)
      .reduce((sum, t) => sum + t.amount, 0)

    return { income, expense, balance: income - expense }
  }, [allTransactions, activeMonth])

  const cards = [
    {
      key: 'income',
      label: 'Pemasukan',
      subLabel: 'Bulan ini',
      value: monthStats.income,
      icon: TrendingUp,
      color: 'var(--income)',
      bg: 'rgba(34,197,94,0.10)',
      border: 'rgba(34,197,94,0.24)',
      active: filters.type === 'income',
      type: 'income' as const,
    },
    {
      key: 'expense',
      label: 'Pengeluaran',
      subLabel: 'Bulan ini',
      value: monthStats.expense,
      icon: TrendingDown,
      color: 'var(--expenseNormal)',
      bg: 'rgba(248,113,113,0.10)',
      border: 'rgba(248,113,113,0.22)',
      active: filters.type === 'expense',
      type: 'expense' as const,
    },
    {
      key: 'balance',
      label: 'Saldo',
      subLabel: 'Bulan ini',
      value: monthStats.balance,
      icon: Wallet,
      color: monthStats.balance >= 0 ? 'var(--income)' : 'var(--warning)',
      bg: monthStats.balance >= 0 ? 'rgba(34,197,94,0.10)' : 'rgba(251,191,36,0.10)',
      border: monthStats.balance >= 0 ? 'rgba(34,197,94,0.24)' : 'rgba(251,191,36,0.22)',
      active: !filters.type,
      type: undefined,
    },
  ]

  function handleClick(type: 'income' | 'expense' | undefined) {
    if (!type) {
      setFilters({ ...filters, type: undefined })
      return
    }

    setFilters({ ...filters, type: filters.type === type ? undefined : type })
  }

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1">
      <div className="grid min-w-[336px] grid-cols-3 gap-2.5">
        {cards.map((card, index) => {
          const Icon = card.icon

          return (
            <motion.button
              key={card.key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleClick(card.type)}
              className="min-h-[72px] rounded-2xl px-3 py-2.5 text-left"
              style={{
                background: card.active ? card.bg : 'var(--surface-2)',
                border: `1px solid ${card.active ? card.border : 'var(--border)'}`,
                boxShadow: card.active
                  ? `0 8px 24px ${card.border}`
                  : '0 2px 10px rgba(0,0,0,0.14)',
              }}
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold leading-none" style={{ color: 'var(--text-muted)' }}>
                  {card.label}
                </p>
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-lg"
                  style={{ background: card.bg, color: card.color }}
                >
                  <Icon size={12} strokeWidth={2.3} />
                </div>
              </div>
              <p
                className="truncate text-[13px] font-bold leading-tight"
                style={{ color: hidden ? 'var(--text-muted)' : card.color, letterSpacing: hidden ? 2 : 0 }}
              >
                {getDisplayAmount(card.value, hidden, card.key === 'balance')}
              </p>
              <p className="mt-1 text-[10px] font-medium leading-none" style={{ color: 'var(--text-muted)' }}>
                {card.subLabel}
              </p>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
