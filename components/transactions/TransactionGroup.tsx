'use client'

import { Fragment, useMemo, useState, useRef, useCallback } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion, useAnimation, useMotionValue, useTransform } from 'framer-motion'
import { ArrowLeftRight, Paperclip, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import {
  getTransactionMethodLabel,
  isCreditCardPurchase,
  isExpenseForSummary,
} from '@/lib/transaction-rules'
import type { Transaction, WalletType } from '@/types'

const SWIPE_THRESHOLD = 72
const DELETE_BTN_WIDTH = 80
const LARGE_EXPENSE_THRESHOLD = 500_000

const WALLET_LABELS: Record<WalletType, string> = {
  cash: 'Cash',
  bank: 'Bank',
  ewallet: 'E-Wallet',
}

const transactionColors = {
  expenseNormal: 'var(--expenseNormal)',
  expenseStrong: 'var(--expenseStrong)',
  income: 'var(--income)',
  neutral: 'var(--neutral)',
  warning: 'var(--warning)',
  muted: 'var(--text-muted)',
}

interface ConfirmDialogProps {
  transaction: Transaction
  hidden?: boolean
  onConfirm: () => void
  onCancel: () => void
}

interface RowProps {
  transaction: Transaction
  hidden?: boolean
  onEdit: (t: Transaction) => void
  onDeleteStart: (t: Transaction) => void
  isLast: boolean
}

interface Props {
  transactions: Transaction[]
  hidden?: boolean
  onEdit: (t: Transaction) => void
  onDelete: (id: string) => void
  afterFirstGroup?: ReactNode
}

interface DayGroup {
  dateKey: string
  label: string
  items: Transaction[]
  total: number
}

function getWalletName(wallet?: WalletType) {
  return wallet ? WALLET_LABELS[wallet] : undefined
}

function getTransactionTitle(t: Transaction) {
  const description = t.description?.trim()
  if (description) return description

  return t.categoryName || getTransactionMethodLabel(t) || (t.type === 'transfer' ? 'Transfer' : 'Transaksi')
}

function getSourceLabel(t: Transaction) {
  if (isCreditCardPurchase(t)) return t.creditCardName || 'Kartu Kredit'

  if (t.type === 'transfer') {
    const fromWallet = getWalletName(t.wallet)
    const toWallet = getWalletName(t.toWallet)
    if (fromWallet && toWallet) return `${fromWallet} ke ${toWallet}`
    return fromWallet || toWallet
  }

  return getWalletName(t.wallet) || t.creditCardName
}

function getTransactionSubtitle(t: Transaction) {
  const category = t.categoryName || getTransactionMethodLabel(t) || (t.type === 'transfer' ? 'Transfer' : 'Lainnya')
  const source = getSourceLabel(t)

  return [category, source].filter(Boolean).join(' · ')
}

function getAmountMeta(t: Transaction) {
  const isExpense = isExpenseForSummary(t)
  const isIncome = t.type === 'income'
  const isTransfer = t.type === 'transfer'
  const isLargeExpense = isExpense && t.amount >= LARGE_EXPENSE_THRESHOLD

  if (isExpense) {
    return {
      sign: '-',
      color: isLargeExpense ? transactionColors.expenseStrong : transactionColors.expenseNormal,
      bg: isLargeExpense ? 'rgba(248,113,113,0.15)' : 'rgba(248,113,113,0.10)',
    }
  }

  if (isIncome) {
    return {
      sign: '+',
      color: transactionColors.income,
      bg: 'rgba(34,197,94,0.12)',
    }
  }

  return {
    sign: '',
    color: isTransfer ? transactionColors.neutral : transactionColors.muted,
    bg: isTransfer ? 'rgba(96,165,250,0.12)' : 'rgba(34,197,94,0.10)',
  }
}

function getAmountText(t: Transaction, hidden?: boolean) {
  if (hidden) return '••••'
  const meta = getAmountMeta(t)
  return `${meta.sign}${formatCurrency(t.amount)}`
}

function getDateLabel(dateStr: string): string {
  if (dateStr === 'unknown') return 'Tanggal tidak diketahui'

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return 'Tanggal tidak diketahui'

  date.setHours(0, 0, 0, 0)

  if (date.getTime() === today.getTime()) return 'Hari ini'
  if (date.getTime() === yesterday.getTime()) return 'Kemarin'
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getGroupTotalMeta(total: number) {
  if (total > 0) {
    return {
      color: transactionColors.income,
      bg: 'rgba(34,197,94,0.10)',
      border: 'rgba(34,197,94,0.20)',
      sign: '+',
    }
  }

  if (total < 0) {
    return {
      color: transactionColors.expenseNormal,
      bg: 'rgba(248,113,113,0.10)',
      border: 'rgba(248,113,113,0.20)',
      sign: '-',
    }
  }

  return {
    color: transactionColors.muted,
    bg: 'rgba(34,197,94,0.08)',
    border: 'var(--border)',
    sign: '',
  }
}

function DeleteConfirmDialog({ transaction, hidden, onConfirm, onCancel }: ConfirmDialogProps) {
  const amountMeta = getAmountMeta(transaction)
  const title = getTransactionTitle(transaction)
  const subtitle = getTransactionSubtitle(transaction)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-8"
      style={{ background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onClick={event => { if (event.target === event.currentTarget) onCancel() }}
    >
      <motion.div
        initial={{ y: 40, scale: 0.95, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 40, scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="w-full max-w-sm overflow-hidden rounded-3xl"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
        onClick={event => event.stopPropagation()}
      >
        <div className="flex flex-col items-center px-6 pb-5 pt-7">
          <div
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.20)' }}
          >
            <Trash2 size={24} style={{ color: 'var(--expenseStrong)' }} strokeWidth={2} />
          </div>
          <h3 className="mb-1 text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            Hapus Transaksi?
          </h3>
          <p className="text-center text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Transaksi ini akan dihapus permanen dan tidak bisa dikembalikan.
          </p>

          <div
            className="mt-4 flex w-full items-center gap-3 rounded-2xl px-4 py-3"
            style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}
          >
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-sm"
              style={{ background: amountMeta.bg, color: amountMeta.color }}
            >
              {transaction.categoryIcon || (transaction.type === 'transfer' ? <ArrowLeftRight size={15} /> : '•')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                {title}
              </p>
              <p className="truncate text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {subtitle}
              </p>
            </div>
            <p className="flex-shrink-0 text-xs font-bold font-mono" style={{ color: amountMeta.color }}>
              {getAmountText(transaction, hidden)}
            </p>
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--border)' }} />

        <div className="flex">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onCancel}
            className="flex-1 py-4 text-sm font-semibold"
            style={{ color: 'var(--text-secondary)', borderRight: '1px solid var(--border)' }}
          >
            Batal
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onConfirm}
            className="flex-1 py-4 text-sm font-bold"
            style={{ color: 'var(--expenseStrong)' }}
          >
            Hapus
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function SwipeableRow({ transaction: t, hidden, onEdit, onDeleteStart, isLast }: RowProps) {
  const x = useMotionValue(0)
  const controls = useAnimation()
  const isDragging = useRef(false)

  const amountMeta = getAmountMeta(t)
  const title = getTransactionTitle(t)
  const subtitle = getTransactionSubtitle(t)

  const deleteOpacity = useTransform(x, [-DELETE_BTN_WIDTH, -20], [1, 0])
  const deleteScale = useTransform(x, [-DELETE_BTN_WIDTH, -20], [1, 0.7])

  const snapBack = useCallback(() => {
    controls.start({ x: 0, transition: { type: 'spring', damping: 25, stiffness: 400 } })
  }, [controls])

  const handleDragEnd = useCallback(() => {
    isDragging.current = false
    const currentX = x.get()
    if (currentX < -SWIPE_THRESHOLD) {
      controls.start({
        x: -DELETE_BTN_WIDTH,
        transition: { type: 'spring', damping: 25, stiffness: 400 },
      }).then(() => {
        onDeleteStart(t)
        snapBack()
      })
      return
    }

    snapBack()
  }, [x, controls, t, onDeleteStart, snapBack])

  const handleClick = useCallback(() => {
    if (!isDragging.current && Math.abs(x.get()) < 5) onEdit(t)
  }, [x, t, onEdit])

  return (
    <div
      className="relative overflow-hidden"
      style={!isLast ? { borderBottom: '1px solid rgba(34,197,94,0.10)' } : undefined}
    >
      <motion.div
        className="absolute bottom-0 right-0 top-0 flex items-center justify-center"
        style={{ width: DELETE_BTN_WIDTH, opacity: deleteOpacity, scale: deleteScale, background: 'rgba(239,68,68,0.12)' }}
      >
        <div className="flex flex-col items-center gap-1">
          <Trash2 size={18} style={{ color: 'var(--expenseStrong)' }} strokeWidth={2} />
          <span className="text-[9px] font-bold" style={{ color: 'var(--expenseStrong)' }}>
            Hapus
          </span>
        </div>
      </motion.div>

      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -DELETE_BTN_WIDTH, right: 0 }}
        dragElastic={{ left: 0.08, right: 0 }}
        style={{ x, background: 'var(--surface-2)', touchAction: 'pan-y' }}
        onDragStart={() => { isDragging.current = true }}
        onDragEnd={handleDragEnd}
        animate={controls}
        onClick={handleClick}
        className="relative flex min-h-[68px] cursor-pointer items-center gap-3 px-3.5 py-2.5"
      >
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-[15px]"
          style={{ background: amountMeta.bg, color: amountMeta.color }}
        >
          {t.categoryIcon || (t.type === 'transfer' ? <ArrowLeftRight size={16} /> : '•')}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
            {title}
          </p>
          <p className="mt-0.5 truncate text-[11px] font-medium leading-snug" style={{ color: 'rgba(110,231,160,0.72)' }}>
            {subtitle}
          </p>
        </div>

        <div className="flex max-w-[122px] flex-shrink-0 items-center justify-end gap-1 pl-2">
          {t.attachmentUrl && <Paperclip size={11} style={{ color: 'var(--text-muted)' }} />}
          <p
            className="text-right text-[13px] font-bold leading-tight font-mono"
            style={{ color: amountMeta.color }}
          >
            {getAmountText(t, hidden)}
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export function TransactionGroup({ transactions, hidden, onEdit, onDelete, afterFirstGroup }: Props) {
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null)

  const groups = useMemo<DayGroup[]>(() => {
    const map = new Map<string, Transaction[]>()

    for (const transaction of transactions) {
      const key = transaction.date?.split('T')[0] ?? 'unknown'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(transaction)
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dateKey, items]) => {
        const total = items.reduce((sum, transaction) => {
          if (transaction.type === 'income') return sum + transaction.amount
          if (isExpenseForSummary(transaction)) return sum - transaction.amount
          return sum
        }, 0)

        return { dateKey, label: getDateLabel(dateKey), items, total }
      })
  }, [transactions])

  const handleDeleteStart = useCallback((transaction: Transaction) => setPendingDelete(transaction), [])
  const handleConfirm = useCallback(() => {
    if (pendingDelete) {
      onDelete(pendingDelete.id)
      setPendingDelete(null)
    }
  }, [pendingDelete, onDelete])
  const handleCancel = useCallback(() => setPendingDelete(null), [])

  return (
    <>
      <div className="flex flex-col gap-3">
        {groups.map((group, groupIndex) => {
          const totalMeta = getGroupTotalMeta(group.total)

          return (
            <Fragment key={group.dateKey}>
              <motion.section
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: groupIndex * 0.03, duration: 0.18 }}
              >
                <div className="mb-1.5 flex min-h-[36px] items-center justify-between gap-3 px-1.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold leading-tight" style={{ color: 'var(--accent)' }}>
                      {group.label}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium leading-none" style={{ color: 'var(--text-muted)' }}>
                      {group.items.length} transaksi
                    </p>
                  </div>
                  <p
                    className="max-w-[132px] flex-shrink-0 rounded-full px-2.5 py-1 text-right text-[11px] font-bold leading-none font-mono"
                    style={{
                      color: totalMeta.color,
                      background: totalMeta.bg,
                      border: `1px solid ${totalMeta.border}`,
                    }}
                  >
                    {hidden ? '••••' : `${totalMeta.sign}${formatCurrency(Math.abs(group.total))}`}
                  </p>
                </div>

                <div
                  className="overflow-hidden rounded-2xl"
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 8px 26px rgba(0,0,0,0.22)',
                  }}
                >
                  <AnimatePresence initial={false}>
                    {group.items.map((transaction, transactionIndex) => (
                      <motion.div
                        key={transaction.id}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } }}
                      >
                        <SwipeableRow
                          transaction={transaction}
                          hidden={hidden}
                          onEdit={onEdit}
                          onDeleteStart={handleDeleteStart}
                          isLast={transactionIndex === group.items.length - 1}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.section>

              {groupIndex === 0 && afterFirstGroup && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08, duration: 0.18 }}
                >
                  {afterFirstGroup}
                </motion.div>
              )}
            </Fragment>
          )
        })}
      </div>

      <AnimatePresence>
        {pendingDelete && (
          <DeleteConfirmDialog
            transaction={pendingDelete}
            hidden={hidden}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        )}
      </AnimatePresence>
    </>
  )
}
