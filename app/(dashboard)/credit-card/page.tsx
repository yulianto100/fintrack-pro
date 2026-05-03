'use client'

import { useState, useMemo }        from 'react'
import { motion, AnimatePresence }  from 'framer-motion'
import { ChevronLeft, ChevronRight, Trash2, Plus, CreditCard as CreditCardIcon } from 'lucide-react'
import { useCreditCards }               from '@/hooks/useCreditCards'
import { CreditCardHero }               from '@/components/credit-card/CreditCardHero'
import { CreditCardSummary }            from '@/components/credit-card/CreditCardSummary'
import { CreditCardInsights }           from '@/components/credit-card/CreditCardInsights'
import { CreditCardTransactionList }    from '@/components/credit-card/CreditCardTransactionList'
import { PayCreditCardModal }           from '@/components/credit-card/PayCreditCardModal'
import { AddCreditCardModal }           from '@/components/credit-card/AddCreditCardModal'
import { TransactionModal }             from '@/components/transactions/TransactionModal'
import type { CreditCard }              from '@/types'

/* ── Smart Due Date Alert ─────────────────────────────────── */
function DueDateAlert({ card }: { card: CreditCard }) {
  if (card.used <= 0) return null

  const today = new Date()
  let due = new Date(today.getFullYear(), today.getMonth(), card.dueDate)
  if (due < today) due = new Date(today.getFullYear(), today.getMonth() + 1, card.dueDate)
  const days = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  let bg      = 'rgba(34,197,94,0.07)'
  let border  = 'rgba(34,197,94,0.18)'
  let color   = 'var(--accent)'
  let icon    = '📅'

  if (days <= 3) {
    bg     = 'rgba(239,68,68,0.08)'
    border = 'rgba(239,68,68,0.22)'
    color  = '#ef4444'
    icon   = '🚨'
  } else if (days <= 7) {
    bg     = 'rgba(245,158,11,0.08)'
    border = 'rgba(245,158,11,0.22)'
    color  = '#f59e0b'
    icon   = '⚠️'
  }

  const dueLabel = due.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <span className="text-lg flex-shrink-0">{icon}</span>
      <div className="flex-1">
        <p className="text-[11px] font-semibold" style={{ color }}>
          Jatuh tempo{' '}
          <span style={{ fontWeight: 800 }}>
            {days === 0 ? 'hari ini' : days === 1 ? 'besok' : `${days} hari lagi`}
          </span>
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Tagihan harus dibayar paling lambat {dueLabel}
        </p>
      </div>
    </motion.div>
  )
}

