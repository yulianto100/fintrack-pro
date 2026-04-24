'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, ChevronRight } from 'lucide-react'
import { useTransactions } from '@/hooks/useTransactions'
import { useApiList } from '@/hooks/useApiData'
import type { Category, Transaction, TransactionType, WalletType, WalletAccount } from '@/types'
import { capitalizeWords } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Props {
  transaction?: Transaction
  defaultType?: TransactionType
  onClose: () => void
}

const TABS = [
  { type: 'expense'  as TransactionType, icon: <ArrowDownCircle size={16}/>, label: 'Keluar',   color: 'var(--red)'    },
  { type: 'income'   as TransactionType, icon: <ArrowUpCircle   size={16}/>, label: 'Masuk',    color: 'var(--accent)' },
  { type: 'transfer' as TransactionType, icon: <ArrowLeftRight  size={16}/>, label: 'Transfer', color: 'var(--blue)'   },
]

// High-level wallet types shown in the first step
const WALLET_TYPES: { value: WalletType; icon: string; label: string }[] = [
  { value: 'cash',    icon: '💵', label: 'Cash'    },
  { value: 'bank',    icon: '🏦', label: 'Bank'    },
  { value: 'ewallet', icon: '📱', label: 'E-Wallet'},
]

export function TransactionModal({ transaction, defaultType = 'expense', onClose }: Props) {
  const { addTransaction, updateTransaction } = useTransactions()
  const { data: categories, loading: catsLoading } = useApiList<Category>('/api/categories')

  const [type,        setType       ] = useState<TransactionType>(transaction?.type     || defaultType)
  const [amount,      setAmount     ] = useState(transaction?.amount?.toString() || '')
  const [categoryId,  setCategoryId ] = useState(transaction?.categoryId || '')
  const [description, setDescription] = useState(transaction?.description || '')
  const [date,        setDate       ] = useState(transaction?.date || new Date().toISOString().split('T')[0])
  const [saving,      setSaving     ] = useState(false)

  // Wallet selection
  const [wallet,          setWallet         ] = useState<WalletType>(transaction?.wallet   || 'cash')
  const [toWallet,        setToWallet       ] = useState<WalletType>(transaction?.toWallet || 'bank')
  const [walletAccountId,   setWalletAccountId  ] = useState<string>(transaction?.walletAccountId   || '')
  const [toWalletAccountId, setToWalletAccountId] = useState<string>(transaction?.toWalletAccountId || '')

  // All wallet accounts from the API
  const [walletAccounts, setWalletAccounts] = useState<WalletAccount[]>([])
  useEffect(() => {
    fetch('/api/wallet-accounts').then((r) => r.json()).then((j) => {
      if (j.success) setWalletAccounts(j.data || [])
    })
  }, [])

  const bankAccounts    = walletAccounts.filter((a) => a.type === 'bank')
  const ewalletAccounts = walletAccounts.filter((a) => a.type === 'ewallet')

  // When wallet type changes, reset account selection
  const handleSetWallet = (w: WalletType) => {
    setWallet(w)
    setWalletAccountId('')
  }
  const handleSetToWallet = (w: WalletType) => {
    setToWallet(w)
    setToWalletAccountId('')
  }

  const filteredCategories = categories.filter(
    (c) => c.type === type || (type === 'transfer' && c.type === 'expense')
  )
  const isEdit      = !!transaction
  const activeColor = TABS.find((t) => t.type === type)?.color || 'var(--accent)'

  const handleAmountChange = (val: string) => {
    const numeric = val.replace(/\D/g, '')
    if (!numeric) { setAmount(''); return }
    setAmount(parseInt(numeric, 10).toLocaleString('id-ID'))
  }
  const getRawAmount = () => parseFloat(amount.replace(/\./g, '').replace(',', '.')) || 0

  // Get sub-accounts for a given wallet type
  const getAccountsFor = (w: WalletType) => {
    if (w === 'bank')    return bankAccounts
    if (w === 'ewallet') return ewalletAccounts
    return []
  }

  const WalletPicker = ({
    label,
    selected,
    onSelect,
    selectedAccount,
    onSelectAccount,
    accentColor = activeColor,
  }: {
    label: string
    selected: WalletType
    onSelect: (w: WalletType) => void
    selectedAccount: string
    onSelectAccount: (id: string) => void
    accentColor?: string
  }) => {
    const subAccounts = getAccountsFor(selected)
    return (
      <div>
        <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</label>
        {/* Step 1: Select wallet type */}
        <div className="flex gap-2 mb-2">
          {WALLET_TYPES.map((w) => (
            <button key={w.value} onClick={() => onSelect(w.value)}
              className="flex-1 flex flex-col items-center py-2.5 rounded-xl text-xs transition-all"
              style={{
                background: selected === w.value ? `${accentColor}20` : 'var(--surface-3)',
                border:    `1px solid ${selected === w.value ? accentColor + '50' : 'rgba(34,197,94,0.15)'}`,
                color:      selected === w.value ? accentColor : 'var(--text-secondary)',
              }}>
              <span className="text-base mb-0.5">{w.icon}</span>
              <span className="text-[9px]">{w.label}</span>
            </button>
          ))}
        </div>
        {/* Step 2: Select child account (if bank or ewallet) */}
        {subAccounts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {subAccounts.map((acc) => (
              <button key={acc.id}
                onClick={() => onSelectAccount(selectedAccount === acc.id ? '' : acc.id)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1"
                style={{
                  background: selectedAccount === acc.id ? `${accentColor}25` : 'var(--surface-3)',
                  border:    `1px solid ${selectedAccount === acc.id ? accentColor + '60' : 'rgba(34,197,94,0.12)'}`,
                  color:      selectedAccount === acc.id ? accentColor : 'var(--text-secondary)',
                }}>
                {selectedAccount === acc.id && <span style={{ fontSize: 9 }}>✓</span>}
                {acc.name}
              </button>
            ))}
          </div>
        )}
        {/* Hint when bank/ewallet selected but no accounts added yet */}
        {(selected === 'bank' || selected === 'ewallet') && subAccounts.length === 0 && (
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
            Tambah akun di Pengaturan untuk tracking lebih detail
          </p>
        )}
      </div>
    )
  }

  const handleSave = async () => {
    const raw = getRawAmount()
    if (!raw || raw <= 0)         { toast.error('Masukkan jumlah yang valid'); return }
    if (!categoryId && type !== 'transfer') { toast.error('Pilih kategori'); return }

    // For transfer: allow same type (bank→bank, ewallet→ewallet), but not same account
    if (type === 'transfer') {
      const sameWalletType    = wallet === toWallet
      const sameAccountId     = walletAccountId && toWalletAccountId && walletAccountId === toWalletAccountId
      if (sameWalletType && !walletAccountId && !toWalletAccountId) {
        toast.error('Pilih akun yang berbeda untuk transfer'); return
      }
      if (sameAccountId) {
        toast.error('Akun asal dan tujuan tidak boleh sama'); return
      }
    }

    setSaving(true)
    try {
      const data = {
        type, amount: raw,
        categoryId:       categoryId || 'transfer',
        description:      description ? capitalizeWords(description) : '',
        date, wallet,
        toWallet:         type === 'transfer' ? toWallet          : undefined,
        walletAccountId:  walletAccountId     || undefined,
        toWalletAccountId: type === 'transfer' ? (toWalletAccountId || undefined) : undefined,
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
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          onClick={onClose}
        />
        <motion.div
          initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          className="relative w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', maxHeight: '92dvh', overflowY: 'auto' }}
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
            {/* Amount */}
            <div>
              <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>Jumlah (Rp)</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-sm font-bold select-none pointer-events-none" style={{ color: activeColor }}>
                  Rp
                </span>
                <input type="text" inputMode="numeric" className="input-glass text-lg font-bold"
                  style={{ paddingLeft: '3rem', color: activeColor }}
                  placeholder="0" value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                />
              </div>
            </div>

            {/* Category */}
            {type !== 'transfer' && (
              <div>
                <label className="text-xs mb-2 block font-semibold" style={{ color: 'var(--text-muted)' }}>
                  Kategori {filteredCategories.length === 0 && !catsLoading && (
                    <span style={{ color: 'var(--red)', fontWeight: 400 }}> — tambah di Pengaturan</span>
                  )}
                </label>
                {catsLoading ? (
                  <div className="grid grid-cols-4 gap-2">
                    {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-4 gap-2">
                      {filteredCategories.slice(0, 8).map((cat) => (
                        <button key={cat.id} onClick={() => setCategoryId(cat.id)}
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
                      <select className="input-glass mt-2 text-sm" value={categoryId}
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

            {/* Wallet Selection */}
            {type !== 'transfer' ? (
              // Income / Expense: single wallet picker
              <WalletPicker
                label="Wallet"
                selected={wallet}
                onSelect={handleSetWallet}
                selectedAccount={walletAccountId}
                onSelectAccount={setWalletAccountId}
                accentColor={activeColor}
              />
            ) : (
              // Transfer: two wallet pickers
              <div className="grid grid-cols-2 gap-3">
                <WalletPicker
                  label="Dari Wallet"
                  selected={wallet}
                  onSelect={handleSetWallet}
                  selectedAccount={walletAccountId}
                  onSelectAccount={setWalletAccountId}
                  accentColor="var(--red)"
                />
                <div className="flex items-center justify-center pt-5">
                  <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
                </div>
                {/* "Ke Wallet" next to the arrow on the right — but we need a full column layout */}
              </div>
            )}

            {/* Transfer second wallet in full width below */}
            {type === 'transfer' && (
              <WalletPicker
                label="Ke Wallet"
                selected={toWallet}
                onSelect={handleSetToWallet}
                selectedAccount={toWalletAccountId}
                onSelectAccount={setToWalletAccountId}
                accentColor="var(--accent)"
              />
            )}

            {/* Date + Description */}
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>Tanggal</label>
                <input type="date" className="input-glass text-sm" value={date}
                  onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>
                  Keterangan
                  <span className="ml-1 text-[9px] font-normal px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(52,211,110,0.12)', color: 'var(--accent)' }}>opsional</span>
                </label>
                <input type="text" className="input-glass text-sm" placeholder="Catatan transaksi"
                  value={description} onChange={(e) => setDescription(capitalizeWords(e.target.value))} />
              </div>
            </div>

            {/* Save */}
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
