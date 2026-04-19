'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { signOut, useSession } from 'next-auth/react'
import Image from 'next/image'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useFirebaseList } from '@/hooks/useFirebaseRealtime'
import { Bell, BellOff, Download, Upload, LogOut, Tag, Plus, Trash2, X } from 'lucide-react'
import type { Category } from '@/types'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { data: session } = useSession()
  const { supported, subscribed, loading: notifLoading, subscribe, unsubscribe } = usePushNotifications()
  const { data: categories } = useFirebaseList<Category>(`users/${userId}/categories`)
  const [showCatModal, setShowCatModal] = useState(false)
  const [catForm, setCatForm] = useState({ name: '', icon: '📋', type: 'expense', color: '#6b7280' })
  const [saving, setSaving] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  const handleExportAll = async () => {
    setExportLoading(true)
    const a = document.createElement('a')
    a.href = '/api/export'
    a.click()
    setTimeout(() => setExportLoading(false), 2000)
  }

  const handleExportJSON = async () => {
    const res = await fetch('/api/export?format=json')
    const json = await res.json()
    const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fintrack-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Backup JSON berhasil!')
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    try {
      const data = JSON.parse(text)
      if (!data.transactions) { toast.error('Format file tidak valid'); return }
      const res = await fetch('/api/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: data.transactions }),
      })
      const json = await res.json()
      if (json.success) toast.success(`${json.data.imported} transaksi berhasil diimport!`)
      else toast.error('Import gagal')
    } catch { toast.error('Format file tidak valid') }
  }

  const handleAddCategory = async () => {
    if (!catForm.name) { toast.error('Nama kategori wajib diisi'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/categories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(catForm),
      })
      const json = await res.json()
      if (!json.success) throw new Error()
      toast.success('Kategori ditambahkan!')
      setShowCatModal(false)
      setCatForm({ name: '', icon: '📋', type: 'expense', color: '#6b7280' })
    } catch { toast.error('Gagal menambahkan kategori') }
    finally { setSaving(false) }
  }

  const handleDeleteCat = async (id: string) => {
    if (!confirm('Hapus kategori ini?')) return
    await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    toast.success('Kategori dihapus')
  }

  const incomeCategories = (categories || []).filter((c) => c.type === 'income')
  const expenseCategories = (categories || []).filter((c) => c.type === 'expense')

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>Pengaturan</h1>

      {/* Profile */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border-2" style={{ borderColor: 'var(--accent)' }}>
            {session?.user?.image ? (
              <Image src={session.user.image} alt="avatar" width={56} height={56} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl"
                style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                {session?.user?.name?.[0]}
              </div>
            )}
          </div>
          <div>
            <p className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>{session?.user?.name}</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{session?.user?.email}</p>
          </div>
        </div>
      </motion.div>

      {/* Notifications */}
      {supported && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="glass-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(59,130,246,0.1)' }}>
              <Bell size={18} color="#3b82f6" />
            </div>
            <div>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Push Notification</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Notifikasi jatuh tempo deposito</p>
            </div>
          </div>
          <button
            onClick={subscribed ? unsubscribe : subscribe}
            disabled={notifLoading}
            className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all"
            style={{
              background: subscribed ? 'var(--red-dim)' : 'var(--accent-dim)',
              color: subscribed ? 'var(--red)' : 'var(--accent)',
              border: `1px solid ${subscribed ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
            }}>
            {notifLoading ? (
              <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            ) : subscribed ? (
              <><BellOff size={15} /> Nonaktifkan Notifikasi</>
            ) : (
              <><Bell size={15} /> Aktifkan Notifikasi</>
            )}
          </button>
        </motion.div>
      )}

      {/* Categories */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(168,85,247,0.1)' }}>
              <Tag size={18} color="#a855f7" />
            </div>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Kategori</p>
          </div>
          <button onClick={() => setShowCatModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
            <Plus size={13} /> Tambah
          </button>
        </div>
        <div className="space-y-3">
          {[{ label: 'Pemasukan', cats: incomeCategories }, { label: 'Pengeluaran', cats: expenseCategories }].map(({ label, cats }) => (
            <div key={label}>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>{label}</p>
              <div className="flex flex-wrap gap-2">
                {cats.map((c) => (
                  <div key={c.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg group"
                    style={{ background: `${c.color}15`, border: `1px solid ${c.color}30` }}>
                    <span className="text-sm">{c.icon}</span>
                    <span className="text-xs font-medium" style={{ color: c.color }}>{c.name}</span>
                    <button onClick={() => handleDeleteCat(c.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity w-4 h-4 flex items-center justify-center"
                      style={{ color: 'var(--red)' }}>
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Export / Import */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="glass-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(34,197,94,0.1)' }}>
            <Download size={18} color="var(--accent)" />
          </div>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Export & Import</p>
        </div>
        <div className="space-y-2">
          <button onClick={handleExportAll} disabled={exportLoading}
            className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <Download size={15} /> Export ke Excel (.xlsx)
          </button>
          <button onClick={handleExportJSON}
            className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
            style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            <Download size={15} /> Backup JSON
          </button>
          <label className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
            style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            <Upload size={15} /> Import dari JSON
            <input type="file" accept=".json" className="hidden" onChange={handleImport} />
          </label>
        </div>
      </motion.div>

      {/* Sign out */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <button onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium"
          style={{ background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <LogOut size={16} /> Keluar
        </button>
      </motion.div>

      {/* Add Category Modal */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowCatModal(false)} />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="relative w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl p-6"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Kategori Baru</h2>
              <button onClick={() => setShowCatModal(false)} className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)' }}>
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Nama</label>
                  <input type="text" className="input-glass" placeholder="Nama kategori"
                    value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Icon (emoji)</label>
                  <input type="text" className="input-glass text-center text-xl" placeholder="📋"
                    value={catForm.icon} onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Tipe</label>
                  <select className="input-glass" value={catForm.type}
                    onChange={(e) => setCatForm({ ...catForm, type: e.target.value })}>
                    <option value="income">Pemasukan</option>
                    <option value="expense">Pengeluaran</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Warna</label>
                  <input type="color" className="input-glass h-10 p-1 cursor-pointer"
                    value={catForm.color} onChange={(e) => setCatForm({ ...catForm, color: e.target.value })} />
                </div>
              </div>
              <button onClick={handleAddCategory} disabled={saving} className="btn-primary w-full py-3">
                {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Tambah Kategori'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
