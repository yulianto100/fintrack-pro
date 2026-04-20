'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight } from 'lucide-react'
import { useTransactions } from '@/hooks/useTransactions'
import { useApiList } from '@/hooks/useApiData'
import type { Category, Transaction, TransactionType, WalletType } from '@/types'
import toast from 'react-hot-toast'

interface Props {
  transaction?: Transaction
  defaultType?: TransactionType
  onClose: () => void
}

const TABS = [
  { type: 'expense' as TransactionType, icon: <ArrowDownCircle size={16}/>, label: 'Keluar',   color: 'var(--red)'    },
  { type: 'income'  as TransactionType, icon: <ArrowUpCircle   size={16}/>, label: 'Masuk',    color: 'var(--accent)' },
  { type: 'transfer'as TransactionType, icon: <ArrowLeftRight  size={16}/>, label: 'Transfer', color: 'var(--blue)'   },
]

const WALLETS = [
  { value: 'cash'    as WalletType, icon: '💵', label: 'Cash'    },
  { value: 'bank'    as WalletType, icon: '🏦', label: 'Bank'    },
  { value: 'ewallet' as WalletType, icon: '📱', label: 'E-Wallet'},
]

export function TransactionModal({ transaction, defaultType = 'expense', onClose }: Props) {
  const { addTransaction, updateTransaction } = useTransactions()

  // Fetch categories via API — no Firebase dependency
  const { data: categories, loading: catsLoading } = useApiList<Category>('/api/categories')

  const [type,        setType       ] = useState<TransactionType>(transaction?.type     || defaultType)
  const [amount,      setAmount     ] = useState(transaction?.amount?.toString() || '')
  const [categoryId,  setCategoryId ] = useState(transaction?.categoryId || '')
  const [description, setDescription] = useState(transaction?.description || '')
  const [date,        setDate       ] = useState(transaction?.date || new Date().toISOString().split('T')[0])
  const [wallet,      setWallet     ] = useState<WalletType>(transaction?.wallet   || 'cash')
  const [toWallet,    setToWallet   ] = useState<WalletType>(transaction?.toWallet || 'bank')
  const [saving,      setSaving     ] = useState(false)

  const filteredCategories = categories.filter(
    (c) => c.type === type || (type === 'transfer' && c.type === 'expense')
  )
  const isEdit    = !!transaction
  const activeColor = TABS.find((t) => t.type === type)?.color || 'var(--accent)'

  const handleAmountChange = (val: string) => {
    // Strip non-digits, format with id-ID thousand sep (dots)
    const numeric = val.replace(/\D/g, '')
    if (!numeric) { setAmount(''); return }
    setAmount(parseInt(numeric, 10).toLocaleString('id-ID'))
  }

  const getRawAmount = () => {
    // Remove id-ID thousand dots then parse
    return parseFloat(amount.replace(/\./g, '').replace(',', '.')) || 0
  }

  const handleSave = async () => {
    const raw = getRawAmount()
    if (!raw || raw <= 0)                          { toast.error('Masukkan jumlah yang valid'); return }
    if (!categoryId && type !== 'transfer')         { toast.error('Pilih kategori'); return }
    if (type === 'transfer' && wallet === toWallet) { toast.error('Wallet asal dan tujuan harus berbeda'); return }

    setSaving(true)
    try {
      const data = {
        type, amount: raw,
        categoryId: categoryId || 'transfer',
        description, date, wallet,
        toWallet: type === 'transfer' ? toWallet : undefined,
      }
      if (isEdit) await updateTransaction(transaction.id, data)
      else        await addTransaction(data)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          onClick={onClose}
        />

        {/* Sheet */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0,      opacity: 1 }}
          exit={   { y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          className="relative w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl"
          style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            maxHeight: '92dvh',
            overflowY: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="drag-indicator mt-3 sm:hidden" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
              {isEdit ? 'Edit Transaksi' : 'Tambah Transaksi'}
            </h2>
            <button onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)' }}>
              <X size={18} />
            </button>
          </div>

          {/* Type tabs */}
          <div className="flex gap-2 px-5 mb-5">
            {TABS.map((tab) => (
              <button key={tab.type}
                onClick={() => { setType(tab.type); setCategoryId('') }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium"
                style={{
                  background: type === tab.type ? `${tab.color}20` : 'var(--surface-2)',
                  color:      type === tab.type ? tab.color         : 'var(--text-muted)',
                  border:    `1px solid ${type === tab.type ? tab.color + '50' : 'var(--border)'}`,
                }}>
                {tab.icon}<span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="px-5 pb-7 space-y-5">

            {/* ── Amount ── */}
            <div>
              <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>
                Jumlah (Rp)
              </label>
              {/* Rp prefix INSIDE input via padding, NOT absolute positioned */}
              <div className="relative flex items-center">
                <span
                  className="absolute left-3 text-sm font-bold select-none pointer-events-none"
                  style={{ color: activeColor }}>
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="input-glass text-lg font-bold"
                  style={{ paddingLeft: '3rem', color: activeColor }}  /* pl-12 = 3rem */
                  placeholder="0"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                />
              </div>
            </div>

            {/* ── Category grid ── */}
            {type !== 'transfer' && (
              <div>
                <label className="text-xs mb-2 block font-semibold" style={{ color: 'var(--text-muted)' }}>
                  Kategori {filteredCategories.length === 0 && !catsLoading && (
                    <span style={{ color: 'var(--red)', fontWeight: 400 }}>
                      — belum ada kategori, tambah di Pengaturan
                    </span>
                  )}
                </label>

                {catsLoading ? (
                  <div className="grid grid-cols-4 gap-2">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="skeleton h-16 rounded-xl" />
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-4 gap-2">
                      {filteredCategories.slice(0, 8).map((cat) => (
                        <button key={cat.id}
                          onClick={() => setCategoryId(cat.id)}
                          className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all"
                          style={{
                            background: categoryId === cat.id ? `${cat.color}25` : 'var(--surface-3)',
                            border:    `1px solid ${categoryId === cat.id ? cat.color + '70' : 'rgba(34,197,94,0.15)'}`,
                          }}>
                          <span className="text-xl">{cat.icon}</span>
                          <span className="text-[9px] text-center leading-tight truncate w-full"
                            style={{ color: categoryId === cat.id ? cat.color : 'var(--text-secondary)' }}>
                            {cat.name}
                          </span>
                        </button>
                      ))}
                    </div>
                    {filteredCategories.length > 8 && (
                      <select className="input-glass mt-2 text-sm"
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}>
                        <option value="">-- Kategori lainnya --</option>
                        {filteredCategories.map((c) => (
                          <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                        ))}
                      </select>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── Wallet ── */}
            <div className={`grid gap-3 ${type === 'transfer' ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <div>
                <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>
                  {type === 'transfer' ? 'Dari Wallet' : 'Wallet'}
                </label>
                <div className="flex gap-2">
                  {WALLETS.map((w) => (
                    <button key={w.value} onClick={() => setWallet(w.value)}
                      className="flex-1 flex flex-col items-center py-2.5 rounded-xl text-xs transition-all"
                      style={{
                        background: wallet === w.value ? 'var(--accent-dim)'   : 'var(--surface-3)',
                        border:    `1px solid ${wallet === w.value ? 'var(--accent)' : 'rgba(34,197,94,0.15)'}`,
                        color:      wallet === w.value ? 'var(--accent)'        : 'var(--text-secondary)',
                      }}>
                      <span className="text-base mb-0.5">{w.icon}</span>
                      <span className="text-[9px]">{w.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {type === 'transfer' && (
                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Ke Wallet
                  </label>
                  <div className="flex gap-2">
                    {WALLETS.map((w) => (
                      <button key={w.value} onClick={() => setToWallet(w.value)}
                        className="flex-1 flex flex-col items-center py-2.5 rounded-xl text-xs transition-all"
                        style={{
                          background: toWallet === w.value ? 'var(--blue-dim)'   : 'var(--surface-3)',
                          border:    `1px solid ${toWallet === w.value ? 'var(--blue)' : 'rgba(34,197,94,0.15)'}`,
                          color:      toWallet === w.value ? 'var(--blue)'        : 'var(--text-secondary)',
                        }}>
                        <span className="text-base mb-0.5">{w.icon}</span>
                        <span className="text-[9px]">{w.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Date + Description ── */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>Tanggal</label>
                <input type="date" className="input-glass text-sm" value={date}
                  onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>Keterangan</label>
                <input type="text" className="input-glass text-sm" placeholder="Opsional"
                  value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>

            {/* ── Save ── */}
            <button onClick={handleSave} disabled={saving}
              className="btn-primary w-full py-4 flex items-center justify-center gap-2 text-base"
              style={{ background: `linear-gradient(135deg, ${activeColor}, ${activeColor}cc)` }}>
              {saving
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                : <span>{isEdit ? 'Simpan Perubahan' : 'Tambah Transaksi'}</span>
              }
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
