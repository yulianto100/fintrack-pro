'use client'

import { useState }        from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, ChevronLeft, ChevronRight, Trash2, Edit3 } from 'lucide-react'
import { useCreditCards }               from '@/hooks/useCreditCards'
import { CreditCardHero }               from '@/components/credit-card/CreditCardHero'
import { CreditCardSummary }            from '@/components/credit-card/CreditCardSummary'
import { CreditCardInsights }           from '@/components/credit-card/CreditCardInsights'
import { CreditCardTransactionList }    from '@/components/credit-card/CreditCardTransactionList'
import { PayCreditCardModal }           from '@/components/credit-card/PayCreditCardModal'
import { AddCreditCardModal }           from '@/components/credit-card/AddCreditCardModal'
import type { CreditCard }              from '@/types'

export default function CreditCardPage() {
  const { cards, loading, deleteCard, totalDebt } = useCreditCards()

  const [activeIdx,    setActiveIdx   ] = useState(0)
  const [hidden,       setHidden      ] = useState(false)
  const [payModal,     setPayModal    ] = useState<{ open: boolean; mode?: 'full' | 'minimum' }>({ open: false })
  const [addModal,     setAddModal    ] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const activeCard: CreditCard | undefined = cards[activeIdx]

  const prev = () => setActiveIdx((i) => Math.max(0, i - 1))
  const next = () => setActiveIdx((i) => Math.min(cards.length - 1, i + 1))

  if (loading) {
    return (
      <div className="px-4 py-6 space-y-4 max-w-lg mx-auto">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton rounded-2xl h-20" />
        ))}
      </div>
    )
  }

  return (
    <div className="px-4 py-6 space-y-5 max-w-lg mx-auto pb-28">

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
            💳 Kartu Kredit
          </h1>
          {totalDebt > 0 && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Total utang: <span style={{ color: '#ef4444', fontWeight: 700 }}>
                Rp {totalDebt.toLocaleString('id-ID')}
              </span>
            </p>
          )}
        </div>
        <button
          onClick={() => setAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{
            background: 'rgba(34,197,94,0.12)',
            border:     '1px solid rgba(34,197,94,0.25)',
            color:      'var(--accent)',
          }}
        >
          <Plus size={16} /> Tambah
        </button>
      </div>

      {/* ── Empty state ───────────────────────────────────────────────── */}
      {cards.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-10 flex flex-col items-center gap-4 text-center"
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

      {/* ── Card carousel ─────────────────────────────────────────────── */}
      {cards.length > 0 && activeCard && (
        <>
          {/* Navigation arrows when multiple cards */}
          {cards.length > 1 && (
            <div className="flex items-center justify-between">
              <button
                onClick={prev} disabled={activeIdx === 0}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity disabled:opacity-30"
                style={{ background: 'var(--surface-btn)', border: '1px solid var(--border)' }}
              >
                <ChevronLeft size={16} style={{ color: 'var(--text-secondary)' }} />
              </button>
              <div className="flex gap-1.5">
                {cards.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIdx(i)}
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width:      i === activeIdx ? 20 : 6,
                      background: i === activeIdx ? 'var(--accent)' : 'var(--border)',
                    }}
                  />
                ))}
              </div>
              <button
                onClick={next} disabled={activeIdx === cards.length - 1}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity disabled:opacity-30"
                style={{ background: 'var(--surface-btn)', border: '1px solid var(--border)' }}
              >
                <ChevronRight size={16} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
          )}

          {/* Card hero */}
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

          {/* Card action row (Edit / Delete) */}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmDelete(activeCard.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{
                background: 'rgba(239,68,68,0.09)',
                border:     '1px solid rgba(239,68,68,0.20)',
                color:      '#ef4444',
              }}
            >
              <Trash2 size={13} /> Hapus
            </button>
          </div>

          {/* Summary */}
          <CreditCardSummary card={activeCard} hidden={hidden} />

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPayModal({ open: true, mode: 'full' })}
              disabled={activeCard.used <= 0}
              className="py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-[0.97] disabled:opacity-40"
              style={{
                background:  activeCard.used > 0
                  ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                  : 'rgba(34,197,94,0.20)',
                color:       '#fff',
                boxShadow:   activeCard.used > 0 ? '0 4px 16px rgba(34,197,94,0.25)' : 'none',
                fontFamily:  'var(--font-space)',
              }}
            >
              💳 Bayar Tagihan
            </button>
            <button
              onClick={() => setPayModal({ open: true, mode: 'minimum' })}
              disabled={activeCard.used <= 0}
              className="py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-[0.97] disabled:opacity-40"
              style={{
                background:  'rgba(245,158,11,0.12)',
                border:      '1px solid rgba(245,158,11,0.25)',
                color:       '#f59e0b',
                fontFamily:  'var(--font-space)',
              }}
            >
              ⚡ Bayar Minimum
            </button>
          </div>

          {/* Insights */}
          <CreditCardInsights card={activeCard} />

          {/* Transaction list */}
          <div>
            <p className="text-xs font-semibold mb-3 px-1" style={{ color: 'var(--text-muted)' }}>
              TRANSAKSI KARTU INI
            </p>
            <CreditCardTransactionList creditCardId={activeCard.id} hidden={hidden} />
          </div>
        </>
      )}

      {/* ── Pay modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
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
      </AnimatePresence>

      {/* ── Add card modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {addModal && (
          <AddCreditCardModal
            onClose={() => setAddModal(false)}
            onSuccess={() => setActiveIdx(0)}
          />
        )}
      </AnimatePresence>

      {/* ── Delete confirm modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
              onClick={() => setConfirmDelete(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm rounded-2xl p-6 text-center space-y-4"
              style={{ background: 'var(--surface-modal)', border: '1px solid var(--border)' }}
            >
              <span className="text-4xl">🗑️</span>
              <div>
                <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                  Hapus Kartu?
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Data kartu akan dihapus permanen. Transaksi terkait tidak ikut terhapus.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold"
                  style={{ background: 'var(--surface-btn)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                >
                  Batal
                </button>
                <button
                  onClick={async () => {
                    await deleteCard(confirmDelete)
                    setConfirmDelete(null)
                    setActiveIdx(0)
                  }}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold"
                  style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff' }}
                >
                  Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