/* ── Floating Action Button ───────────────────────────────── */
function CreditCardFAB({ onAddCard, onAddTransaction }: { onAddCard: () => void; onAddTransaction?: () => void }) {
  const [open, setOpen] = useState(false)

  const items = [
    { icon: <CreditCardIcon size={16} />, label: 'Tambah Kartu',      onClick: () => { setOpen(false); onAddCard() } },
    { icon: <Plus size={16} />,           label: 'Tambah Transaksi',  onClick: () => { setOpen(false); onAddTransaction?.() } },
  ]

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="fab-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.25)' }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Menu items */}
      <div className="fixed z-50" style={{ bottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom,0px) + 72px)', right: 20 }}>
        <AnimatePresence>
          {open && (
            <div className="flex flex-col items-end gap-2 mb-3">
              {items.map((item, i) => (
                <motion.button
                  key={item.label}
                  initial={{ opacity: 0, x: 20, scale: 0.85 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.85 }}
                  transition={{ delay: (items.length - 1 - i) * 0.06 }}
                  onClick={item.onClick}
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-sm font-semibold whitespace-nowrap"
                  style={{
                    background: 'var(--surface-modal)',
                    border:     '1px solid var(--border)',
                    color:      'var(--text-primary)',
                    boxShadow:  '0 4px 20px rgba(0,0,0,0.12)',
                  }}
                >
                  <span style={{ color: 'var(--accent)' }}>{item.icon}</span>
                  {item.label}
                </motion.button>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* FAB button */}
      <motion.button
        onClick={() => setOpen((o) => !o)}
        className="fixed z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90"
        style={{
          bottom:     'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom,0px) + 16px)',
          right:      20,
          background: 'linear-gradient(135deg, #22c55e, #16a34a)',
          boxShadow:  '0 6px 24px rgba(34,197,94,0.40)',
        }}
        animate={{ rotate: open ? 45 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <Plus size={24} color="#fff" strokeWidth={2.5} />
      </motion.button>
    </>
  )
}

/* ── Main Page ────────────────────────────────────────────── */
export default function CreditCardPage() {
  const { cards, loading, deleteCard, totalDebt } = useCreditCards()

  const [activeIdx,     setActiveIdx    ] = useState(0)
  const [hidden,        setHidden       ] = useState(false)
  const [payModal,      setPayModal     ] = useState<{ open: boolean; mode?: 'full' | 'minimum' }>({ open: false })
  const [addModal,      setAddModal     ] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [txModal,       setTxModal      ] = useState<{ open: boolean; defaultType?: 'expense' | 'income' | 'transfer' }>({ open: false })

  const activeCard: CreditCard | undefined = cards[activeIdx]

  const prev = () => setActiveIdx((i) => Math.max(0, i - 1))
  const next = () => setActiveIdx((i) => Math.min(cards.length - 1, i + 1))

  if (loading) {
    return (
      <div className="px-4 py-6 space-y-4 max-w-lg mx-auto">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton rounded-3xl h-20" />
        ))}
      </div>
    )
  }

  return (
    <div className="px-4 py-6 space-y-5 max-w-lg mx-auto pb-32">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-xl" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-syne)' }}>
            Kartu Kredit
          </h1>
          {totalDebt > 0 && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Total utang:{' '}
              <span style={{ color: '#ef4444', fontWeight: 700 }}>
                Rp {totalDebt.toLocaleString('id-ID')}
              </span>
            </p>
          )}
        </div>
        {/* Visual dot indicators */}
        {cards.length > 1 && (
          <div className="flex items-center gap-1.5">
            {cards.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                className="rounded-full transition-all"
                style={{
                  width:      i === activeIdx ? 20 : 6,
                  height:     6,
                  background: i === activeIdx ? 'var(--accent)' : 'var(--border)',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Empty state ── */}
      {cards.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-10 flex flex-col items-center gap-4 text-center"
          style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}
        >
          <span className="text-5xl">💳</span>
          <div>
            <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
              Belum Ada Kartu Kredit
            </p>
            <p className="text-xs mt-1.5 max-w-xs" style={{ color: 'var(--text-muted)' }}>
              Tambahkan kartu kredit untuk tracking tagihan dan penggunaan limit.
            </p>
          </div>
          <button
            onClick={() => setAddModal(true)}
            className="px-5 py-2.5 rounded-xl font-semibold text-sm"
            style={{ background: 'var(--accent)', color: '#000' }}
          >
            + Tambah Kartu Kredit
          </button>
        </motion.div>
      )}

      {/* ── Card content ── */}
      {cards.length > 0 && activeCard && (
        <>
          {/* Navigation arrows (multi-card) */}
          {cards.length > 1 && (
            <div className="flex items-center justify-between">
              <button
                onClick={prev} disabled={activeIdx === 0}
                className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30"
                style={{ background: 'var(--surface-btn)', border: '1px solid var(--border)' }}
              >
                <ChevronLeft size={16} style={{ color: 'var(--text-secondary)' }} />
              </button>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                {activeIdx + 1} / {cards.length}
              </p>
              <button
                onClick={next} disabled={activeIdx === cards.length - 1}
                className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30"
                style={{ background: 'var(--surface-btn)', border: '1px solid var(--border)' }}
              >
                <ChevronRight size={16} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
          )}

          {/* Hero card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCard.id}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.22 }}
            >
              <CreditCardHero
                card={activeCard}
                hidden={hidden}
                onToggleHidden={() => setHidden((h) => !h)}
              />
            </motion.div>
          </AnimatePresence>

          {/* Delete action (subtle, right-aligned) */}
          <div className="flex justify-end">
            <button
              onClick={() => setConfirmDelete(activeCard.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{
                background: 'rgba(239,68,68,0.07)',
                border:     '1px solid rgba(239,68,68,0.16)',
                color:      '#ef4444',
              }}
            >
              <Trash2 size={12} /> Hapus Kartu
            </button>
          </div>

          {/* Smart Due Date Alert */}
          <DueDateAlert card={activeCard} />

          {/* Unified Action Panel (Summary + Buttons) */}
          <CreditCardSummary
            card={activeCard}
            hidden={hidden}
            onPayFull={()    => setPayModal({ open: true, mode: 'full'    })}
            onPayMinimum={() => setPayModal({ open: true, mode: 'minimum' })}
          />

          {/* Smart Insights */}
          <CreditCardInsights card={activeCard} />

          {/* Transaction list */}
          <div>
            <p className="text-[10px] font-semibold tracking-widest mb-3 px-1" style={{ color: 'var(--text-muted)' }}>
              TRANSAKSI KARTU INI
            </p>
            <CreditCardTransactionList creditCardId={activeCard.id} hidden={hidden} />
          </div>
        </>
      )}

      {/* ── FAB ── */}
      <CreditCardFAB
        onAddCard={() => setAddModal(true)}
        onAddTransaction={() => setTxModal({ open: true, defaultType: 'expense' })}
      />

      {/* ── Add Transaction modal (same as dashboard) ── */}
      <AnimatePresence>
        {txModal.open && (
          <TransactionModal
            defaultType={txModal.defaultType ?? 'expense'}
            onClose={() => {
              setTxModal({ open: false })
              window.dispatchEvent(new CustomEvent('fintrack:wallet-updated'))
              window.dispatchEvent(new CustomEvent('fintrack:transactions-updated'))
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Pay modal ── */}
      {payModal.open && activeCard && (
        <PayCreditCardModal
          card={activeCard}
          defaultAmount={payModal.mode}
          onClose={() => setPayModal({ open: false })}
          onSuccess={() => {
            window.dispatchEvent(new CustomEvent('fintrack:wallet-updated'))
            window.dispatchEvent(new CustomEvent('fintrack:transactions-updated'))
          }}
        />
      )}

      {/* ── Add card modal ── */}
      {addModal && (
        <AddCreditCardModal
          onClose={() => setAddModal(false)}
          onSuccess={() => setActiveIdx(0)}
        />
      )}

      {/* ── Delete confirm ── */}
      <AnimatePresence>
        {confirmDelete && (
          <>
            <motion.div
              key="del-bd"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50"
              style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
              onClick={() => setConfirmDelete(null)}
            />
            <motion.div
              key="del-dialog"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-6 pointer-events-none"
            >
              <div
                className="relative w-full max-w-sm rounded-3xl p-6 text-center space-y-4 pointer-events-auto"
                style={{ background: 'var(--surface-modal)', border: '1px solid var(--border)' }}
              >
                <span className="text-4xl">🗑️</span>
                <div>
                  <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Hapus Kartu?</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Data kartu akan dihapus permanen. Transaksi terkait tidak ikut terhapus.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="flex-1 py-3 rounded-2xl text-sm font-semibold"
                    style={{ background: 'var(--surface-btn)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                  >
                    Batal
                  </button>
                  <button
                    onClick={async () => { await deleteCard(confirmDelete); setConfirmDelete(null); setActiveIdx(0) }}
                    className="flex-1 py-3 rounded-2xl text-sm font-semibold"
                    style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff' }}
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
