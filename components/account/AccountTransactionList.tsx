'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  Briefcase,
  CreditCard,
  Landmark,
  ShoppingBag,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { useApiList } from '@/hooks/useApiData'
import type { Transaction } from '@/types'

interface Props {
  accountId: string
  accountType: 'bank' | 'ewallet'
  hidden?: boolean
  limit?: number
}

type ToneName = 'income' | 'expense' | 'transfer' | 'investment'

interface TransactionTone {
  name: ToneName
  label: string
  color: string
  soft: string
  border: string
  Icon: typeof ArrowDownLeft
}

function formatCurrencyIDR(value: unknown, hidden = false): string {
  if (hidden) return 'Rp ••••••'
  const amount = Number(value)
  return `Rp ${Number.isFinite(amount) ? amount.toLocaleString('id-ID') : '0'}`
}

function formatTransactionDate(value?: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isInvestmentTransaction(tx: Transaction): boolean {
  const text = `${tx.description ?? ''} ${tx.categoryName ?? ''}`.toLowerCase()
  return /invest|saham|emas|reksadana|reksa dana|sbn|ori|sr0|st0|deposito|obligasi/.test(text)
}

function getTransactionTone(tx: Transaction, accountId: string): TransactionTone {
  const isTransfer = tx.type === 'transfer'
  const fromThisAccount = tx.walletAccountId === accountId
  const toThisAccount = tx.toWalletAccountId === accountId
  const incoming = tx.type === 'income' || (isTransfer && toThisAccount && !fromThisAccount)

  if (isTransfer) {
    return {
      name: 'transfer',
      label: incoming ? 'Transfer masuk' : 'Transfer keluar',
      color: '#2563eb',
      soft: 'rgba(37,99,235,0.09)',
      border: 'rgba(37,99,235,0.18)',
      Icon: ArrowLeftRight,
    }
  }

  if (!incoming && isInvestmentTransaction(tx)) {
    return {
      name: 'investment',
      label: 'Investasi',
      color: '#7c3aed',
      soft: 'rgba(124,58,237,0.09)',
      border: 'rgba(124,58,237,0.18)',
      Icon: TrendingUp,
    }
  }

  if (incoming) {
    return {
      name: 'income',
      label: 'Pemasukan',
      color: '#16a34a',
      soft: 'rgba(34,197,94,0.10)',
      border: 'rgba(34,197,94,0.18)',
      Icon: ArrowDownLeft,
    }
  }

  return {
    name: 'expense',
    label: 'Pengeluaran',
    color: '#ef4444',
    soft: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.18)',
    Icon: ArrowUpRight,
  }
}

function getCategoryIcon(tx: Transaction, tone: TransactionTone) {
  const text = `${tx.description ?? ''} ${tx.categoryName ?? ''}`.toLowerCase()
  if (tone.name === 'transfer') return ArrowLeftRight
  if (tone.name === 'investment') return TrendingUp
  if (/gaji|salary|income|masuk|bonus/.test(text)) return Banknote
  if (/makan|restoran|food|cafe|kopi|coffee|lunch|dinner/.test(text)) return ShoppingBag
  if (/belanja|shop|tokopedia|shopee|lazada|bukalapak/.test(text)) return ShoppingBag
  if (/bank|admin|biaya|fee/.test(text)) return Landmark
  if (/kerja|bisnis|project|invoice/.test(text)) return Briefcase
  if (/kartu|card|payment/.test(text)) return CreditCard
  return tone.Icon
}

function getSignedAmount(tx: Transaction, tone: TransactionTone, hidden: boolean): string {
  const prefix = tone.name === 'income' || (tone.name === 'transfer' && tone.label.includes('masuk')) ? '+' : '-'
  return `${prefix}${formatCurrencyIDR(tx.amount, hidden)}`
}

export function AccountTransactionList({ accountId, accountType, hidden = false, limit = 30 }: Props) {
  const { data: allTx, loading } = useApiList<Transaction>('/api/transactions', { refreshMs: 15000 })

  const transactions = useMemo(() =>
    allTx
      .filter(tx => tx.walletAccountId === accountId || tx.toWalletAccountId === accountId)
      .sort((a, b) => new Date(b.date || b.createdAt || '').getTime() - new Date(a.date || a.createdAt || '').getTime())
      .slice(0, limit),
    [allTx, accountId, limit]
  )

  if (loading) {
    return (
      <div className="space-y-2.5">
        {[...Array(4)].map((_, index) => (
          <div
            key={index}
            className="h-[72px] rounded-2xl animate-pulse"
            style={{
              background: 'linear-gradient(90deg, rgba(255,255,255,0.42), rgba(255,255,255,0.72), rgba(255,255,255,0.42))',
              border: '1px solid rgba(34,197,94,0.10)',
            }}
          />
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    const copy = accountType === 'ewallet'
      ? {
          title: 'Belum ada aktivitas',
          sub: 'Aktivitas e-wallet yang terhubung akan tampil di sini.',
        }
      : {
          title: 'Belum ada transaksi di rekening ini',
          sub: 'Transaksi rekening kamu akan muncul setelah ada data masuk.',
        }

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl py-9 px-6 flex flex-col items-center gap-2 text-center"
        style={{
          background: 'rgba(255,255,255,0.58)',
          border: '1px solid rgba(34,197,94,0.14)',
          boxShadow: '0 14px 34px rgba(15,23,42,0.08)',
          backdropFilter: 'blur(14px)',
        }}
      >
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1" style={{ background: 'rgba(34,197,94,0.10)', color: 'var(--accent)' }}>
          <Sparkles size={20} />
        </div>
        <p className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>{copy.title}</p>
        <p className="text-[11px] leading-relaxed max-w-[240px]" style={{ color: 'var(--text-muted)' }}>{copy.sub}</p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-2.5">
      {transactions.map((tx, index) => {
        const tone = getTransactionTone(tx, accountId)
        const Icon = getCategoryIcon(tx, tone)
        const title = tx.description || tx.categoryName || tone.label
        const category = tx.categoryName || tone.label

        return (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, duration: 0.2 }}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.992 }}
            className="flex items-center gap-3 px-3.5 py-3 rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.62)',
              border: `1px solid ${tone.border}`,
              boxShadow: '0 12px 30px rgba(15,23,42,0.08)',
              backdropFilter: 'blur(14px)',
            }}
          >
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: tone.soft, color: tone.color }}
            >
              <Icon size={18} strokeWidth={2.2} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                {title}
              </p>
              <div className="mt-1 flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                  {formatTransactionDate(tx.date || tx.createdAt)}
                </span>
                <span className="h-1 w-1 rounded-full flex-shrink-0" style={{ background: 'rgba(100,116,139,0.38)' }} />
                <span
                  className="px-2 py-0.5 rounded-full text-[9px] font-bold truncate"
                  style={{ background: tone.soft, color: tone.color, maxWidth: 116 }}
                >
                  {category}
                </span>
              </div>
            </div>

            <div className="text-right flex-shrink-0 min-w-[92px]">
              <p className="text-[13px] font-extrabold tracking-normal" style={{ color: tone.color, fontFamily: 'var(--font-jetbrains)', fontVariantNumeric: 'tabular-nums' }}>
                {getSignedAmount(tx, tone, hidden)}
              </p>
              <p className="text-[9px] mt-1 font-semibold" style={{ color: 'var(--text-muted)' }}>
                {tone.label}
              </p>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
