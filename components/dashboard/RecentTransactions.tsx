'use client'

import { formatCurrency, formatDate } from '@/lib/utils'
import type { Transaction } from '@/types'

interface Props {
  transactions: Transaction[]
  hidden?: boolean
}

export function RecentTransactions({ transactions, hidden = false }: Props) {
  if (transactions.length === 0) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-2xl mb-2">📭</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Belum ada transaksi</p>
      </div>
    )
  }

  return (
    <div className="glass-card divide-y" style={{ borderColor: 'transparent' }}>
      {transactions.map((t, i) => (
        <div
          key={t.id}
          className="flex items-center gap-3 p-3"
          style={{ borderBottom: i < transactions.length - 1 ? '1px solid var(--border)' : 'none' }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
            style={{
              background:
                t.type === 'income'  ? 'var(--accent-dim)' :
                t.type === 'expense' ? 'var(--red-dim)'    : 'var(--blue-dim)',
            }}
          >
            {t.categoryIcon || (t.type === 'income' ? '💰' : t.type === 'expense' ? '💸' : '🔄')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {t.description || t.categoryName || 'Transaksi'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {t.categoryName} · {formatDate(t.date, 'dd MMM')}
            </p>
          </div>
          <p
            className="text-sm font-bold font-mono flex-shrink-0"
            style={{
              color: hidden
                ? 'var(--text-muted)'
                : t.type === 'income'  ? 'var(--accent)'
                : t.type === 'expense' ? 'var(--red)' : 'var(--blue)',
            }}
          >
            {hidden
              ? '••••••'
              : `${t.type === 'income' ? '+' : t.type === 'expense' ? '-' : '⇄ '}${formatCurrency(t.amount)}`
            }
          </p>
        </div>
      ))}
    </div>
  )
}
