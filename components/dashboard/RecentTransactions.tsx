'use client'

import { ArrowLeftRight, CreditCard, ReceiptText, TrendingUp } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getTransactionMethodLabel, isCreditCardPurchase, isExpenseForSummary } from '@/lib/transaction-rules'
import type { Transaction, WalletType } from '@/types'
import { dashboardColors, dashboardRadius } from './dashboardTokens'

interface Props {
  transactions: Transaction[]
  hidden?: boolean
}

const WALLET_LABEL: Record<WalletType, string> = {
  cash: 'Cash',
  bank: 'Bank',
  ewallet: 'E-Wallet',
}

function walletLabel(wallet?: WalletType): string {
  return wallet ? WALLET_LABEL[wallet] : 'Wallet'
}

function amountText(transaction: Transaction, isIncome: boolean, isExpense: boolean): string {
  const sign = isIncome ? '+' : isExpense ? '-' : ''
  return `${sign}${formatCurrency(transaction.amount).replace(/\s/g, '')}`
}

function metadata(transaction: Transaction): string {
  const methodLabel = getTransactionMethodLabel(transaction)
  const categoryLabel = methodLabel || transaction.categoryName || (transaction.type === 'transfer' ? 'Transfer' : 'Transaksi')

  const sourceLabel = methodLabel === 'Bayar Kartu Kredit'
    ? walletLabel(transaction.wallet)
    : transaction.type === 'transfer'
    ? `${walletLabel(transaction.wallet)} -> ${walletLabel(transaction.toWallet)}`
    : isCreditCardPurchase(transaction)
      ? transaction.creditCardName || 'Kartu Kredit'
      : walletLabel(transaction.wallet)

  return `${categoryLabel} · ${sourceLabel} · ${formatDate(transaction.date, 'dd MMM')}`
}

export function RecentTransactions({ transactions, hidden = false }: Props) {
  if (transactions.length === 0) {
    return (
      <div className="glass-card p-6 text-center" style={{ borderRadius: dashboardRadius.cardSm }}>
        <p className="text-sm font-semibold" style={{ color: dashboardColors.text }}>
          Belum ada transaksi
        </p>
        <p className="mt-1 text-xs" style={{ color: dashboardColors.muted }}>
          Transaksi terbaru akan muncul di sini.
        </p>
      </div>
    )
  }

  return (
    <div className="glass-card overflow-hidden" style={{ borderRadius: dashboardRadius.cardSm }}>
      {transactions.slice(0, 4).map((transaction, index) => {
        const isIncome = transaction.type === 'income'
        const isExpense = isExpenseForSummary(transaction)
        const isCredit = isCreditCardPurchase(transaction)
        const Icon = isCredit ? CreditCard : isIncome ? TrendingUp : transaction.type === 'transfer' ? ArrowLeftRight : ReceiptText
        const tone = isIncome
          ? dashboardColors.income
          : isExpense
            ? dashboardColors.expense
            : dashboardColors.info
        const toneBg = isIncome
          ? dashboardColors.incomeSoft
          : isExpense
            ? dashboardColors.expenseSoft
            : dashboardColors.infoSoft

        return (
          <div
            key={transaction.id}
            className="flex min-w-0 items-center gap-3 px-4 py-3.5"
            style={{ borderBottom: index < Math.min(transactions.length, 4) - 1 ? '1px solid rgba(255,255,255,0.055)' : 'none' }}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ background: toneBg, color: tone }}>
              <Icon size={18} strokeWidth={2.1} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-snug" style={{ color: dashboardColors.text }}>
                {transaction.description || transaction.categoryName || 'Transaksi'}
              </p>
              <p className="mt-1 truncate text-xs leading-snug" style={{ color: dashboardColors.muted }}>
                {metadata(transaction)}
              </p>
            </div>

            <p
              className="shrink-0 text-right text-sm font-bold leading-tight font-mono"
              style={{
                color: hidden ? dashboardColors.muted : tone,
                letterSpacing: hidden ? 2 : 0,
              }}
            >
              {hidden ? '******' : amountText(transaction, isIncome, isExpense)}
            </p>
          </div>
        )
      })}
    </div>
  )
}
