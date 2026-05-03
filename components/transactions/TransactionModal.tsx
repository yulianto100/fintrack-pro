'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, ChevronRight, Search, User, CheckCircle2, AlertCircle } from 'lucide-react'
import { useTransactions } from '@/hooks/useTransactions'
import { useApiList } from '@/hooks/useApiData'
import type { Category, Transaction, TransactionType, WalletType, WalletAccount, CreditCard } from '@/types'
import { capitalizeWords, formatCurrency } from '@/lib/utils'
import { autoCategorize, learnCategoryMapping } from '@/lib/categorization'
import toast from 'react-hot-toast'
import type { RecurringFrequency } from '@/types'

const RECURRING_FREQS: { value: RecurringFrequency; label: string; icon: string }[] = [
  { value: 'daily',   label: 'Harian',   icon: '🌅' },
  { value: 'weekly',  label: 'Mingguan', icon: '📅' },
  { value: 'monthly', label: 'Bulanan',  icon: '🗓️' },
]

interface Props {
  transaction?: Transaction
  defaultType?: TransactionType
  onClose: (updated?: Transaction) => void
}

const TABS = [
  { type: 'expense'  as TransactionType, icon: <ArrowDownCircle size={16}/>, label: 'Keluar',   color: 'var(--red)'    },
  { type: 'income'   as TransactionType, icon: <ArrowUpCircle   size={16}/>, label: 'Masuk',    color: 'var(--accent)' },
  { type: 'transfer' as TransactionType, icon: <ArrowLeftRight  size={16}/>, label: 'Transfer', color: 'var(--blue)'   },
]

const WALLET_TYPES: { value: WalletType; icon: string; label: string }[] = [
  { value: 'cash',    icon: '💵', label: 'Cash'    },
  { value: 'bank',    icon: '🏦', label: 'Bank'    },
  { value: 'ewallet', icon: '📱', label: 'E-Wallet'},
]

