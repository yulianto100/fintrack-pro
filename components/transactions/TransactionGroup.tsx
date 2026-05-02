'use client'

import { useMemo, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Transaction } from '@/types'

// ── Delete Confirmation Popup ─────────────────────────────────────────────────

interface DeleteConfirmProps {
  transaction: Transaction
  onConfirm: () => void
  onCancel:  () => void
}

function DeleteConfirmPopup({ transaction: t, onConfirm, onCancel }: DeleteConfirmProps) {
  const isExpense  = t.type === 'expense'
  const isTransfer = t.type === 'transfer'
  const color      = isTransfer ? 'var(--blue)' : isExpense ? 'var(--red)' : 'var(--accent)'
  const sign       = isExpense ? '-' : isTransfer ? '⇄' : '+'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 340 }}
        className="w-full max-w-sm mx-auto mb-6 rounded-3xl p-5"
        style={{
          background: 'var(--surface)',
          border:     '1px solid var(--border)',
          boxShadow:  '0 24px 60px rgba(0,0,0,0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(239,68,68,0.12)' }}
        >
          <AlertTriangle size={22} style={{ color: 'var(--red)' }} />
        </div>

        <h3
          className="text-base font-bold text-center mb-1"
          style={{ color: 'var(--text-primary)' }}
        >
          Hapus Transaksi?
        </h3>
        <p
          className="text-xs text-center mb-4"
          style={{ color: 'var(--text-muted)' }}
        >
          Tindakan ini tidak bisa dibatalkan.
        </p>

        <div
          className="flex items-center gap-3 px-3 py-3 rounded-2xl mb-5"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
            style={{ background: `${color}14` }}
          >
            {t.categoryIcon || (isTransfer ? '↔️' : isExpense ? '💸' : '💰')}
          </div>
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
          <p className="text-sm font-bold font-mono flex-shrink-0" style={{ color }}>
            {`${sign}${formatCurrency(t.amount)}`}
          </p>
        </div>

        <div className="flex gap-2.5">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold"
            style={{
              background: 'var(--surface-2)',
              border:     '1px solid var(--border)',
              color:      'var(--text-secondary)',
            }}
          >
            Batal
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onConfirm}
            className="flex-1 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
            style={{
              background: 'rgba(239,68,68,0.15)',
              border:     '1px solid rgba(239,68,68,0.30)',
              color:      'var(--red)',
            }}
          >
            <Trash2 size={14} />
            Hapus
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Swipeable Transaction Row ─────────────────────────────────────────────────

interface TransactionItemProps {
  transaction: Transaction
  hidden?:     boolean
  onEdit:      (t: Transaction) => void
  onDelete:    (id: string)     => void
}

const SWIPE_TRIGGER   = 100   // px — drag distance that fires delete popup
const DELETE_BG_MAX_W = 80    // px — max width of the red bg strip

