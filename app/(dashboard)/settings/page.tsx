'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { signOut, useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useApiList } from '@/hooks/useApiData'
import {
  Bell, BellOff, Download, Upload, LogOut, Tag, Plus, Trash2, X,
  Landmark, Wallet, Pencil, Check, Lock, ChevronDown, ChevronUp,
} from 'lucide-react'
import type { Category, WalletAccount, WalletAccountType } from '@/types'
import toast from 'react-hot-toast'

// Default suggestions for quick-add
const BANK_SUGGESTIONS  = ['BCA', 'Mandiri', 'BRI', 'BNI', 'CIMB Niaga', 'Jago', 'Sinarmas', 'Danamon', 'Permata', 'BTN']
const EWALLET_SUGGESTIONS = ['GoPay', 'OVO', 'ShopeePay', 'Dana', 'LinkAja', 'Blu', 'Jenius', 'SeaBank']

interface WalletAccountForm { type: WalletAccountType; name: string }

export default function SettingsPage() {
  const { data: session } = useSession()
  const { supported, subscribed, loading: notifLoading, subscribe, unsubscribe } = usePushNotifications()

  // Categories
  const { data: categories, refetch: refetchCats } = useApiList<Category>('/api/categories', { refreshMs: 5000 })

  // Wallet accounts
  const [walletAccounts, setWalletAccounts] = useState<WalletAccount[]>([])
  const [loadingWallets, setLoadingWallets] = useState(true)

  // Modals
  const [showCatModal,    setShowCatModal   ] = useState(false)
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [editingWallet,   setEditingWallet  ] = useState<WalletAccount | null>(null)
  const [walletForm,      setWalletForm     ] = useState<WalletAccountForm>({ type: 'bank', name: '' })

  const [catForm, setCatForm] = useState({ name: '', icon: '📋', type: 'expense', color: '#22c55e' })
  const [saving,  setSaving ] = useState(false)
  // ── Expand/collapse for wallet sections ──
  const [bankExpanded,    setBankExpanded   ] = useState(false)
  const [ewalletExpanded, setEwalletExpanded] = useState(false)

  const incomeCategories  = categories.filter((c) => c.type === 'income')
  const expenseCategories = categories.filter((c) => c.type === 'expense')
  const bankAccounts      = walletAccounts.filter((a) => a.type === 'bank')
  const ewalletAccounts   = walletAccounts.filter((a) => a.type === 'ewallet')

  const fetchWalletAccounts = async () => {
    setLoadingWallets(true)
    try {
      // Sync balances first so the lock indicator is accurate
      await fetch('/api/wallet-accounts/sync', { method: 'POST' })
      const res  = await fetch('/api/wallet-accounts')
      const json = await res.json()
      if (json.success) setWalletAccounts(json.data || [])
    } catch { /* silent */ }
    finally { setLoadingWallets(false) }
  }

  useEffect(() => { fetchWalletAccounts() }, [])

  // ── Export / Import ──
  const handleExport = () => {
    const a = document.createElement('a'); a.href = '/api/export'; a.click()
    toast.success('Export dimulai...')
  }
  const handleExportJSON = async () => {
    const res  = await fetch('/api/export?format=json')
    const json = await res.json()
    const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `fintrack-backup-${new Date().toISOString().split('T')[0]}.json`; a.click()
    URL.revokeObjectURL(url)
    toast.success('Backup JSON berhasil!')
  }
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      if (!data.transactions) { toast.error('Format file tidak valid'); return }
      const res  = await fetch('/api/transactions', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: data.transactions }),
      })
      const json = await res.json()
      if (json.success) toast.success(`${json.data.imported} transaksi berhasil diimport!`)
      else toast.error('Import gagal')
    } catch { toast.error('Format file tidak valid') }
  }

  // ── Category handlers ──
  const handleAddCategory = async () => {
    if (!catForm.name) { toast.error('Nama kategori wajib diisi'); return }
    setSaving(true)
    try {
      const res  = await fetch('/api/categories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(catForm),
      })
      const json = await res.json()
      if (!json.success) throw new Error()
      toast.success('Kategori ditambahkan! ✓')
      setShowCatModal(false)
      setCatForm({ name: '', icon: '📋', type: 'expense', color: '#22c55e' })
      refetchCats()
    } catch { toast.error('Gagal menambahkan kategori') }
    finally   { setSaving(false) }
  }
  const handleDeleteCat = async (id: string) => {
    if (!confirm('Hapus kategori ini?')) return
    await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    toast.success('Kategori dihapus')
    refetchCats()
  }

  // ── Wallet account handlers ──
  const handleOpenAddWallet = (type: WalletAccountType) => {
    setEditingWallet(null)
    setWalletForm({ type, name: '' })
    setShowWalletModal(true)
  }
  const handleOpenEditWallet = (account: WalletAccount) => {
    setEditingWallet(account)
    setWalletForm({ type: account.type, name: account.name })
    setShowWalletModal(true)
  }
  const handleSaveWallet = async () => {
    if (!walletForm.name.trim()) { toast.error('Nama akun wajib diisi'); return }
    setSaving(true)
    try {
      if (editingWallet) {
        const res  = await fetch(`/api/wallet-accounts/${editingWallet.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: walletForm.name.trim() }),
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.error)
        toast.success('Akun berhasil diperbarui! ✓')
      } else {
        const res  = await fetch('/api/wallet-accounts', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: walletForm.type, name: walletForm.name.trim() }),
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.error)
        toast.success('Akun berhasil ditambahkan! ✓')
      }
      setShowWalletModal(false)
      fetchWalletAccounts()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan akun')
    } finally { setSaving(false) }
  }
  const handleDeleteWallet = async (id: string, name: string) => {
    if (!confirm(`Hapus akun "${name}"?\n\nAkun hanya bisa dihapus jika tidak memiliki transaksi terkait.`)) return
    try {
      const res  = await fetch(`/api/wallet-accounts/${id}`, { method: 'DELETE' })
      const json = await res.json()

      if (!json.success) {
        if (json.code === 'HAS_TRANSACTIONS') {
          // Rich error: account has linked transactions
          toast.error(
            (t) => (
              <div style={{ maxWidth: 280 }}>
                <p className="font-semibold text-sm mb-1">❌ Tidak bisa dihapus</p>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  <strong>{name}</strong> memiliki{' '}
                  <strong>{json.count} transaksi</strong> terkait.
                  Hapus atau pindahkan transaksi tersebut terlebih dahulu.
                </p>
              </div>
            ),
            { duration: 5000, icon: null }
          )
        } else {
          toast.error(json.error || 'Gagal menghapus akun')
        }
        return
      }

      toast.success(`Akun "${name}" berhasil dihapus`)
      fetchWalletAccounts()
    } catch {
      toast.error('Gagal menghapus akun')
    }
  }

  const CatSection = ({ label, cats }: { label: string; cats: Category[] }) => (
    <div>
      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {cats.length === 0 ? (
        <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>Belum ada kategori</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => (
            <div key={c.id}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg group cursor-default"
              style={{ background: `${c.color}15`, border: `1px solid ${c.color}35` }}>
              <span className="text-sm">{c.icon}</span>
              <span className="text-xs font-medium" style={{ color: c.color }}>{c.name}</span>
              <button onClick={() => handleDeleteCat(c.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
                style={{ color: 'var(--red)' }}>
                <X size={11}/>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const WalletSection = ({
    label, accounts, type, color, bg, icon: Icon,
  }: {
    label: string; accounts: WalletAccount[]; type: WalletAccountType
    color: string; bg: string; icon: React.ElementType
  }) => (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: bg }}>
            <Icon size={14} color={color} />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
        </div>
        <button
          onClick={() => handleOpenAddWallet(type)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: bg, color, border: `1px solid ${color}40` }}>
          <Plus size={12}/> Tambah
        </button>
      </div>
      {loadingWallets ? (
        <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="skeleton h-10 rounded-xl" />)}</div>
      ) : accounts.length === 0 ? (
        <p className="text-xs italic py-2" style={{ color: 'var(--text-muted)' }}>
          Belum ada akun {label.toLowerCase()}. Tambah akun untuk mulai tracking.
        </p>
      ) : (
        <div className="space-y-2">
          {accounts.map((a) => {
            // An account is "protected" (has linked transactions) when balance !== 0
            // We use this as a proxy — actual protection is enforced server-side too
            const hasBalance   = a.balance !== 0
            const balanceColor = a.balance > 0 ? 'var(--accent)' : a.balance < 0 ? 'var(--red)' : 'var(--text-muted)'

            return (
              <div key={a.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.90)', border: `1px solid ${hasBalance ? color + '30' : 'var(--border)'}` }}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: bg, color }}>
                    {a.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{a.name}</span>
                    {/* Show balance if non-zero */}
                    {hasBalance && (
                      <p className="text-[10px] font-mono" style={{ color: balanceColor }}>
                        {a.balance > 0 ? '+' : ''}{a.balance.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleOpenEditWallet(a)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                    style={{ color: 'var(--text-muted)' }}>
                    <Pencil size={13}/>
                  </button>
                  {/* Delete button — shows lock icon when account has transactions */}
                  <button
                    onClick={() => handleDeleteWallet(a.id, a.name)}
                    title={hasBalance ? 'Akun memiliki transaksi — tidak bisa dihapus' : `Hapus ${a.name}`}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors relative"
                    style={{ color: hasBalance ? 'var(--text-muted)' : 'var(--red)', opacity: hasBalance ? 0.45 : 1 }}>
                    {hasBalance ? <Lock size={13}/> : <Trash2 size={13}/>}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  const suggestions = walletForm.type === 'bank' ? BANK_SUGGESTIONS : EWALLET_SUGGESTIONS

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-5">
      <h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>Pengaturan</h1>

      {/* Profile */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl overflow-hidden" style={{ boxShadow: '0 0 0 2px var(--accent)' }}>
            {session?.user?.image
              ? <Image src={session.user.image} alt="avatar" width={56} height={56}/>
              : <div className="w-full h-full flex items-center justify-center text-2xl"
                  style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                  {session?.user?.name?.[0]}
                </div>
            }
          </div>
          <div>
            <p className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>{session?.user?.name}</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{session?.user?.email}</p>
          </div>
        </div>
        <Link href="/profile">
          <div className="mt-4 w-full py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(34,197,94,0.22)', cursor: 'pointer' }}>
            ✏️ Edit Profil
          </div>
        </Link>
      </motion.div>

      {/* ── Bank Accounts ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="glass-card overflow-hidden">
        {/* Header — always visible, tap to expand/collapse */}
        <button
          className="w-full flex items-center gap-3 p-5 text-left transition-colors active:bg-black/[0.02]"
          onClick={() => setBankExpanded((v) => !v)}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(59,130,246,0.12)' }}>
            <Landmark size={18} color="#3b82f6"/>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Rekening Bank
              <span className="text-xs font-normal ml-1.5" style={{ color: 'var(--text-muted)' }}>
                ({bankAccounts.length})
              </span>
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Kelola rekening bank kamu</p>
          </div>
          <div className="flex-shrink-0 transition-transform duration-200"
            style={{ transform: bankExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <ChevronDown size={18} color="var(--text-muted)" />
          </div>
        </button>

        {/* Collapsible body */}
        <AnimatePresence initial={false}>
          {bankExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}>
              <div className="px-5 pb-5" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="pt-4">
                  <WalletSection
                    label="Bank" accounts={bankAccounts} type="bank"
                    color="#3b82f6" bg="rgba(59,130,246,0.12)" icon={Landmark}
                  />
                  {bankAccounts.some((a) => a.balance !== 0) && (
                    <div className="flex items-center gap-1.5 mt-2 px-1">
                      <Lock size={10} color="var(--text-muted)" />
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        Akun dengan saldo tidak bisa dihapus. Hapus transaksinya dulu.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── E-Wallet Accounts ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="glass-card overflow-hidden">
        {/* Header — always visible */}
        <button
          className="w-full flex items-center gap-3 p-5 text-left transition-colors active:bg-black/[0.02]"
          onClick={() => setEwalletExpanded((v) => !v)}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(168,85,247,0.12)' }}>
            <Wallet size={18} color="#a855f7"/>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              E-Wallet
              <span className="text-xs font-normal ml-1.5" style={{ color: 'var(--text-muted)' }}>
                ({ewalletAccounts.length})
              </span>
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Kelola dompet digital kamu</p>
          </div>
          <div className="flex-shrink-0 transition-transform duration-200"
            style={{ transform: ewalletExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <ChevronDown size={18} color="var(--text-muted)" />
          </div>
        </button>

        {/* Collapsible body */}
        <AnimatePresence initial={false}>
          {ewalletExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}>
              <div className="px-5 pb-5" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="pt-4">
                  <WalletSection
                    label="E-Wallet" accounts={ewalletAccounts} type="ewallet"
                    color="#a855f7" bg="rgba(168,85,247,0.12)" icon={Wallet}
                  />
                  {ewalletAccounts.some((a) => a.balance !== 0) && (
                    <div className="flex items-center gap-1.5 mt-2 px-1">
                      <Lock size={10} color="var(--text-muted)" />
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        Akun dengan saldo tidak bisa dihapus. Hapus transaksinya dulu.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Push notifications */}
      {supported && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(96,165,250,0.12)' }}>
              <Bell size={18} color="#60a5fa"/>
            </div>
            <div>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Push Notification</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Notifikasi jatuh tempo deposito</p>
            </div>
          </div>
          <button onClick={subscribed ? unsubscribe : subscribe} disabled={notifLoading}
            className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
            style={{
              background: subscribed ? 'var(--red-dim)'    : 'var(--accent-dim)',
              color:      subscribed ? 'var(--red)'        : 'var(--accent)',
              border:    `1px solid ${subscribed ? 'rgba(248,113,113,0.3)' : 'rgba(34,197,94,0.3)'}`,
            }}>
            {notifLoading
              ? <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin"/>
              : subscribed ? <><BellOff size={15}/> Nonaktifkan</> : <><Bell size={15}/> Aktifkan Notifikasi</>
            }
          </button>
        </motion.div>
      )}

      {/* Categories */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}
        className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(192,132,252,0.12)' }}>
              <Tag size={18} color="#c084fc"/>
            </div>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Kategori <span className="text-xs font-normal ml-1" style={{ color: 'var(--text-muted)' }}>({categories.length})</span>
            </p>
          </div>
          <button onClick={() => setShowCatModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(34,197,94,0.3)' }}>
            <Plus size={13}/> Tambah
          </button>
        </div>
        <div className="space-y-4">
          <CatSection label="Pemasukan"   cats={incomeCategories}  />
          <CatSection label="Pengeluaran" cats={expenseCategories} />
        </div>
      </motion.div>

      {/* Export / Import */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
        className="glass-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-dim)' }}>
            <Download size={18} color="var(--accent)"/>
          </div>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Export & Import</p>
        </div>
        <div className="space-y-2">
          {[
            { label: 'Export ke Excel (.xlsx)', onClick: handleExport,     color: 'var(--accent)',         bg: 'var(--accent-dim)' },
            { label: 'Backup JSON',             onClick: handleExportJSON, color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.88)' },
          ].map((b) => (
            <button key={b.label} onClick={b.onClick}
              className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
              style={{ background: b.bg, color: b.color, border: '1px solid var(--border)' }}>
              <Download size={15}/> {b.label}
            </button>
          ))}
          <label className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.90)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            <Upload size={15}/> Import dari JSON
            <input type="file" accept=".json" className="hidden" onChange={handleImport}/>
          </label>
          {/* CSV import shortcut */}
          <Link href="/import">
            <div className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
              style={{ background: 'rgba(99,179,237,0.08)', color: '#63b3ed', border: '1px solid rgba(99,179,237,0.2)' }}>
              <Upload size={15}/> Import Mutasi Bank (CSV)
            </div>
          </Link>
        </div>
      </motion.div>

      {/* Sign out */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <button onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold"
          style={{ background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid rgba(248,113,113,0.25)' }}>
          <LogOut size={16}/> Keluar dari Akun
        </button>
      </motion.div>

      {/* ── Add Category Modal ── */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
            onClick={() => setShowCatModal(false)} />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="relative w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl p-6"
            style={{ background: 'rgba(255,255,255,0.80)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Kategori Baru</h2>
              <button onClick={() => setShowCatModal(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.90)', color: 'var(--text-secondary)' }}>
                <X size={18}/>
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>Nama Kategori</label>
                  <input type="text" className="input-glass" placeholder="contoh: Gaji"
                    value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}/>
                </div>
                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>Emoji Icon</label>
                  <input type="text" className="input-glass text-center text-2xl" placeholder="📋"
                    value={catForm.icon} onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })}/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>Tipe</label>
                  <select className="input-glass" value={catForm.type}
                    onChange={(e) => setCatForm({ ...catForm, type: e.target.value })}>
                    <option value="income">Pemasukan</option>
                    <option value="expense">Pengeluaran</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>Warna</label>
                  <input type="color" className="input-glass h-11 p-1 cursor-pointer"
                    value={catForm.color} onChange={(e) => setCatForm({ ...catForm, color: e.target.value })}/>
                </div>
              </div>
              {catForm.name && (
                <div className="p-3 rounded-xl flex items-center gap-2"
                  style={{ background: `${catForm.color}15`, border: `1px solid ${catForm.color}35` }}>
                  <span className="text-xl">{catForm.icon}</span>
                  <span className="text-sm font-medium" style={{ color: catForm.color }}>{catForm.name}</span>
                </div>
              )}
              <button onClick={handleAddCategory} disabled={saving} className="btn-primary w-full py-3.5">
                {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"/> : 'Tambah Kategori'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Add/Edit Wallet Modal ── */}
      {showWalletModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
            onClick={() => setShowWalletModal(false)} />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="relative w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl p-6"
            style={{ background: 'rgba(255,255,255,0.80)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                {editingWallet ? 'Edit Akun' : `Tambah ${walletForm.type === 'bank' ? 'Rekening Bank' : 'E-Wallet'}`}
              </h2>
              <button onClick={() => setShowWalletModal(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.90)', color: 'var(--text-secondary)' }}>
                <X size={18}/>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>
                  Nama {walletForm.type === 'bank' ? 'Bank' : 'E-Wallet'}
                </label>
                <input type="text" className="input-glass" placeholder={walletForm.type === 'bank' ? 'contoh: BCA' : 'contoh: GoPay'}
                  value={walletForm.name}
                  onChange={(e) => {
                    const v = e.target.value
                    setWalletForm((p) => ({ ...p, name: v.charAt(0).toUpperCase() + v.slice(1) }))
                  }}/>
              </div>

              {/* Quick suggestions */}
              {!editingWallet && (
                <div>
                  <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Pilih cepat:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s) => (
                      <button key={s}
                        onClick={() => setWalletForm((p) => ({ ...p, name: s }))}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                        style={{
                          background: walletForm.name === s
                            ? (walletForm.type === 'bank' ? 'rgba(59,130,246,0.2)' : 'rgba(168,85,247,0.2)')
                            : 'rgba(255,255,255,0.88)',
                          color: walletForm.name === s
                            ? (walletForm.type === 'bank' ? '#3b82f6' : '#a855f7')
                            : 'var(--text-secondary)',
                          border: `1px solid ${walletForm.name === s
                            ? (walletForm.type === 'bank' ? '#3b82f640' : '#a855f740')
                            : 'var(--border)'}`,
                        }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={handleSaveWallet} disabled={saving || !walletForm.name.trim()}
                className="btn-primary w-full py-3.5 flex items-center justify-center gap-2">
                {saving
                  ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                  : <><Check size={15}/> {editingWallet ? 'Simpan Perubahan' : 'Tambah Akun'}</>
                }
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