// ─── Target user lookup result ────────────────────────────────────────────────
interface LookupResult {
  userId: string
  username: string
  displayName: string
  walletAccounts: { id: string; name: string; type: string }[]
}

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
  const [wallet,            setWallet           ] = useState<WalletType>(transaction?.wallet   || 'cash')
  const [toWallet,          setToWallet         ] = useState<WalletType>(transaction?.toWallet || 'bank')
  const [walletAccountId,   setWalletAccountId  ] = useState<string>(transaction?.walletAccountId   || '')
  const [toWalletAccountId, setToWalletAccountId] = useState<string>(transaction?.toWalletAccountId || '')

  // ── Credit card state ──────────────────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'credit_card'>('wallet')
  const [creditCardId,  setCreditCardId ] = useState<string>('')

  const { data: creditCards } = useApiList<CreditCard>('/api/credit-cards')

  // Transfer mode: 'internal' = between own wallets, 'external' = to another user
  const [transferMode, setTransferMode] = useState<'internal' | 'external'>('internal')

  // External transfer state
  const [lookupUsername,  setLookupUsername ] = useState('')
  const [lookupResult,    setLookupResult   ] = useState<LookupResult | null>(null)
  const [lookupError,     setLookupError    ] = useState('')
  const [lookupLoading,   setLookupLoading  ] = useState(false)
  const [toExtAccountId,  setToExtAccountId ] = useState('')
  const [toExtWalletType, setToExtWalletType] = useState('')
  const lookupDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Recurring transaction toggle
  const [isRecurring,        setIsRecurring       ] = useState(false)
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency>('monthly')
  const [autoSuggestedCat,   setAutoSuggestedCat  ] = useState('')

  // All wallet accounts from the API
  const [walletAccounts, setWalletAccounts] = useState<WalletAccount[]>([])
  useEffect(() => {
    fetch('/api/wallet-accounts').then((r) => r.json()).then((j) => {
      if (j.success) setWalletAccounts(j.data || [])
    })
  }, [])

  const bankAccounts    = walletAccounts.filter((a) => a.type === 'bank')
  const ewalletAccounts = walletAccounts.filter((a) => a.type === 'ewallet')

  const handleSetWallet   = (w: WalletType) => { setWallet(w);   setWalletAccountId('') }
  const handleSetToWallet = (w: WalletType) => { setToWallet(w); setToWalletAccountId('') }

  // Auto-categorize on description change
  const handleDescriptionChange = (val: string) => {
    setDescription(capitalizeWords(val))
    if (!categoryId && type !== 'transfer' && val.length >= 3) {
      const suggested = autoCategorize(val, categories, type as 'income' | 'expense')
      if (suggested) {
        setCategoryId(suggested)
        const catName = categories.find((c) => c.id === suggested)?.name || ''
        setAutoSuggestedCat(catName)
      }
    }
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

  const getAccountsFor = (w: WalletType) => {
    if (w === 'bank')    return bankAccounts
    if (w === 'ewallet') return ewalletAccounts
    return []
  }

  // ── Username lookup with debounce ──────────────────────────────────────────
  const doLookup = useCallback(async (username: string) => {
    if (!username || username.length < 2) {
      setLookupResult(null); setLookupError(''); return
    }
    setLookupLoading(true); setLookupError(''); setLookupResult(null)
    setToExtAccountId(''); setToExtWalletType('')
    try {
      const res  = await fetch(`/api/users/lookup?username=${encodeURIComponent(username)}`)
      const json = await res.json()
      if (!json.success) { setLookupError(json.error || 'User tidak ditemukan'); return }
      setLookupResult(json.data)
      if (json.data.walletAccounts.length === 0) setLookupError('User ini belum punya akun bank/ewallet terdaftar')
    } catch {
      setLookupError('Gagal mencari user')
    } finally {
      setLookupLoading(false)
    }
  }, [])

  const handleLookupChange = (val: string) => {
    const clean = val.replace(/\s/g, '').replace('@', '')
    setLookupUsername(clean)
    if (lookupDebounceRef.current) clearTimeout(lookupDebounceRef.current)
    lookupDebounceRef.current = setTimeout(() => doLookup(clean), 600)
  }

  // ── WalletPicker (reusable inner component) ────────────────────────────────
  const WalletPicker = ({
    label, selected, onSelect, selectedAccount, onSelectAccount, accentColor = activeColor,
  }: {
    label: string; selected: WalletType; onSelect: (w: WalletType) => void
    selectedAccount: string; onSelectAccount: (id: string) => void; accentColor?: string
  }) => {
    const subAccounts = getAccountsFor(selected)
    return (
      <div>
        <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</label>
        <div className="flex gap-2 mb-2">
          {WALLET_TYPES.map((w) => (
            <button key={w.value} onClick={() => onSelect(w.value)}
              className="flex-1 flex flex-col items-center py-2.5 rounded-xl text-xs transition-all"
              style={{
                background: selected === w.value ? `${accentColor}20` : 'var(--surface-btn)',
                border:    `1px solid ${selected === w.value ? accentColor + '50' : 'rgba(34,197,94,0.15)'}`,
                color:      selected === w.value ? accentColor : 'var(--text-secondary)',
              }}>
              <span className="text-base mb-0.5">{w.icon}</span>
              <span className="text-[9px]">{w.label}</span>
            </button>
          ))}
        </div>
        {subAccounts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {subAccounts.map((acc) => (
              <button key={acc.id}
                onClick={() => onSelectAccount(selectedAccount === acc.id ? '' : acc.id)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1"
                style={{
                  background: selectedAccount === acc.id ? `${accentColor}25` : 'var(--surface-btn)',
                  border:    `1px solid ${selectedAccount === acc.id ? accentColor + '60' : 'rgba(34,197,94,0.12)'}`,
                  color:      selectedAccount === acc.id ? accentColor : 'var(--text-secondary)',
                }}>
                {selectedAccount === acc.id && <span style={{ fontSize: 9 }}>✓</span>}
                {acc.name}
              </button>
            ))}
          </div>
        )}
        {(selected === 'bank' || selected === 'ewallet') && subAccounts.length === 0 && (
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
            Tambah akun di Pengaturan untuk tracking lebih detail
          </p>
        )}
      </div>
    )
  }

  // ── Save handlers ──────────────────────────────────────────────────────────
  const handleSaveExternal = async () => {
    const raw = getRawAmount()
    if (!raw || raw <= 0)    { toast.error('Masukkan jumlah yang valid'); return }
    if (!lookupResult)       { toast.error('Cari username tujuan dulu');  return }
    if (!toExtAccountId)     { toast.error('Pilih akun tujuan penerima'); return }

    setSaving(true)
    try {
      const res  = await fetch('/api/transfers/external', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: raw,
          fromWallet: wallet,
          fromWalletAccountId: walletAccountId || undefined,
          toUserId: lookupResult.userId,
          toUserName: lookupResult.username,
          toWalletAccountId: toExtAccountId,
          toWalletType: toExtWalletType,
          date,
          description: description || `Transfer ke @${lookupResult.username}`,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)

      toast.success(`✓ Transfer ke @${lookupResult.username} berhasil!`)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal transfer'
      // Show saldo info in error
      if (msg.includes('Saldo tidak cukup')) toast.error(msg, { duration: 5000 })
      else toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    if (type === 'transfer' && transferMode === 'external') {
      await handleSaveExternal(); return
    }

    const raw = getRawAmount()
    if (!raw || raw <= 0)         { toast.error('Masukkan jumlah yang valid'); return }
    if (!categoryId && type !== 'transfer') { toast.error('Pilih kategori'); return }

    if (type === 'transfer') {
      const sameAccountId = walletAccountId && toWalletAccountId && walletAccountId === toWalletAccountId
      if (wallet === toWallet && !walletAccountId && !toWalletAccountId) {
        toast.error('Pilih akun yang berbeda untuk transfer'); return
      }
      if (sameAccountId) {
        toast.error('Akun asal dan tujuan tidak boleh sama'); return
      }
    }

    // Validate credit card selection
    if (type === 'expense' && paymentMethod === 'credit_card') {
      if (!creditCardId) { toast.error('Pilih kartu kredit'); return }
      const card = creditCards.find((c) => c.id === creditCardId)
      if (!card) { toast.error('Kartu kredit tidak ditemukan'); return }
      const remaining = card.limit - card.used
      if (raw > remaining) {
        toast.error(`Melebihi sisa limit. Sisa: Rp ${remaining.toLocaleString('id-ID')}`)
        return
      }
    }

    setSaving(true)
    try {
      const isCreditCard = type === 'expense' && paymentMethod === 'credit_card'
      const data = {
        type, amount: raw,
        categoryId:        categoryId || 'transfer',
        description:       description ? capitalizeWords(description) : '',
        date, wallet,
        toWallet:          type === 'transfer' ? toWallet           : undefined,
        walletAccountId:   isCreditCard ? undefined : (walletAccountId || undefined),
        toWalletAccountId: type === 'transfer' ? (toWalletAccountId || undefined) : undefined,
        // ── Credit card fields ──────────────────────────────────────────────
        paymentMethod:     isCreditCard ? 'credit_card' : 'wallet',
        creditCardId:      isCreditCard ? creditCardId  : undefined,
        creditCardName:    isCreditCard
          ? creditCards.find((c) => c.id === creditCardId)?.name
          : undefined,
      }
      let result
      if (isEdit) result = await updateTransaction(transaction.id, data)
      else        result = await addTransaction(data)

      // Learn category mapping from description if user selected a category
      if (!isEdit && description && categoryId && type !== 'transfer') {
        const catName = categories.find((c) => c.id === categoryId)?.name
        if (catName) learnCategoryMapping(description.toLowerCase().split(' ')[0], catName)
      }

      // Save recurring transaction if toggled
      if (!isEdit && isRecurring && type !== 'transfer' && categoryId) {
        const cat = categories.find((c) => c.id === categoryId)
        await fetch('/api/recurring-transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type, amount: raw,
            categoryId, categoryName: cat?.name, categoryIcon: cat?.icon,
            wallet, walletAccountId: walletAccountId || undefined,
            description: description || '',
            frequency: recurringFrequency,
          }),
        })
        toast.success('Transaksi berulang dibuat! 🔁')
      }

      onClose(result)
    } finally {
      setSaving(false)
    }
  }

  // ── External transfer receiver account picker ──────────────────────────────
  const ExtAccountPicker = () => {
    if (!lookupResult) return null
    const { walletAccounts: extAccounts } = lookupResult
    if (extAccounts.length === 0) return null

    return (
      <div>
        <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>
          Akun Tujuan @{lookupResult.username}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {extAccounts.map((acc) => (
            <button key={acc.id}
              onClick={() => { setToExtAccountId(acc.id); setToExtWalletType(acc.type) }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={{
                background: toExtAccountId === acc.id ? 'rgba(34,197,94,0.15)' : 'var(--surface-btn)',
                border: `1px solid ${toExtAccountId === acc.id ? 'rgba(34,197,94,0.30)' : 'rgba(34,197,94,0.15)'}`,
                color: toExtAccountId === acc.id ? 'var(--accent)' : 'var(--text-secondary)',
              }}>
              <span>{acc.type === 'bank' ? '🏦' : '📱'}</span>
              {acc.name}
              {toExtAccountId === acc.id && <CheckCircle2 size={11} color="var(--accent)" />}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          onClick={() => onClose()}
        />
        <motion.div
          initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          className="relative w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl"
          style={{ background: 'var(--surface-modal)', border: '1px solid var(--border)', maxHeight: '92dvh', overflowY: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="drag-indicator mt-3 sm:hidden" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
              {isEdit ? 'Edit Transaksi' : 'Tambah Transaksi'}
            </h2>
            <button onClick={() => onClose()}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'var(--surface-close)', color: 'var(--text-secondary)' }}>
              <X size={18} />
            </button>
          </div>

          {/* Type tabs */}
          <div className="flex gap-2 px-5 mb-5">
            {TABS.map((tab) => (
              <button key={tab.type}
                onClick={() => { setType(tab.type); setCategoryId(''); setTransferMode('internal') }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium"
                style={{
                  background: type === tab.type ? `${tab.color}20` : 'var(--surface-btn-sm)',
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

            {/* Description — moved below amount */}
            <div>
              <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>
                Keterangan
                <span className="ml-1 text-[9px] font-normal px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(34,197,94,0.10)', color: 'var(--accent)' }}>opsional</span>
                {autoSuggestedCat && !categoryId && (
                  <span className="ml-1 text-[9px] font-normal px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--accent)' }}>
                    🤖 Auto: {autoSuggestedCat}
                  </span>
                )}
              </label>
              <input type="text" className="input-glass text-sm" placeholder="Catatan transaksi"
                value={description} onChange={(e) => handleDescriptionChange(e.target.value)} />
            </div>

            {/* Category — skip for transfer */}
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
                            background: categoryId === cat.id ? `${cat.color}25` : 'var(--surface-btn)',
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

            {/* ── TRANSFER MODE TOGGLE ─────────────────────────────────────── */}
            {type === 'transfer' && !isEdit && (
              <div>
                <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>
                  Jenis Transfer
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'internal' as const, icon: '🔄', label: 'Wallet Sendiri', desc: 'Antar dompetmu' },
                    { value: 'external' as const, icon: '👤', label: 'Ke User Lain',   desc: 'Kirim ke pengguna' },
                  ].map((m) => (
                    <button key={m.value}
                      onClick={() => setTransferMode(m.value)}
                      className="py-3 px-3 rounded-xl text-left transition-all"
                      style={{
                        background: transferMode === m.value ? 'rgba(99,179,237,0.15)' : 'var(--surface-btn)',
                        border: `1px solid ${transferMode === m.value ? 'rgba(99,179,237,0.5)' : 'var(--border)'}`,
                      }}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-base">{m.icon}</span>
                        <p className="text-xs font-bold" style={{ color: transferMode === m.value ? 'var(--blue)' : 'var(--text-primary)' }}>
                          {m.label}
                        </p>
                      </div>
                      <p className="text-[10px] ml-6" style={{ color: 'var(--text-muted)' }}>{m.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── PAYMENT METHOD (expenses only) ─────────────────────────────── */}
            {type === 'expense' && (
              <div>
                <label className="text-xs mb-2 block font-semibold" style={{ color: 'var(--text-muted)' }}>
                  METODE BAYAR
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'wallet'      as const, icon: '👛', label: 'Dompet / Bank' },
                    { value: 'credit_card' as const, icon: '💳', label: 'Kartu Kredit'  },
                  ].map((m) => (
                    <button
                      key={m.value}
                      onClick={() => { setPaymentMethod(m.value); setCreditCardId('') }}
                      className="py-2.5 px-3 rounded-xl text-left transition-all"
                      style={{
                        background: paymentMethod === m.value ? 'rgba(34,197,94,0.12)' : 'var(--surface-btn)',
                        border: `1px solid ${paymentMethod === m.value ? 'rgba(34,197,94,0.35)' : 'var(--border)'}`,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{m.icon}</span>
                        <p className="text-xs font-semibold"
                          style={{ color: paymentMethod === m.value ? 'var(--accent)' : 'var(--text-primary)' }}>
                          {m.label}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                {paymentMethod === 'credit_card' && (
                  <div className="mt-3">
                    {creditCards.length === 0 ? (
                      <p className="text-xs py-2 text-center" style={{ color: 'var(--text-muted)' }}>
                        Belum ada kartu kredit. Tambah di halaman{' '}
                        <a href="/credit-card" style={{ color: 'var(--accent)' }}>Kartu Kredit</a>.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {creditCards.map((card) => {
                          const remaining = card.limit - card.used
                          const pct       = card.limit > 0 ? (card.used / card.limit) * 100 : 0
                          const barColor  = pct >= 80 ? '#ef4444' : pct >= 50 ? '#f59e0b' : '#22c55e'
                          return (
                            <button
                              key={card.id}
                              onClick={() => setCreditCardId(card.id)}
                              className="p-3 rounded-xl text-left transition-all"
                              style={{
                                background: creditCardId === card.id ? 'rgba(34,197,94,0.10)' : 'var(--surface-btn)',
                                border: `1px solid ${creditCardId === card.id ? 'rgba(34,197,94,0.30)' : 'var(--border)'}`,
                              }}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                  {card.name}
                                </p>
                                {creditCardId === card.id && (
                                  <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>✓</span>
                                )}
                              </div>
                              <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                <span>Sisa: <b style={{ color: barColor }}>Rp {remaining.toLocaleString('id-ID')}</b></span>
                                <span>{pct.toFixed(0)}% terpakai</span>
                              </div>
                              <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                                <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── INTERNAL TRANSFER WALLETS ─────────────────────────────────── */}
            {type !== 'transfer' ? (
              !(type === 'expense' && paymentMethod === 'credit_card') && <WalletPicker
                label="Wallet"
                selected={wallet}
                onSelect={handleSetWallet}
                selectedAccount={walletAccountId}
                onSelectAccount={setWalletAccountId}
                accentColor={activeColor}
              />
            ) : transferMode === 'internal' ? (
              <>
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
                </div>
                <WalletPicker
                  label="Ke Wallet"
                  selected={toWallet}
                  onSelect={handleSetToWallet}
                  selectedAccount={toWalletAccountId}
                  onSelectAccount={setToWalletAccountId}
                  accentColor="var(--accent)"
                />
              </>
            ) : (
              /* ── EXTERNAL TRANSFER SECTION ─────────────────────────────── */
              <div className="space-y-4">
                {/* Source wallet (sender) */}
                <WalletPicker
                  label="Dari Wallet Kamu"
                  selected={wallet}
                  onSelect={handleSetWallet}
                  selectedAccount={walletAccountId}
                  onSelectAccount={setWalletAccountId}
                  accentColor="var(--red)"
                />

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: 'rgba(99,179,237,0.12)', color: 'var(--blue)' }}>
                    ↓ kirim ke
                  </span>
                  <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                </div>

                {/* Username search */}
                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Username Tujuan
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm select-none pointer-events-none"
                      style={{ color: 'var(--text-muted)' }}>@</span>
                    <input
                      type="text" className="input-glass"
                      style={{ paddingLeft: '1.75rem', paddingRight: '2.5rem' }}
                      placeholder="username"
                      value={lookupUsername}
                      onChange={(e) => handleLookupChange(e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      {lookupLoading
                        ? <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                        : <Search size={14} style={{ color: 'var(--text-muted)' }} />
                      }
                    </span>
                  </div>

                  {/* Error state */}
                  {lookupError && (
                    <div className="flex items-center gap-1.5 mt-2 p-2.5 rounded-xl"
                      style={{ background: 'rgba(252,129,129,0.1)', border: '1px solid rgba(252,129,129,0.2)' }}>
                      <AlertCircle size={13} color="var(--red)" />
                      <p className="text-xs" style={{ color: 'var(--red)' }}>{lookupError}</p>
                    </div>
                  )}

                  {/* Found user card */}
                  {lookupResult && !lookupError && (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-2 p-3 rounded-xl flex items-center gap-3"
                      style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.16)' }}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ background: 'rgba(34,197,94,0.12)', color: 'var(--accent)' }}>
                        <User size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                          {lookupResult.displayName}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          @{lookupResult.username} · {lookupResult.walletAccounts.length} akun terdaftar
                        </p>
                      </div>
                      <CheckCircle2 size={18} color="var(--accent)" className="ml-auto flex-shrink-0" />
                    </motion.div>
                  )}
                </div>

                {/* Receiver account picker */}
                {lookupResult && lookupResult.walletAccounts.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                    <ExtAccountPicker />
                  </motion.div>
                )}

                {/* Transfer preview */}
                {lookupResult && toExtAccountId && getRawAmount() > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="p-3.5 rounded-xl space-y-1.5"
                    style={{ background: 'rgba(99,179,237,0.08)', border: '1px solid rgba(99,179,237,0.2)' }}>
                    <p className="text-xs font-semibold" style={{ color: 'var(--blue)' }}>Preview Transfer</p>
                    {[
                      { label: 'Jumlah',  value: formatCurrency(getRawAmount()) },
                      { label: 'Ke',      value: `@${lookupResult.username} (${lookupResult.walletAccounts.find(a => a.id === toExtAccountId)?.name || ''})` },
                      { label: 'Dari',    value: `${wallet}${walletAccountId ? ` · ${walletAccounts.find(a => a.id === walletAccountId)?.name || ''}` : ''}` },
                    ].map((r) => (
                      <div key={r.label} className="flex justify-between text-xs">
                        <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{r.value}</span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>
            )}

            {/* Date */}
            <div>
              <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>Tanggal</label>
              <input type="date" className="input-glass text-sm" value={date}
                onChange={(e) => setDate(e.target.value)} />
            </div>

            {/* Recurring toggle — only for income/expense, not edit mode */}
            {!isEdit && type !== 'transfer' && (
              <div className="rounded-2xl p-4" style={{ background: isRecurring ? 'rgba(34,197,94,0.07)' : 'var(--surface-subtle)', border: `1px solid ${isRecurring ? 'rgba(34,197,94,0.25)' : 'var(--border)'}` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔁</span>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Jadikan Berulang
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        Otomatis dicatat sesuai frekuensi
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsRecurring((v) => !v)}
                    className="relative w-12 h-6 rounded-full transition-all flex-shrink-0"
                    style={{ background: isRecurring ? 'var(--accent)' : 'rgba(0,0,0,0.15)' }}
                  >
                    <div className="absolute top-0.5 transition-all rounded-full w-5 h-5 bg-white shadow-sm"
                      style={{ left: isRecurring ? '26px' : '2px' }} />
                  </button>
                </div>
                {isRecurring && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {RECURRING_FREQS.map((f) => (
                      <button key={f.value}
                        onClick={() => setRecurringFrequency(f.value)}
                        className="py-2 rounded-xl text-xs font-semibold transition-all"
                        style={{
                          background: recurringFrequency === f.value ? 'var(--accent)' : 'var(--surface-btn-sm)',
                          color: recurringFrequency === f.value ? '#fff' : 'var(--text-muted)',
                          border: `1px solid ${recurringFrequency === f.value ? 'var(--accent)' : 'var(--border)'}`,
                        }}>
                        {f.icon} {f.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 flex items-center justify-center gap-2 rounded-2xl font-semibold text-base transition-all active:scale-[0.98]"
              style={{
                background: saving
                  ? 'rgba(34,197,94,0.55)'
                  : type === 'expense'
                    ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                    : type === 'income'
                      ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                      : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: '#fff',
                border: 'none',
                boxShadow: saving ? 'none' : '0 4px 16px rgba(0,0,0,0.18)',
                opacity: saving ? 0.7 : 1,
                cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-space)',
              }}>
              {saving
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                : <span className="tracking-wide">
                    {type === 'transfer' && transferMode === 'external'
                      ? `💸 Kirim${lookupResult ? ` ke @${lookupResult.username}` : ''}`
                      : isEdit ? '✓ Simpan Perubahan' : '+ Tambah Transaksi'
                    }
                  </span>
              }
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