function TransactionRow({ transaction: t, hidden, onEdit, onDelete }: TransactionItemProps) {
  const isExpense  = t.type === 'expense'
  const isTransfer = t.type === 'transfer'
  const color = isTransfer ? 'var(--blue)' : isExpense ? 'var(--red)' : 'var(--accent)'
  const sign  = isExpense ? '-' : isTransfer ? '⇄' : '+'

  const touchStartX  = useRef<number>(0)
  const touchStartY  = useRef<number>(0)
  const isDragging   = useRef<boolean>(false)
  const isScrolling  = useRef<boolean | null>(null)

  const [translateX,   setTranslateX ] = useState(0)
  const [showConfirm,  setShowConfirm] = useState(false)
  const [isReleasing,  setIsReleasing] = useState(false)

  const dragRatio  = Math.min(Math.abs(translateX) / SWIPE_TRIGGER, 1)
  const deleteBgW  = Math.min(Math.abs(translateX), DELETE_BG_MAX_W)

  const resetSwipe = useCallback(() => {
    setIsReleasing(true)
    setTranslateX(0)
    setTimeout(() => setIsReleasing(false), 200)
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current  = e.touches[0].clientX
    touchStartY.current  = e.touches[0].clientY
    isDragging.current   = false
    isScrolling.current  = null
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current
    const dy = e.touches[0].clientY - touchStartY.current

    if (isScrolling.current === null) {
      if (Math.abs(dy) > Math.abs(dx)) {
        isScrolling.current = true
        return
      }
      isScrolling.current = false
    }
    if (isScrolling.current) return

    if (dx >= 0) {
      setTranslateX(0)
      return
    }

    isDragging.current = true
    // Resistance after trigger threshold
    const resistance = dx < -SWIPE_TRIGGER
      ? -SWIPE_TRIGGER + (dx + SWIPE_TRIGGER) * 0.25
      : dx
    setTranslateX(Math.max(resistance, -SWIPE_TRIGGER * 1.3))
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return

    if (translateX < -SWIPE_TRIGGER) {
      resetSwipe()
      setShowConfirm(true)
    } else {
      resetSwipe()
    }
  }, [translateX, resetSwipe])

  const handleClick = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false
      return
    }
    onEdit(t)
  }, [onEdit, t])

  const handleConfirmDelete = useCallback(() => {
    setShowConfirm(false)
    onDelete(t.id)
  }, [onDelete, t.id])

  const handleCancelDelete = useCallback(() => {
    setShowConfirm(false)
  }, [])

  return (
    <>
      <div className="relative overflow-hidden">
        {/* Red delete background — revealed on swipe-left */}
        <div
          className="absolute right-0 top-0 bottom-0 flex items-center justify-center"
          style={{
            width:      deleteBgW,
            background: `rgba(239,68,68,${0.08 + dragRatio * 0.15})`,
            transition: isReleasing ? 'width 0.2s ease, background 0.2s ease' : undefined,
          }}
        >
          <Trash2
            size={18}
            style={{
              color:      'var(--red)',
              opacity:    dragRatio,
              transition: isReleasing ? 'opacity 0.2s ease' : undefined,
            }}
          />
        </div>

        {/* Row — slides left on swipe */}
        <motion.div
          layout
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 6 }}
          transition={{ duration: 0.15 }}
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex items-center gap-3 px-4 py-3 cursor-pointer rounded-xl relative"
          style={{
            background:   'transparent',
            borderBottom: '1px solid var(--border)',
            transform:    `translateX(${translateX}px)`,
            transition:   isReleasing ? 'transform 0.2s ease' : undefined,
            userSelect:   'none',
            WebkitUserSelect: 'none',
          }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
            style={{ background: `${color}14` }}
          >
            {t.categoryIcon || (isTransfer ? '↔️' : isExpense ? '💸' : '💰')}
          </div>

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

          <p className="text-sm font-bold font-mono flex-shrink-0" style={{ color }}>
            {hidden ? '••••' : `${sign}${formatCurrency(t.amount)}`}
          </p>
        </motion.div>
      </div>

      <AnimatePresence>
        {showConfirm && (
          <DeleteConfirmPopup
            transaction={t}
            onConfirm={handleConfirmDelete}
            onCancel={handleCancelDelete}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// ── Date label helper ─────────────────────────────────────────────────────────

function getDateLabel(dateStr: string): string {
  const today     = new Date(); today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const d         = new Date(dateStr); d.setHours(0, 0, 0, 0)

  if (d.getTime() === today.getTime())     return 'Hari ini'
  if (d.getTime() === yesterday.getTime()) return 'Kemarin'

  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

// ── Main grouped list ─────────────────────────────────────────────────────────

interface Props {
  transactions: Transaction[]
  hidden?:      boolean
  onEdit:       (t: Transaction) => void
  onDelete:     (id: string)     => void
}

interface DayGroup {
  dateKey: string
  label:   string
  items:   Transaction[]
  total:   number
}

export function TransactionGroup({ transactions, hidden, onEdit, onDelete }: Props) {
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
          if (t.type === 'income')  return sum + t.amount
          if (t.type === 'expense') return sum - t.amount
          return sum
        }, 0)
        return { dateKey, label: getDateLabel(dateKey), items, total }
      })
  }, [transactions])

  return (
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
            <div
              className="flex items-center justify-between px-1 mb-1 py-1.5"
              style={{
                position:             'sticky',
                top:                  0,
                zIndex:               10,
                backdropFilter:       'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
            >
              <p className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                {group.label}
              </p>
              <p className="text-[11px] font-semibold font-mono" style={{ color: totalColor }}>
                {hidden
                  ? '••••'
                  : `${isPositive ? '+' : ''}${formatCurrency(group.total)}`
                }
              </p>
            </div>

            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'var(--surface-2)',
                border:     '1px solid var(--border)',
                boxShadow:  '0 8px 30px rgba(0,0,0,0.25)',
              }}
            >
              {group.items.map((t, ti) => (
                <div
                  key={t.id}
                  style={ti < group.items.length - 1
                    ? { borderBottom: '1px solid rgba(255,255,255,0.04)' }
                    : undefined}
                >
                  <TransactionRow
                    transaction={t}
                    hidden={hidden}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
