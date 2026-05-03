'use client'

import { useMemo, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, useAnimation } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Transaction } from '@/types'

// ─── Delete Confirmation Dialog ───────────────────────────────────────────────

interface ConfirmDialogProps {
  transaction: Transaction
  onConfirm:  () => void
  onCancel:   () => void
}

function DeleteConfirmDialog({ transaction, onConfirm, onCancel }: ConfirmDialogProps) {
  const isExpense  = transaction.type === 'expense' || transaction.type === 'credit_expense'
  const isTransfer = transaction.type === 'transfer'
  const color      = isTransfer ? 'var(--blue)' : isExpense ? 'var(--red)' : 'var(--accent)'
  const sign       = isExpense ? '-' : isTransfer ? '⇄' : '+'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-8"
      style={{ background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <motion.div
        initial={{ y: 40, scale: 0.95, opacity: 0 }}
        animate={{ y: 0,  scale: 1,    opacity: 1 }}
        exit={{    y: 40, scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Icon + text */}
        <div className="flex flex-col items-center pt-7 pb-5 px-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.20)' }}>
            <Trash2 size={24} style={{ color: 'var(--red)' }} strokeWidth={2} />
          </div>
          <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            Hapus Transaksi?
          </h3>
          <p className="text-xs text-center leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Transaksi ini akan dihapus permanen dan tidak bisa dikembalikan.
          </p>

          {/* Transaction preview */}
          <div className="w-full mt-4 flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
              style={{ background: `${color}18` }}>
              {transaction.categoryIcon || (isTransfer ? '↔️' : isExpense ? '💸' : '💰')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {transaction.categoryName || 'Transaksi'}
              </p>
              {transaction.description && (
                <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                  {transaction.description}
                </p>
              )}
            </div>
            <p className="text-xs font-bold font-mono flex-shrink-0" style={{ color }}>
              {sign}{formatCurrency(transaction.amount)}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--border)' }} />

        {/* Action buttons */}
        <div className="flex">
          <motion.button whileTap={{ scale: 0.96 }} onClick={onCancel}
            className="flex-1 py-4 text-sm font-semibold"
            style={{ color: 'var(--text-secondary)', borderRight: '1px solid var(--border)' }}>
            Batal
          </motion.button>
          <motion.button whileTap={{ scale: 0.96 }} onClick={onConfirm}
            className="flex-1 py-4 text-sm font-bold"
            style={{ color: 'var(--red)' }}>
            Hapus
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Swipeable Transaction Row ────────────────────────────────────────────────

const SWIPE_THRESHOLD  = 72
const DELETE_BTN_WIDTH = 80

interface RowProps {
  transaction:   Transaction
  hidden?:       boolean
  onEdit:        (t: Transaction) => void
  onDeleteStart: (t: Transaction) => void
  isLast:        boolean
}

function SwipeableRow({ transaction: t, hidden, onEdit, onDeleteStart, isLast }: RowProps) {
  const x          = useMotionValue(0)
  const controls   = useAnimation()
  const isDragging = useRef(false)

  const isExpense  = t.type === 'expense' || t.type === 'credit_expense'
  const isTransfer = t.type === 'transfer'
  const color      = isTransfer ? 'var(--blue)' : isExpense ? 'var(--red)' : 'var(--accent)'
  const sign       = isExpense ? '-' : isTransfer ? '⇄' : '+'

  const deleteOpacity = useTransform(x, [-DELETE_BTN_WIDTH, -20], [1, 0])
  const deleteScale   = useTransform(x, [-DELETE_BTN_WIDTH, -20], [1, 0.7])

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
    } else {
      snapBack()
    }
  }, [x, controls, t, onDeleteStart, snapBack])

  const handleClick = useCallback(() => {
    if (!isDragging.current && Math.abs(x.get()) < 5) onEdit(t)
  }, [x, t, onEdit])

  return (
    <div
      className="relative overflow-hidden"
      style={!isLast ? { borderBottom: '1px solid rgba(255,255,255,0.04)' } : undefined}
    >
      {/* Red delete area revealed on swipe */}
      <motion.div
        className="absolute right-0 top-0 bottom-0 flex items-center justify-center"
        style={{ width: DELETE_BTN_WIDTH, opacity: deleteOpacity, scale: deleteScale, background: 'rgba(239,68,68,0.12)' }}>
        <div className="flex flex-col items-center gap-1">
          <Trash2 size={18} style={{ color: 'var(--red)' }} strokeWidth={2} />
          <span className="text-[9px] font-bold" style={{ color: 'var(--red)' }}>Hapus</span>
        </div>
      </motion.div>

      {/* Draggable row */}
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
        className="flex items-center gap-3 px-4 py-3 cursor-pointer relative"
      >
        {/* Icon */}
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
          style={{ background: `${color}14` }}>
          {t.categoryIcon || (isTransfer ? '↔️' : isExpense ? '💸' : '💰')}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {t.categoryName || (isTransfer ? 'Transfer' : 'Transaksi')}
          </p>
          {t.description && (
            <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {t.description}
            </p>
          )}
        </div>

        {/* Amount */}
        <p className="text-sm font-bold font-mono flex-shrink-0" style={{ color }}>
          {hidden ? '••••' : `${sign}${formatCurrency(t.amount)}`}
        </p>
      </motion.div>
    </div>
  )
}

// ─── Date label ───────────────────────────────────────────────────────────────

function getDateLabel(dateStr: string): string {
  const today     = new Date(); today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const d         = new Date(dateStr); d.setHours(0, 0, 0, 0)

  if (d.getTime() === today.getTime())     return 'Hari ini'
  if (d.getTime() === yesterday.getTime()) return 'Kemarin'
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface Props {
  transactions: Transaction[]
  hidden?:      boolean
  onEdit:       (t: Transaction) => void
  onDelete:     (id: string) => void
}

interface DayGroup {
  dateKey: string
  label:   string
  items:   Transaction[]
  total:   number
}

export function TransactionGroup({ transactions, hidden, onEdit, onDelete }: Props) {
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null)

  const groups = useMemo<DayGroup[]>(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of transactions) {
      const key = t.date?.split('T')[0] ?? 'unknown'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dateKey, items]) => {
        const total = items.reduce((sum, t) => {
          if (t.type === 'income')   return sum + t.amount
          if (t.type === 'expense' || t.type === 'credit_expense') return sum - t.amount
          return sum
        }, 0)
        return { dateKey, label: getDateLabel(dateKey), items, total }
      })
  }, [transactions])

  const handleDeleteStart  = useCallback((t: Transaction) => setPendingDelete(t), [])
  const handleConfirm      = useCallback(() => {
    if (pendingDelete) { onDelete(pendingDelete.id); setPendingDelete(null) }
  }, [pendingDelete, onDelete])
  const handleCancel       = useCallback(() => setPendingDelete(null), [])

  return (
    <>
      <div className="flex flex-col gap-3">
        {groups.map((group, gi) => {
          const isPositive = group.total >= 0
          const totalColor = isPositive ? 'var(--accent)' : 'var(--red)'

          return (
            <motion.div
              key={group.dateKey}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.03, duration: 0.18 }}
            >
              {/* Sticky date header */}
              <div className="flex items-center justify-between px-1 mb-1 py-1.5"
                style={{ position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                <p className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>{group.label}</p>
                <p className="text-[11px] font-semibold font-mono" style={{ color: totalColor }}>
                  {hidden ? '••••' : `${isPositive ? '+' : ''}${formatCurrency(group.total)}`}
                </p>
              </div>

              {/* Cards */}
              <div className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', boxShadow: '0 8px 30px rgba(0,0,0,0.25)' }}>
                <AnimatePresence initial={false}>
                  {group.items.map((t, ti) => (
                    <motion.div key={t.id} layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } }}>
                      <SwipeableRow
                        transaction={t}
                        hidden={hidden}
                        onEdit={onEdit}
                        onDeleteStart={handleDeleteStart}
                        isLast={ti === group.items.length - 1}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Confirmation dialog */}
      <AnimatePresence>
        {pendingDelete && (
          <DeleteConfirmDialog
            transaction={pendingDelete}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        )}
      </AnimatePresence>
    </>
  )
}
