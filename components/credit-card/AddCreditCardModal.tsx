'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CreditCard } from 'lucide-react'
import { useCreditCards } from '@/hooks/useCreditCards'

const CARD_COLORS = [
  '#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4',
]

interface Props {
  onClose: () => void
  onSuccess?: () => void
}

export function AddCreditCardModal({ onClose, onSuccess }: Props) {
  const { addCard } = useCreditCards()

  const [name,        setName       ] = useState('')
  const [bankName,    setBankName   ] = useState('')
  const [last4,       setLast4      ] = useState('')
  const [limit,       setLimit      ] = useState('')
  const [billingDate, setBillingDate] = useState('25')
  const [dueDate,     setDueDate    ] = useState('15')
  const [color,       setColor      ] = useState(CARD_COLORS[0])
  const [saving,      setSaving     ] = useState(false)

  // Self-managed visibility: set false to trigger exit animation, then onClose fires via onExitComplete
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
    // AnimatePresence self-manages open/close: onExitComplete notifies the parent after animation
    <AnimatePresence onExitComplete={onClose}>
      {visible && (
        <>
          {/* Backdrop — z-40 */}
          <motion.div
            key="add-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
            onClick={handleClose}
          />

          {/* Modal container — z-50, pointer-events-none so only the panel catches clicks */}
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
                {/* Card colour picker */}
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

                {/* Card name */}
                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>NAMA KARTU *</label>
                  <input
                    type="text" className="input-glass text-sm" placeholder="cth: BCA Platinum"
                    value={name} onChange={(e) => setName(e.target.value)}
                  />
                </div>

                {/* Bank name */}
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
                </div>

                {/* Last 4 digits */}
                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>
                    4 DIGIT TERAKHIR
                    <span className="ml-1 text-[9px] font-normal px-1.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(34,197,94,0.10)', color: 'var(--accent)' }}>opsional</span>
                  </label>
                  <input
                    type="text" inputMode="numeric" className="input-glass text-sm tracking-widest"
                    placeholder="•••• •••• •••• ____" maxLength={4}
                    value={last4} onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  />
                </div>

                {/* Credit limit */}
                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>LIMIT KREDIT (Rp) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-sm select-none pointer-events-none"
                      style={{ color: 'var(--accent)' }}>Rp</span>
                    <input
                      type="text" inputMode="numeric" className="input-glass text-sm font-bold"
                      style={{ paddingLeft: '3rem' }} placeholder="10.000.000"
                      value={limit} onChange={(e) => handleLimitChange(e.target.value)}
                    />
                  </div>
                </div>

                {/* Dates */}
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

                {/* Submit */}
                <button
                  onClick={handleSave}
                  disabled={saving || !name || getRawLimit() <= 0}
                  className="w-full py-4 rounded-2xl font-semibold text-base transition-all active:scale-[0.98]"
                  style={{
                    background:  saving || !name || getRawLimit() <= 0
                      ? 'rgba(34,197,94,0.30)'
                      : 'linear-gradient(135deg, #22c55e, #16a34a)',
                    color:       '#fff',
                    boxShadow:   '0 4px 16px rgba(34,197,94,0.20)',
                    cursor:      saving || !name || getRawLimit() <= 0 ? 'not-allowed' : 'pointer',
                    fontFamily:  'var(--font-space)',
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
