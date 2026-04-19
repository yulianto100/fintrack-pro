'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from "next-auth/react"
import { X, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight } from 'lucide-react'
import { useTransactions } from '@/hooks/useTransactions'
import { useFirebaseList } from '@/hooks/useFirebaseRealtime'
import { getCurrentMonth } from '@/lib/utils'
import type { Category, Transaction, TransactionType, WalletType } from '@/types'
import toast from 'react-hot-toast'

interface Props {
  transaction?: Transaction
  defaultType?: TransactionType
  onClose: () => void
}

const TABS: { type: TransactionType; icon: React.ReactNode; label: string; color: string }[] = [
  { type: 'expense', icon: <ArrowDownCircle size={16} />, label: 'Keluar', color: 'var(--red)' },
  { type: 'income', icon: <ArrowUpCircle size={16} />, label: 'Masuk', color: 'var(--accent)' },
  { type: 'transfer', icon: <ArrowLeftRight size={16} />, label: 'Transfer', color: 'var(--blue)' },
]

const WALLETS: { value: WalletType; icon: string; label: string }[] = [
  { value: 'cash', icon: '💵', label: 'Cash' },
  { value: 'bank', icon: '🏦', label: 'Bank' },
  { value: 'ewallet', icon: '📱', label: 'E-Wallet' },
]

