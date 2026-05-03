'use client'

import { formatCurrency, formatDate } from '@/lib/utils'
import { getTransactionMethodLabel, isExpenseForSummary } from '@/lib/transaction-rules'
import type { Transaction } from '@/types'

interface Props {
  transactions: Transaction[]
  hidden?: boolean
}

export function RecentTransactions({ transactions, hidden = false }: Props) {
  if (transactions.length === 0) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-2xl mb-2">-</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Belum ada transaksi</p>
      </div>
    )
  }

  return (
    <div className="glass-card divide-y" style={{ borderColor: 'transparent' }}>
      {transactions.map((t, i) => {
        const isIncome = t.type === 'income'
        const isExpense = isExpenseForSummary(t)
        const methodLabel = getTransactionMethodLabel(t)

        return (
          <div
            key={t.id}
            className="flex items-center gap-3 p-3"
            style={{ borderBottom: i < transactions.length - 1 ? '1px solid var(--border)' : 'none' }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
              style={{
                background:
                  isIncome  ? 'var(--accent-dim)' :
                  isExpense ? 'var(--red-dim)'    : 'var(--blue-dim)',
              }}
            >
              {t.categoryIcon || (isIncome ? '+' : isExpense ? '-' : '<>')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {t.description || t.categoryName || 'Transaksi'}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {methodLabel || t.categoryName || 'Transaksi'} - {formatDate(t.date, 'dd MMM')}
              </p>
            </div>
            <p
              className="text-sm font-bold font-mono flex-shrink-0"
              style={{
                color: hidden
                  ? 'var(--text-muted)'
                  : isIncome  ? 'var(--accent)'
                  : isExpense ? 'var(--red)' : 'var(--blue)',
              }}
            >
              {hidden
                ? '******'
                : `${isIncome ? '+' : isExpense ? '-' : '<> '}${formatCurrency(t.amount)}`
              }
            </p>
          </div>
        )
      })}
    </div>
  )
}
