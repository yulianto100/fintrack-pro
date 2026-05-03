'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CreditCard } from 'lucide-react'
import { useCreditCards } from '@/hooks/useCreditCards'

const CARD_COLORS = [
  '#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4',
]

const BANK_SUGGESTIONS = [
  'BCA', 'Mandiri', 'BRI', 'BNI', 'CIMB Niaga',
  'Jago', 'Sinarmas', 'Danamon', 'Permata', 'BTN',
]

interface Props {
  onClose: () => void
  onSuccess?: () => void
}

export function AddCreditCardModal({ onClose, onSuccess }: Props) {
  const { addCard } = useCreditCards()

  const [name,        setName       ] = useState('')
  const [bankName,    setBankName   ] = useState('')
  const [last4,       setLast4      ] = useState('')   // stores only the 4 digits user typed
  const [limit,       setLimit      ] = useState('')
  const [billingDate, setBillingDate] = useState('25')
  const [dueDate,     setDueDate    ] = useState('15')
  const [color,       setColor      ] = useState(CARD_COLORS[0])
  const [saving,      setSaving     ] = useState(false)

  // Self-managed visibility — exit animation fires, then onClose via onExitComplete
  const [visible, setVisible] = useState(true)
  const handleClose = () => setVisible(false)

  const handleLimitChange = (val: string) => {
    const numeric = val.replace(/\D/g, '')
    setLimit(numeric ? parseInt(numeric, 10).toLocaleString('id-ID') : '')
  }

  const getRawLimit = () => parseInt(limit.replace(/\./g, '').replace(',', '.'), 10) || 0

  const handleSave = async () => {
    if (!name || getRawLimit() <= 0) return
    setSaving(true)
    try {
      await addCard({
        name,
        bankName,
        last4: last4.slice(-4),
        limit: getRawLimit(),
        billingDate: Number(billingDate),
        dueDate:     Number(dueDate),
        color,
      })
      onSuccess?.()
      handleClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence onExitComplete={onClose}>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            key="add-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
            onClick={handleClose}
          />

          {/* Panel */}
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
            <motion.div
              key="add-panel"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="relative w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl pointer-events-auto"
              style={{ background: 'var(--surface-modal)', border: '1px solid var(--border)', maxHeight: '92dvh', overflowY: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="drag-indicator mt-3 sm:hidden" />

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-2">
                  <CreditCard size={20} style={{ color: 'var(--accent)' }} />
                  <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                    Tambah Kartu Kredit
                  </h2>
                </div>
                <button
                  onClick={handleClose}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--surface-close)', color: 'var(--text-secondary)' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="px-5 pb-7 space-y-4">

                {/* ── Warna kartu ──────────────────────────────── */}
                <div>
                  <label className="text-xs mb-2 block font-semibold" style={{ color: 'var(--text-muted)' }}>WARNA KARTU</label>
                  <div className="flex gap-2">
                    {CARD_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        className="w-8 h-8 rounded-full transition-all"
                        style={{
                          background: c,
                          border:     `2px solid ${color === c ? '#fff' : 'transparent'}`,
                          boxShadow:  color === c ? `0 0 0 3px ${c}50` : 'none',
                          transform:  color === c ? 'scale(1.15)' : 'scale(1)',
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* ── Nama kartu ───────────────────────────────── */}
                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>NAMA KARTU *</label>
                  <input
                    type="text" className="input-glass text-sm" placeholder="cth: BCA Platinum"
                    value={name} onChange={(e) => setName(e.target.value)}
                  />
                </div>

                {/* ── Bank (dengan suggestion chips) ───────────── */}
                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>
                    BANK
                    <span className="ml-1 text-[9px] font-normal px-1.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(34,197,94,0.10)', color: 'var(--accent)' }}>opsional</span>
                  </label>
                  <input
                    type="text" className="input-glass text-sm" placeholder="cth: Bank BCA"
                    value={bankName} onChange={(e) => setBankName(e.target.value)}
                  />
                  {/* Suggestion chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {BANK_SUGGESTIONS.map((b) => (
                      <button
                        key={b}
                        onClick={() => setBankName(b)}
                        className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
                        style={{
                          background: bankName === b ? 'rgba(34,197,94,0.15)' : 'var(--surface-btn)',
                          border:     `1px solid ${bankName === b ? 'rgba(34,197,94,0.40)' : 'var(--border)'}`,
                          color:      bankName === b ? 'var(--accent)' : 'var(--text-secondary)',
                        }}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── 4 digit terakhir ─────────────────────────── */}
                {/* Prefix •••• •••• •••• is always shown as static text.
                    Only the last 4 chars are editable by the user.            */}
                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>
                    4 DIGIT TERAKHIR
                    <span className="ml-1 text-[9px] font-normal px-1.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(34,197,94,0.10)', color: 'var(--accent)' }}>opsional</span>
                  </label>

                  <div
                    className="input-glass flex items-center gap-1 text-sm"
                    style={{ fontFamily: 'monospace', letterSpacing: '0.12em' }}
                  >
                    {/* Static masked groups */}
                    <span style={{ color: 'var(--text-muted)', userSelect: 'none', pointerEvents: 'none' }}>
                      ••••&nbsp;&nbsp;••••&nbsp;&nbsp;••••&nbsp;&nbsp;
                    </span>
                    {/* Editable last-4 input — inline, no separate box */}
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={last4}
                      onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="____"
                      className="bg-transparent outline-none flex-1 min-w-0"
                      style={{
                        color:            'var(--text-primary)',
                        caretColor:       'var(--accent)',
                        letterSpacing:    '0.18em',
                        /* override input-glass padding since we're inside the wrapper */
                        padding:          0,
                        width:            '4ch',
                        maxWidth:         '4ch',
                      }}
                    />
                  </div>
                </div>

                {/* ── Limit kredit ──────────────────────────────── */}
                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>LIMIT KREDIT (Rp) *</label>
                  <div className="relative">
                    {/* "Rp" prefix — dim when empty so it's obvious field is unfilled */}
                    <span
                      className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-sm select-none pointer-events-none"
                      style={{ color: limit ? 'var(--accent)' : 'var(--text-muted)' }}
                    >
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="input-glass text-sm font-bold"
                      style={{
                        paddingLeft: '3rem',
                        /* text color changes: accent when filled, light muted when empty/placeholder */
                        color: limit ? 'var(--accent)' : 'var(--text-disabled, var(--text-muted))',
                      }}
                      /* no placeholder number — user must actively type the limit */
                      placeholder="Ketuk untuk isi limit"
                      value={limit}
                      onChange={(e) => handleLimitChange(e.target.value)}
                    />
                  </div>
                </div>

                {/* ── Tanggal tagihan & jatuh tempo ─────────────── */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'TANGGAL TAGIHAN', value: billingDate, setter: setBillingDate },
                    { label: 'JATUH TEMPO',     value: dueDate,     setter: setDueDate     },
                  ].map((field) => (
                    <div key={field.label}>
                      <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>
                        {field.label}
                      </label>
                      <select
                        className="input-glass text-sm"
                        value={field.value}
                        onChange={(e) => field.setter(e.target.value)}
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>Tanggal {d}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                {/* ── Submit ────────────────────────────────────── */}
                <button
                  onClick={handleSave}
                  disabled={saving || !name || getRawLimit() <= 0}
                  className="w-full py-4 rounded-2xl font-semibold text-base transition-all active:scale-[0.98]"
                  style={{
                    background: saving || !name || getRawLimit() <= 0
                      ? 'rgba(34,197,94,0.30)'
                      : 'linear-gradient(135deg, #22c55e, #16a34a)',
                    color:      '#fff',
                    boxShadow:  '0 4px 16px rgba(34,197,94,0.20)',
                    cursor:     saving || !name || getRawLimit() <= 0 ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-space)',
                  }}
                >
                  {saving
                    ? <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Menyimpan...
                      </div>
                    : '💳 Tambah Kartu'
                  }
                </button>

              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
