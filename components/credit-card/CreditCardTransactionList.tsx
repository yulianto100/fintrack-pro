'use client'

import { useMemo }  from 'react'
import { motion }   from 'framer-motion'
import { ArrowDownCircle } from 'lucide-react'
import { useApiList }      from '@/hooks/useApiData'
import type { Transaction } from '@/types'

interface Props {
  creditCardId: string
  hidden?: boolean
}

export function CreditCardTransactionList({ creditCardId, hidden = false }: Props) {
  const { data: allTx, loading } = useApiList<Transaction>('/api/transactions', { refreshMs: 15000 })

  const transactions = useMemo(() =>
    allTx
      .filter(
        (tx) =>
          tx.paymentMethod === 'credit_card' &&
          tx.creditCardId  === creditCardId   &&
          // Exclude payment transactions tagged with cc_ prefix
          !tx.tags?.includes('credit_card_payment')
      )
      .sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime())
      .slice(0, 30),
    [allTx, creditCardId]
  )

  const fmt = (n: number) =>
    hidden ? '••••••' : `Rp ${n.toLocaleString('id-ID')}`

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton h-16 rounded-2xl" />
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div
        className="rounded-2xl p-8 flex flex-col items-center gap-3 text-center"
        style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}
      >
        <span className="text-3xl">💳</span>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Belum Ada Transaksi
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Transaksi menggunakan kartu ini akan muncul di sini
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx, i) => (
        <motion.div
          key={tx.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="flex items-center gap-3 p-3.5 rounded-2xl"
          style={{
            background: 'var(--surface-card)',
            border:     '1px solid var(--border)',
          }}
        >
          {/* Category icon */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
            style={{ background: 'rgba(239,68,68,0.10)' }}
          >
            {tx.categoryIcon || <ArrowDownCircle size={18} color="#ef4444" />}
          </div>

          {/* Description + date */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {tx.description || tx.categoryName || 'Transaksi'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {tx.date
                ? new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'
              }
              {tx.categoryName && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full text-[9px]"
                  style={{ background: 'rgba(239,68,68,0.10)', color: '#ef4444' }}>
                  {tx.categoryName}
                </span>
              )}
            </p>
          </div>

          {/* Amount */}
          <p className="text-sm font-bold font-mono flex-shrink-0" style={{ color: '#ef4444' }}>
            -{fmt(tx.amount)}
          </p>
        </motion.div>
      ))}
    </div>
  )
}
