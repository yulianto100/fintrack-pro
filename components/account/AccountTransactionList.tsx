'use client'

import { useMemo }          from 'react'
import { motion }           from 'framer-motion'
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight } from 'lucide-react'
import { useApiList }       from '@/hooks/useApiData'
import type { Transaction } from '@/types'

interface Props {
  accountId:  string
  accountType: 'bank' | 'ewallet'
  hidden?: boolean
  limit?: number
}

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
  if (text.match(/gaji|salary|income|masuk/))                                   return '💰'
  if (text.match(/transfer/))                                                   return '↔️'
  return tx.categoryIcon || '💳'
}

export function AccountTransactionList({ accountId, accountType, hidden = false, limit = 30 }: Props) {
  const { data: allTx, loading } = useApiList<Transaction>('/api/transactions', { refreshMs: 15000 })

  const transactions = useMemo(() =>
    allTx
      .filter(tx =>
        tx.walletAccountId === accountId ||
        tx.toWalletAccountId === accountId
      )
      .sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime())
      .slice(0, limit),
    [allTx, accountId, limit]
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
    const emptyConfig = {
      bank:    { emoji: '🏦', title: 'Belum ada transaksi di akun ini', sub: 'Transaksi rekening kamu akan muncul di sini.' },
      ewallet: { emoji: '👛', title: 'Belum ada aktivitas', sub: 'Top up dompetmu untuk mulai bertransaksi.' },
    }
    const cfg = emptyConfig[accountType] ?? emptyConfig.bank
    return (
      <div
        className="rounded-2xl py-10 px-6 flex flex-col items-center gap-2 text-center"
        style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}
      >
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1 text-2xl" style={{ background: 'var(--accent-dim)' }}>
          {cfg.emoji}
        </div>
        <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{cfg.title}</p>
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{cfg.sub}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx, i) => {
        const isIncome   = tx.type === 'income'
        const isTransfer = tx.type === 'transfer'
        const isOutgoing = tx.toWalletAccountId === accountId && tx.walletAccountId !== accountId
        const icon       = categoryIcon(tx)
        const catName    = tx.categoryName || (isIncome ? 'Pemasukan' : isTransfer ? 'Transfer' : 'Pengeluaran')

        // Determine sign: if this account is the destination of a transfer, it's incoming
        const amountColor =
          isIncome || (isTransfer && isOutgoing)
            ? '#22c55e'
            : '#ef4444'
        const amountPrefix =
          isIncome || (isTransfer && isOutgoing) ? '+' : '-'

        const IconComp =
          isIncome || (isTransfer && isOutgoing)
            ? ArrowDownLeft
            : isTransfer
            ? ArrowLeftRight
            : ArrowUpRight

        const iconBg =
          isIncome || (isTransfer && isOutgoing)
            ? 'rgba(34,197,94,0.10)'
            : isTransfer
            ? 'rgba(99,102,241,0.10)'
            : 'rgba(239,68,68,0.08)'

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
            {/* Icon bubble */}
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-[18px]"
              style={{ background: iconBg }}
            >
              {icon}
            </div>

            {/* Description + date + badge */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-space)' }}>
                {tx.description || tx.categoryName || 'Transaksi'}
              </p>
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
                  style={{
                    background: iconBg,
                    color: amountColor,
                  }}
                >
                  {catName}
                </span>
              </p>
            </div>

            {/* Amount */}
            <div className="text-right flex-shrink-0">
              <p className="text-[13px] font-bold" style={{ color: amountColor, fontFamily: 'var(--font-jetbrains)' }}>
                {amountPrefix}{fmt(tx.amount)}
              </p>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
