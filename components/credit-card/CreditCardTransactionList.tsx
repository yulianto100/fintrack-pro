'use client'

import { useMemo }          from 'react'
import { motion }           from 'framer-motion'
import { useApiList }       from '@/hooks/useApiData'
import type { Transaction } from '@/types'

interface Props {
  creditCardId: string
  hidden?: boolean
}

/** Map category/description keywords to emoji icons */
function categoryIcon(tx: Transaction): string {
  const text = `${tx.description || ''} ${tx.categoryName || ''}`.toLowerCase()
  if (text.match(/netflix|disney|spotify|youtube|prime|hiburan|entertainment/)) return '🎬'
  if (text.match(/health|sehat|apotek|dokter|rumah sakit|medical|klinik/))      return '🏥'
  if (text.match(/makan|restoran|food|cafe|kopi|coffee|lunch|dinner/))          return '🍽️'
  if (text.match(/belanja|shop|tokopedia|shopee|lazada|bukalapak/))              return '🛍️'
  if (text.match(/transport|gojek|grab|taxi|uber|bensin|bbm|parkir/))           return '🚗'
  if (text.match(/listrik|pln|air|pdam|telpon|internet|pulsa/))                 return '💡'
  if (text.match(/gym|fitness|olahraga|sport/))                                 return '💪'
  if (text.match(/travel|hotel|pesawat|tiket|liburan/))                         return '✈️'
  if (text.match(/pendidikan|kursus|buku|school|edu/))                          return '📚'
  return tx.categoryIcon || '💳'
}

/** Detect recurring/subscription-like transactions */
function isRecurring(tx: Transaction): boolean {
  const text = `${tx.description || ''} ${tx.categoryName || ''}`.toLowerCase()
  return !!(
    tx.tags?.includes('recurring') ||
    text.match(/netflix|spotify|disney|youtube|prime|icloud|apple|google|subscription|langganan|bulanan/)
  )
}

/** Detect entertainment for badge */
function isEntertainment(tx: Transaction): boolean {
  const text = `${tx.description || ''} ${tx.categoryName || ''}`.toLowerCase()
  return !!text.match(/netflix|disney|spotify|youtube|prime|hiburan/)
}

export function CreditCardTransactionList({ creditCardId, hidden = false }: Props) {
  const { data: allTx, loading } = useApiList<Transaction>('/api/transactions', { refreshMs: 15000 })

  const transactions = useMemo(() =>
    allTx
      .filter(
        (tx) =>
          tx.paymentMethod === 'credit_card' &&
          tx.creditCardId  === creditCardId   &&
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
      <div className="space-y-2.5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton h-[68px] rounded-2xl" />
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div
        className="rounded-2xl p-10 flex flex-col items-center gap-3 text-center"
        style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}
      >
        <span className="text-3xl">💳</span>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Belum Ada Transaksi</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Transaksi menggunakan kartu ini akan muncul di sini
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx, i) => {
        const recurring = isRecurring(tx)
        const icon      = categoryIcon(tx)
        const catName   = tx.categoryName || (isEntertainment(tx) ? 'Hiburan' : 'Kartu Kredit')

        return (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.035 }}
            className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl"
            style={{
              background: 'var(--surface-card)',
              border:     '1px solid var(--border)',
            }}
          >
            {/* Category icon bubble */}
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-[18px]"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.10)' }}
            >
              {icon}
            </div>

            {/* Description + date + badges */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-space)' }}>
                  {tx.description || tx.categoryName || 'Transaksi'}
                </p>
                {recurring && (
                  <span
                    className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider flex-shrink-0"
                    style={{
                      background: 'rgba(99,102,241,0.10)',
                      color:      '#818cf8',
                      border:     '1px solid rgba(99,102,241,0.20)',
                    }}
                  >
                    RECURRING
                  </span>
                )}
              </div>
              <p className="text-[11px] mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <span>
                  {tx.date
                    ? new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—'
                  }
                </span>
                <span style={{ color: 'var(--border)' }}>•</span>
                <span
                  className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold"
                  style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}
                >
                  {catName}
                </span>
              </p>
            </div>

            {/* Amount */}
            <div className="text-right flex-shrink-0">
              <p className="text-[13px] font-bold" style={{ color: '#ef4444', fontFamily: 'var(--font-jetbrains)' }}>
                -{fmt(tx.amount)}
              </p>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