export function TransactionModal({ transaction, defaultType = 'expense', onClose }: Props) {
  const { data: session } = useSession()
  const userId = session?.user?.id

  if (!userId) return null

  const { addTransaction, updateTransaction } = useTransactions()
  const { data: categories } = useFirebaseList<Category>(`users/${userId}/categories`)

  const [type, setType] = useState<TransactionType>(transaction?.type || defaultType)
  const [amount, setAmount] = useState(transaction?.amount?.toString() || '')
  const [categoryId, setCategoryId] = useState(transaction?.categoryId || '')
  const [description, setDescription] = useState(transaction?.description || '')
  const [date, setDate] = useState(transaction?.date || new Date().toISOString().split('T')[0])
  const [wallet, setWallet] = useState<WalletType>(transaction?.wallet || 'cash')
  const [toWallet, setToWallet] = useState<WalletType>(transaction?.toWallet || 'bank')
  const [saving, setSaving] = useState(false)

  const filteredCategories = (categories || []).filter(
    (c) => c.type === type || (type === 'transfer' && c.type === 'expense')
  )

  const isEdit = !!transaction

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) { toast.error('Masukkan jumlah yang valid'); return }
    if (!categoryId && type !== 'transfer') { toast.error('Pilih kategori'); return }
    if (type === 'transfer' && wallet === toWallet) { toast.error('Wallet asal dan tujuan berbeda'); return }

    setSaving(true)
    try {
      const data = {
        type,
        amount: parseFloat(amount.replace(/\./g, '')),
        categoryId: categoryId || 'transfer',
        description,
        date,
        wallet,
        toWallet: type === 'transfer' ? toWallet : undefined,
      }

      if (isEdit) {
        await updateTransaction(transaction.id, data)
      } else {
        await addTransaction(data)
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  // Format amount with thousand separator
  const handleAmountChange = (val: string) => {
    const numeric = val.replace(/\D/g, '')
    setAmount(numeric ? parseInt(numeric).toLocaleString('id-ID') : '')
  }

  const activeColor = TABS.find((t) => t.type === type)?.color || 'var(--accent)'

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          className="relative w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl overflow-hidden"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
        >
          <div className="drag-indicator mt-3 sm:hidden" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-4 pt-2">
            <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
              {isEdit ? 'Edit Transaksi' : 'Tambah Transaksi'}
            </h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)' }}>
              <X size={16} />
            </button>
          </div>

          {/* Type tabs */}
          <div className="flex gap-2 px-5 mb-5">
            {TABS.map((tab) => (
              <button
                key={tab.type}
                onClick={() => { setType(tab.type); setCategoryId('') }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: type === tab.type ? `${tab.color}20` : 'var(--surface-2)',
                  color: type === tab.type ? tab.color : 'var(--text-muted)',
                  border: `1px solid ${type === tab.type ? tab.color + '40' : 'var(--border)'}`,
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="px-5 pb-6 space-y-4">
            {/* Amount */}
            <div>
              <label className="text-xs mb-1.5 block font-medium" style={{ color: 'var(--text-muted)' }}>
                Jumlah (Rp)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold"
                  style={{ color: activeColor }}>Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="input-glass pl-10 text-lg font-bold"
                  style={{ color: activeColor }}
                  placeholder="0"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                />
              </div>
            </div>

            {/* Category (not for transfer) */}
            {type !== 'transfer' && (
              <div>
                <label className="text-xs mb-1.5 block font-medium" style={{ color: 'var(--text-muted)' }}>
                  Kategori
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {filteredCategories.slice(0, 8).map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryId(cat.id)}
                      className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all"
                      style={{
                        background: categoryId === cat.id ? `${cat.color}20` : 'var(--surface-2)',
                        border: `1px solid ${categoryId === cat.id ? cat.color + '60' : 'var(--border)'}`,
                      }}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <span className="text-[9px] text-center leading-tight truncate w-full"
                        style={{ color: categoryId === cat.id ? cat.color : 'var(--text-muted)' }}>
                        {cat.name}
                      </span>
                    </button>
                  ))}
                </div>
                {filteredCategories.length > 8 && (
                  <select
                    className="input-glass mt-2 text-sm"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="">-- Kategori lainnya --</option>
                    {filteredCategories.map((c) => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Wallet */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs mb-1.5 block font-medium" style={{ color: 'var(--text-muted)' }}>
                  {type === 'transfer' ? 'Dari' : 'Wallet'}
                </label>
                <div className="flex gap-1.5">
                  {WALLETS.map((w) => (
                    <button
                      key={w.value}
                      onClick={() => setWallet(w.value)}
                      className="flex-1 flex flex-col items-center py-2 rounded-xl transition-all text-xs"
                      style={{
                        background: wallet === w.value ? 'var(--accent-dim)' : 'var(--surface-2)',
                        border: `1px solid ${wallet === w.value ? 'var(--accent)' : 'var(--border)'}`,
                        color: wallet === w.value ? 'var(--accent)' : 'var(--text-muted)',
                      }}
                    >
                      <span className="text-base">{w.icon}</span>
                      <span className="text-[9px]">{w.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {type === 'transfer' && (
                <div>
                  <label className="text-xs mb-1.5 block font-medium" style={{ color: 'var(--text-muted)' }}>
                    Ke
                  </label>
                  <div className="flex gap-1.5">
                    {WALLETS.map((w) => (
                      <button
                        key={w.value}
                        onClick={() => setToWallet(w.value)}
                        className="flex-1 flex flex-col items-center py-2 rounded-xl transition-all text-xs"
                        style={{
                          background: toWallet === w.value ? 'var(--blue-dim)' : 'var(--surface-2)',
                          border: `1px solid ${toWallet === w.value ? 'var(--blue)' : 'var(--border)'}`,
                          color: toWallet === w.value ? 'var(--blue)' : 'var(--text-muted)',
                        }}
                      >
                        <span className="text-base">{w.icon}</span>
                        <span className="text-[9px]">{w.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Date & Description */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs mb-1.5 block font-medium" style={{ color: 'var(--text-muted)' }}>Tanggal</label>
                <input type="date" className="input-glass text-sm" value={date}
                  onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs mb-1.5 block font-medium" style={{ color: 'var(--text-muted)' }}>Keterangan</label>
                <input type="text" className="input-glass text-sm" placeholder="Opsional"
                  value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary w-full py-3.5 flex items-center justify-center gap-2"
              style={{
                background: `linear-gradient(135deg, ${activeColor}, ${activeColor}cc)`,
              }}
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>{isEdit ? 'Simpan Perubahan' : 'Tambah Transaksi'}</span>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
