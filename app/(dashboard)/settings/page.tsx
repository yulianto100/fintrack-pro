'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { signOut, useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useApiList } from '@/hooks/useApiData'
import { Bell, BellOff, ChevronDown, Download, Upload, LogOut, Tag, Plus, Trash2, X,
  Pencil, Check, Moon, Sun,
  Repeat, ToggleLeft, ToggleRight, Calendar,
} from 'lucide-react'
import type { Category, RecurringTransaction, RecurringFrequency } from '@/types'
import { useDarkMode } from '@/hooks/useDarkMode'
import toast from 'react-hot-toast'


export default function SettingsPage() {
  const { data: session } = useSession()
  const { supported, subscribed, loading: notifLoading, subscribe, unsubscribe } = usePushNotifications()
  const { isDark, toggle: toggleDark } = useDarkMode()

  // Categories
  const { data: categories, refetch: refetchCats } = useApiList<Category>('/api/categories', { refreshMs: 5000 })

  // Modals
  const [showCatModal,    setShowCatModal   ] = useState(false)

  const [catForm, setCatForm] = useState({ name: '', icon: '📋', type: 'expense', color: '#22c55e' })
  const [saving,  setSaving ] = useState(false)
  // ── Expand/collapse for kategori, push notif, export ──
  const [recurringExpanded, setRecurringExpanded] = useState(false)
  const [expandKategori,  setExpandKategori ] = useState(false)
  const [expandPushNotif, setExpandPushNotif] = useState(false)
  const [expandExport,    setExpandExport   ] = useState(false)

  // ── Recurring transactions ──
  const [recurringItems,   setRecurringItems  ] = useState<RecurringTransaction[]>([])
  const [loadingRecurring, setLoadingRecurring] = useState(false)
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransaction | null>(null)
  const [editRecurringForm, setEditRecurringForm] = useState<{
    description: string; amount: string; frequency: RecurringFrequency
  }>({ description: '', amount: '', frequency: 'monthly' })
  const [savingRecurring, setSavingRecurring] = useState(false)

  const fetchRecurring = async () => {
    setLoadingRecurring(true)
    try {
      const res  = await fetch('/api/recurring-transactions')
      const json = await res.json()
      if (json.success) setRecurringItems(json.data || [])
    } catch { /* silent */ }
    finally { setLoadingRecurring(false) }
  }

  const handleRecurringToggle = async (item: RecurringTransaction) => {
    try {
      await fetch(`/api/recurring-transactions/${item.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      })
      setRecurringItems((prev) => prev.map((i) => i.id === item.id ? { ...i, isActive: !i.isActive } : i))
    } catch { toast.error('Gagal mengubah status') }
  }

  const handleRecurringDelete = async (id: string) => {
    if (!confirm('Hapus transaksi berulang ini?')) return
    try {
      await fetch(`/api/recurring-transactions/${id}`, { method: 'DELETE' })
      setRecurringItems((prev) => prev.filter((i) => i.id !== id))
      toast.success('Transaksi berulang dihapus')
    } catch { toast.error('Gagal menghapus') }
  }

  const openEditRecurring = (item: RecurringTransaction) => {
    setEditingRecurring(item)
    setEditRecurringForm({
      description: item.description,
      amount: String(item.amount),
      frequency: item.frequency,
    })
  }

  const handleSaveRecurring = async () => {
    if (!editingRecurring) return
    if (!editRecurringForm.description || !editRecurringForm.amount) {
      toast.error('Isi semua field'); return
    }
    setSavingRecurring(true)
    try {
      const res  = await fetch(`/api/recurring-transactions/${editingRecurring.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editRecurringForm.description,
          amount: Number(editRecurringForm.amount.replace(/\D/g, '')),
          frequency: editRecurringForm.frequency,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setRecurringItems((prev) => prev.map((i) =>
        i.id === editingRecurring.id
          ? { ...i, description: editRecurringForm.description,
              amount: Number(editRecurringForm.amount.replace(/\D/g, '')),
              frequency: editRecurringForm.frequency }
          : i
      ))
      toast.success('Transaksi berulang diperbarui')
      setEditingRecurring(null)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
    } finally { setSavingRecurring(false) }
  }

  const incomeCategories  = categories.filter((c) => c.type === 'income')
  const expenseCategories = categories.filter((c) => c.type === 'expense')

  useEffect(() => { if (recurringExpanded) fetchRecurring() }, [recurringExpanded])

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
    a.href = url; a.download = `finuvo-backup-${new Date().toISOString().split('T')[0]}.json`; a.click()
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

      {/* ── Transaksi Berulang ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}
        className="glass-card overflow-hidden">
        <button
          className="w-full flex items-center gap-3 p-5 text-left transition-colors active:bg-black/[0.02]"
          onClick={() => setRecurringExpanded((v) => !v)}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(34,197,94,0.12)' }}>
            <Repeat size={18} color="var(--accent)" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Transaksi Berulang
              <span className="text-xs font-normal ml-1.5" style={{ color: 'var(--text-muted)' }}>
                ({recurringItems.length})
              </span>
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Kelola gaji, langganan, dan cicilan otomatis</p>
          </div>
          <div className="flex-shrink-0 transition-transform duration-200"
            style={{ transform: recurringExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <ChevronDown size={18} color="var(--text-muted)" />
          </div>
        </button>

        <AnimatePresence initial={false}>
          {recurringExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}>
              <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--border)' }}>
                {loadingRecurring ? (
                  <div className="space-y-2 pt-4">
                    {[1,2].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
                  </div>
                ) : recurringItems.length === 0 ? (
                  <div className="pt-5 pb-2 text-center">
                    <Repeat size={24} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Belum ada transaksi berulang</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Buat dari form Tambah Transaksi</p>
                  </div>
                ) : (
                  <div className="space-y-2 pt-4">
                    {recurringItems.map((item) => (
                      <div key={item.id}
                        className="flex items-center gap-3 p-3 rounded-xl"
                        style={{
                          background: 'var(--accent-dim)',
                          opacity: item.isActive ? 1 : 0.5,
                        }}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                          style={{ background: 'var(--surface-0)' }}>
                          {item.categoryIcon || '🔁'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                              {item.description}
                            </p>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                              style={{
                                background: item.frequency === 'daily' ? 'rgba(34,197,94,0.15)'
                                  : item.frequency === 'weekly' ? 'rgba(59,130,246,0.15)' : 'rgba(168,85,247,0.15)',
                                color: item.frequency === 'daily' ? '#22C55E'
                                  : item.frequency === 'weekly' ? '#3B82F6' : '#A855F7',
                              }}>
                              {item.frequency === 'daily' ? 'Harian' : item.frequency === 'weekly' ? 'Mingguan' : 'Bulanan'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-semibold"
                              style={{ color: item.type === 'income' ? 'var(--accent)' : 'var(--red)' }}>
                              {item.type === 'income' ? '+' : '-'}{item.amount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
                            </span>
                            <div className="flex items-center gap-1">
                              <Calendar size={9} color="var(--text-muted)" />
                              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{item.nextRunDate}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button onClick={() => handleRecurringToggle(item)}
                            className="p-1.5 rounded-lg"
                            title={item.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                            style={{ color: item.isActive ? 'var(--accent)' : 'var(--text-muted)' }}>
                            {item.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                          </button>
                          <button onClick={() => openEditRecurring(item)}
                            className="p-1.5 rounded-lg"
                            style={{ color: 'var(--text-muted)' }}>
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => handleRecurringDelete(item.id)}
                            className="p-1.5 rounded-lg"
                            style={{ color: 'var(--red)' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Edit Recurring Modal ── */}
      <AnimatePresence>
        {editingRecurring && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
              onClick={() => setEditingRecurring(null)} />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="relative w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl p-6 space-y-4"
              style={{ background: 'var(--surface-0)', border: '1px solid var(--border)' }}
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                  Edit Transaksi Berulang
                </h2>
                <button onClick={() => setEditingRecurring(null)}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                  <X size={18} />
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Keterangan</label>
                <input type="text" className="input-glass"
                  value={editRecurringForm.description}
                  onChange={(e) => setEditRecurringForm((p) => ({ ...p, description: e.target.value }))} />
              </div>

              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Jumlah (Rp)</label>
                <input type="text" inputMode="numeric" className="input-glass"
                  value={editRecurringForm.amount}
                  onChange={(e) => setEditRecurringForm((p) => ({ ...p, amount: e.target.value.replace(/\D/g, '') }))} />
              </div>

              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Frekuensi</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['daily', 'weekly', 'monthly'] as RecurringFrequency[]).map((f) => (
                    <button key={f}
                      onClick={() => setEditRecurringForm((p) => ({ ...p, frequency: f }))}
                      className="py-2.5 rounded-xl text-xs font-semibold transition-all"
                      style={{
                        background: editRecurringForm.frequency === f ? 'var(--accent)' : 'var(--accent-dim)',
                        color: editRecurringForm.frequency === f ? '#fff' : 'var(--text-muted)',
                      }}>
                      {f === 'daily' ? '🌅 Harian' : f === 'weekly' ? '📅 Mingguan' : '🗓️ Bulanan'}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={handleSaveRecurring} disabled={savingRecurring}
                className="btn-primary w-full py-3.5 flex items-center justify-center gap-2">
                {savingRecurring
                  ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><Check size={16} /> Simpan Perubahan</>}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Push notifications */}
      {supported && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card overflow-hidden">
          <button
            onClick={() => setExpandPushNotif((v) => !v)}
            className="w-full flex items-center justify-between p-5"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(96,165,250,0.12)' }}>
                <Bell size={18} color="#60a5fa"/>
              </div>
              <div className="text-left">
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Push Notification</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {subscribed ? 'Aktif' : 'Nonaktif'} · Notifikasi jatuh tempo
                </p>
              </div>
            </div>
            <ChevronDown size={16} style={{ color: 'var(--text-muted)', transform: expandPushNotif ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s', flexShrink: 0 }} />
          </button>
          <AnimatePresence>
            {expandPushNotif && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                style={{ overflow: 'hidden' }}
              >
                <div className="px-5 pb-5">
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
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Categories */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}
        className="glass-card overflow-hidden">
        <button
          onClick={() => setExpandKategori((v) => !v)}
          className="w-full flex items-center justify-between p-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(192,132,252,0.12)' }}>
              <Tag size={18} color="#c084fc"/>
            </div>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Kategori <span className="text-xs font-normal ml-1" style={{ color: 'var(--text-muted)' }}>({categories.length})</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); setShowCatModal(true) }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(34,197,94,0.3)' }}
            >
              <Plus size={13}/> Tambah
            </button>
            <ChevronDown size={16} style={{ color: 'var(--text-muted)', transform: expandKategori ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s', flexShrink: 0 }} />
          </div>
        </button>
        <AnimatePresence>
          {expandKategori && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="px-5 pb-5 space-y-4">
                <CatSection label="Pemasukan"   cats={incomeCategories}  />
                <CatSection label="Pengeluaran" cats={expenseCategories} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Export / Import */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
        className="glass-card overflow-hidden">
        <button
          onClick={() => setExpandExport((v) => !v)}
          className="w-full flex items-center justify-between p-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-dim)' }}>
              <Download size={18} color="var(--accent)"/>
            </div>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Export & Import</p>
          </div>
          <ChevronDown size={16} style={{ color: 'var(--text-muted)', transform: expandExport ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s', flexShrink: 0 }} />
        </button>
        <AnimatePresence>
          {expandExport && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="px-5 pb-5 space-y-2">
                {[
                  { label: 'Export ke Excel (.xlsx)', onClick: handleExport,     color: 'var(--accent)',         bg: 'var(--accent-dim)' },
                  { label: 'Backup JSON',             onClick: handleExportJSON, color: 'var(--text-secondary)', bg: 'var(--surface-3)' },
                ].map((b) => (
                  <button key={b.label} onClick={b.onClick}
                    className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                    style={{ background: b.bg, color: b.color, border: '1px solid var(--border)' }}>
                    <Download size={15}/> {b.label}
                  </button>
                ))}
                <label className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
                  style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  <Upload size={15}/> Import dari JSON
                  <input type="file" accept=".json" className="hidden" onChange={handleImport}/>
                </label>
                <Link href="/import">
                  <div className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
                    style={{ background: 'rgba(99,179,237,0.08)', color: '#63b3ed', border: '1px solid rgba(99,179,237,0.2)' }}>
                    <Upload size={15}/> Import Mutasi Bank (CSV)
                  </div>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Dark Mode Toggle */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
        className="glass-card p-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: isDark ? 'rgba(251,191,36,0.15)' : 'rgba(99,115,142,0.12)' }}>
            {isDark ? <Sun size={18} color="#FBBF24" /> : <Moon size={18} color="#6B7280" />}
          </div>
          <div className="flex-1">
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Mode Gelap</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {isDark ? 'Aktif — tampilan gelap' : 'Nonaktif — tampilan terang'}
            </p>
          </div>
          <button
            onClick={toggleDark}
            className="relative w-12 h-6 rounded-full transition-all flex-shrink-0"
            style={{ background: isDark ? 'var(--accent)' : 'rgba(0,0,0,0.15)' }}
          >
            <div
              className="absolute top-0.5 transition-all rounded-full w-5 h-5 bg-white shadow-sm"
              style={{ left: isDark ? '26px' : '2px' }}
            />
          </button>
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
            style={{ background: 'var(--surface-4)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Kategori Baru</h2>
              <button onClick={() => setShowCatModal(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
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

    </div>
  )
}
