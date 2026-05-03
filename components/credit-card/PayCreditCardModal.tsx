'use client'

import { useState }   from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CreditCard } from 'lucide-react'
import { useCreditCards } from '@/hooks/useCreditCards'
import { useApiList }     from '@/hooks/useApiData'
import type { CreditCard as CreditCardType, WalletAccount } from '@/types'

const WALLET_OPTIONS = [
  { value: 'cash'    as const, icon: '💵', label: 'Cash'     },
  { value: 'bank'    as const, icon: '🏦', label: 'Bank'     },
  { value: 'ewallet' as const, icon: '📱', label: 'E-Wallet' },
]

interface Props {
  card: CreditCardType
  defaultAmount?: 'full' | 'minimum'
  onClose: () => void
  onSuccess?: () => void
}

export function PayCreditCardModal({ card, defaultAmount, onClose, onSuccess }: Props) {
  const { payBill } = useCreditCards()

  const minPayment = Math.ceil(card.used * 0.1)

  const [walletType, setWalletType] = useState<'cash' | 'bank' | 'ewallet'>('bank')
  const [rawAmount,  setRawAmount ] = useState(() => {
    if (defaultAmount === 'minimum') return minPayment.toString()
    if (defaultAmount === 'full')    return card.used.toString()
    return ''
  })
  const [date,   setDate  ] = useState(new Date().toISOString().split('T')[0])
  const [notes,  setNotes ] = useState('')
  const [saving,          setSaving         ] = useState(false)
  const [walletAccountId, setWalletAccountId] = useState<string>('')

  // Fetch bank/ewallet accounts for source-of-funds selection
  const { data: walletAccounts } = useApiList<WalletAccount>('/api/wallet-accounts')
  const bankAccounts   = walletAccounts.filter(a => a.type === 'bank')
  const ewalletAccounts = walletAccounts.filter(a => a.type === 'ewallet')

  const displayAmount = rawAmount
    ? `Rp ${parseInt(rawAmount, 10).toLocaleString('id-ID')}`
    : ''

  const handleAmountChange = (val: string) => {
    const numeric = val.replace(/\D/g, '')
    setRawAmount(numeric)
  }

  const getNumericAmount = () => parseInt(rawAmount, 10) || 0

  const setPreset = (amt: number) => setRawAmount(amt.toString())

  const handlePay = async () => {
    const amt = getNumericAmount()
    if (!amt || amt <= 0) return

    setSaving(true)
    try {
      await payBill({
        creditCardId:   card.id,
        walletType,
        walletAccountId: walletAccountId || undefined,
        amount:          amt,
        date,
        notes: notes || undefined,
      })
      onSuccess?.()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {/* Backdrop — z-40, separate from content */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      />

      {/* Modal container — z-50, pointer-events-none so clicks pass to content */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          className="relative w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl pointer-events-auto"
          style={{
            background:  'var(--surface-modal)',
            border:      '1px solid var(--border)',
            maxHeight:   '90dvh',
            overflowY:   'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="drag-indicator mt-3 sm:hidden" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-2">
              <CreditCard size={20} style={{ color: 'var(--accent)' }} />
              <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                Bayar Tagihan
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'var(--surface-close)', color: 'var(--text-secondary)' }}
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-5 pb-7 space-y-5">
            {/* Card info */}
            <div
              className="p-4 rounded-2xl flex items-center gap-3"
              style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(34,197,94,0.12)' }}
              >
                <CreditCard size={18} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{card.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Tagihan: <span style={{ color: '#ef4444', fontWeight: 700 }}>
                    Rp {card.used.toLocaleString('id-ID')}
                  </span>
                </p>
              </div>
            </div>

            {/* Preset buttons */}
            {card.used > 0 && (
              <div>
                <label className="text-xs mb-2 block font-semibold" style={{ color: 'var(--text-muted)' }}>
                  PILIH JUMLAH
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: `Minimum (10%)`, amount: minPayment,  icon: '⚡' },
                    { label: 'Lunas Penuh',    amount: card.used,   icon: '✅' },
                  ].map((p) => (
                    <button
                      key={p.label}
                      onClick={() => setPreset(p.amount)}
                      className="py-3 px-3 rounded-xl text-left transition-all"
                      style={{
                        background: getNumericAmount() === p.amount
                          ? 'rgba(34,197,94,0.12)'
                          : 'var(--surface-btn)',
                        border: `1px solid ${getNumericAmount() === p.amount
                          ? 'rgba(34,197,94,0.35)'
                          : 'var(--border)'}`,
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-sm">{p.icon}</span>
                        <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{p.label}</p>
                      </div>
                      <p className="text-[11px] font-mono" style={{ color: 'var(--accent)' }}>
                        Rp {p.amount.toLocaleString('id-ID')}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Amount input */}
            <div>
              <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>
                JUMLAH BAYAR (Rp)
              </label>
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-sm select-none pointer-events-none"
                  style={{ color: 'var(--accent)' }}
                >
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="input-glass text-lg font-bold"
                  style={{ paddingLeft: '3rem', color: 'var(--accent)' }}
                  placeholder="0"
                  value={rawAmount ? parseInt(rawAmount, 10).toLocaleString('id-ID') : ''}
                  onChange={(e) => handleAmountChange(e.target.value)}
                />
              </div>
            </div>

            {/* Wallet source */}
            <div>
              <label className="text-xs mb-2 block font-semibold" style={{ color: 'var(--text-muted)' }}>
                SUMBER DANA
              </label>
              {/* Wallet type tabs */}
              <div className="flex gap-2 mb-3">
                {WALLET_OPTIONS.map((w) => (
                  <button
                    key={w.value}
                    onClick={() => { setWalletType(w.value); setWalletAccountId('') }}
                    className="flex-1 flex flex-col items-center py-3 rounded-xl text-xs transition-all"
                    style={{
                      background: walletType === w.value ? 'rgba(34,197,94,0.12)' : 'var(--surface-btn)',
                      border:     `1px solid ${walletType === w.value ? 'rgba(34,197,94,0.35)' : 'rgba(34,197,94,0.15)'}`,
                      color:      walletType === w.value ? 'var(--accent)' : 'var(--text-muted)',
                    }}
                  >
                    <span className="text-lg mb-1">{w.icon}</span>
                    <span className="text-[10px]">{w.label}</span>
                  </button>
                ))}
              </div>

              {/* Bank account picker */}
              {walletType === 'bank' && (
                <div className="flex flex-col gap-1.5">
                  {bankAccounts.length === 0 ? (
                    <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>
                      Belum ada rekening bank
                    </p>
                  ) : (
                    bankAccounts.map((acc) => (
                      <button
                        key={acc.id}
                        onClick={() => setWalletAccountId(acc.id)}
                        className="p-3 rounded-xl text-left transition-all"
                        style={{
                          background: walletAccountId === acc.id ? 'rgba(34,197,94,0.10)' : 'var(--surface-btn)',
                          border: `1px solid ${walletAccountId === acc.id ? 'rgba(34,197,94,0.30)' : 'var(--border)'}`,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{acc.name}</p>
                            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                              Rp {(acc.balance ?? 0).toLocaleString('id-ID')}
                            </p>
                          </div>
                          {walletAccountId === acc.id && (
                            <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>✓</span>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* E-Wallet account picker */}
              {walletType === 'ewallet' && (
                <div className="flex flex-col gap-1.5">
                  {ewalletAccounts.length === 0 ? (
                    <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>
                      Belum ada akun e-wallet
                    </p>
                  ) : (
                    ewalletAccounts.map((acc) => (
                      <button
                        key={acc.id}
                        onClick={() => setWalletAccountId(acc.id)}
                        className="p-3 rounded-xl text-left transition-all"
                        style={{
                          background: walletAccountId === acc.id ? 'rgba(34,197,94,0.10)' : 'var(--surface-btn)',
                          border: `1px solid ${walletAccountId === acc.id ? 'rgba(34,197,94,0.30)' : 'var(--border)'}`,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{acc.name}</p>
                            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                              Rp {(acc.balance ?? 0).toLocaleString('id-ID')}
                            </p>
                          </div>
                          {walletAccountId === acc.id && (
                            <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>✓</span>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>
                TANGGAL BAYAR
              </label>
              <input
                type="date"
                className="input-glass text-sm"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>
                CATATAN
                <span
                  className="ml-1 text-[9px] font-normal px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(34,197,94,0.10)', color: 'var(--accent)' }}
                >
                  opsional
                </span>
              </label>
              <input
                type="text"
                className="input-glass text-sm"
                placeholder="Catatan pembayaran"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Payment summary */}
            {getNumericAmount() > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 rounded-2xl space-y-2"
                style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}
              >
                <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Ringkasan Pembayaran</p>
                {[
                  { label: 'Jumlah Bayar', value: `Rp ${getNumericAmount().toLocaleString('id-ID')}` },
                  { label: 'Dari',         value: WALLET_OPTIONS.find((w) => w.value === walletType)?.label || '' },
                  {
                    label: 'Sisa Tagihan',
                    value: `Rp ${Math.max(0, card.used - getNumericAmount()).toLocaleString('id-ID')}`,
                  },
                ].map((r) => (
                  <div key={r.label} className="flex justify-between text-xs">
                    <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{r.value}</span>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Submit button */}
            <button
              onClick={handlePay}
              disabled={saving || getNumericAmount() <= 0 || card.used <= 0}
              className="w-full py-4 rounded-2xl font-semibold text-base transition-all active:scale-[0.98]"
              style={{
                background:  saving || getNumericAmount() <= 0 || card.used <= 0
                  ? 'rgba(34,197,94,0.30)'
                  : 'linear-gradient(135deg, #22c55e, #16a34a)',
                color:       '#fff',
                boxShadow:   '0 4px 16px rgba(34,197,94,0.20)',
                cursor:      saving || getNumericAmount() <= 0 ? 'not-allowed' : 'pointer',
                fontFamily:  'var(--font-space)',
              }}
            >
              {saving
                ? <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Memproses...
                  </div>
                : `💳 Bayar ${displayAmount || 'Tagihan'}`
              }
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
