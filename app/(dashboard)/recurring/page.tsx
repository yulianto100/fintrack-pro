'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Repeat, Trash2, ToggleLeft, ToggleRight, X, Check, Calendar, ChevronRight } from 'lucide-react'
import { useApiList } from '@/hooks/useApiData'
import { formatCurrency } from '@/lib/utils'
import type { RecurringTransaction, Category, RecurringFrequency, WalletType } from '@/types'
import toast from 'react-hot-toast'

const FREQ_LABELS: Record<RecurringFrequency, string> = {
  daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan',
}
const FREQ_COLORS: Record<RecurringFrequency, string> = {
  daily: '#22C55E', weekly: '#3B82F6', monthly: '#A855F7',
}

const WALLET_TYPES: { value: WalletType; icon: string; label: string }[] = [
  { value: 'cash', icon: '💵', label: 'Cash' },
  { value: 'bank', icon: '🏦', label: 'Bank' },
  { value: 'ewallet', icon: '📱', label: 'E-Wallet' },
]

interface FormState {
  type: 'income' | 'expense'
  amount: string
  categoryId: string
  wallet: WalletType
  description: string
  frequency: RecurringFrequency
}

const DEFAULT_FORM: FormState = {
  type: 'expense', amount: '', categoryId: '', wallet: 'bank',
  description: '', frequency: 'monthly',
}

export default function RecurringPage() {
  const [items, setItems] = useState<RecurringTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)

  const { data: categories } = useApiList<Category>('/api/categories')

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/recurring-transactions')
      const json = await res.json()
      if (json.success) setItems(json.data || [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  const filteredCats = categories.filter((c) => c.type === form.type)

  const handleSave = async () => {
    if (!form.amount || !form.categoryId || !form.description) {
      toast.error('Isi semua field yang diperlukan'); return
    }
    setSaving(true)
    try {
      const cat = categories.find((c) => c.id === form.categoryId)
      const res  = await fetch('/api/recurring-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount.replace(/\D/g, '')),
          categoryName: cat?.name,
          categoryIcon: cat?.icon,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Transaksi berulang ditambahkan!')
      setShowModal(false)
      setForm(DEFAULT_FORM)
      fetchItems()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
    } finally { setSaving(false) }
  }

  const handleToggle = async (item: RecurringTransaction) => {
    try {
      await fetch(`/api/recurring-transactions/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      })
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, isActive: !i.isActive } : i))
    } catch { toast.error('Gagal mengubah status') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus transaksi berulang ini?')) return
    try {
      await fetch(`/api/recurring-transactions/${id}`, { method: 'DELETE' })
      setItems((prev) => prev.filter((i) => i.id !== id))
      toast.success('Dihapus')
    } catch { toast.error('Gagal menghapus') }
  }

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>
            Transaksi Berulang
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Gaji, langganan, dan cicilan otomatis
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          <Plus size={15} /> Tambah
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
      ) : items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="glass-card p-10 text-center"
        >
          <Repeat size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
          <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            Belum ada transaksi berulang
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Tambahkan gaji, langganan, atau cicilan yang rutin
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ delay: i * 0.04 }}
                className="glass-card p-4"
                style={{ opacity: item.isActive ? 1 : 0.55 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: 'var(--accent-dim)' }}>
                    {item.categoryIcon || '🔁'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                        {item.description}
                      </p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                        style={{
                          background: `${FREQ_COLORS[item.frequency]}18`,
                          color: FREQ_COLORS[item.frequency],
                        }}>
                        {FREQ_LABELS[item.frequency]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-semibold"
                        style={{ color: item.type === 'income' ? 'var(--accent)' : 'var(--red)' }}>
                        {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {item.categoryName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Calendar size={10} color="var(--text-muted)" />
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        Berikutnya: {item.nextRunDate}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleToggle(item)}
                      className="p-2 rounded-xl transition-all"
                      style={{ color: item.isActive ? 'var(--accent)' : 'var(--text-muted)' }}
                      title={item.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                    >
                      {item.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 rounded-xl transition-all"
                      style={{ color: 'var(--red)' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
              onClick={() => setShowModal(false)}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="relative w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl p-6 space-y-4"
              style={{ background: 'var(--surface-0)', border: '1px solid var(--border)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                  Transaksi Berulang Baru
                </h2>
                <button onClick={() => setShowModal(false)}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                  <X size={18} />
                </button>
              </div>

              {/* Type toggle */}
              <div className="grid grid-cols-2 gap-2">
                {(['expense', 'income'] as const).map((t) => (
                  <button key={t} onClick={() => setForm((p) => ({ ...p, type: t, categoryId: '' }))}
                    className="py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: form.type === t ? (t === 'income' ? 'var(--accent)' : 'var(--red)') : 'var(--accent-dim)',
                      color: form.type === t ? '#fff' : 'var(--text-muted)',
                    }}>
                    {t === 'income' ? '📈 Pemasukan' : '📉 Pengeluaran'}
                  </button>
                ))}
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                  Jumlah
                </label>
                <input
                  type="text" inputMode="numeric" className="input-glass"
                  placeholder="contoh: 5000000"
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value.replace(/\D/g, '') }))}
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                  Keterangan
                </label>
                <input
                  type="text" className="input-glass"
                  placeholder="contoh: Gaji bulanan, Netflix, Cicilan KPR"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                  Kategori
                </label>
                <select className="input-glass" value={form.categoryId}
                  onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}>
                  <option value="">Pilih kategori</option>
                  {filteredCats.map((c) => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>

              {/* Wallet + Frequency */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Wallet</label>
                  <select className="input-glass" value={form.wallet}
                    onChange={(e) => setForm((p) => ({ ...p, wallet: e.target.value as WalletType }))}>
                    {WALLET_TYPES.map((w) => (
                      <option key={w.value} value={w.value}>{w.icon} {w.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Frekuensi</label>
                  <select className="input-glass" value={form.frequency}
                    onChange={(e) => setForm((p) => ({ ...p, frequency: e.target.value as RecurringFrequency }))}>
                    <option value="daily">🌅 Harian</option>
                    <option value="weekly">📅 Mingguan</option>
                    <option value="monthly">🗓️ Bulanan</option>
                  </select>
                </div>
              </div>

              <button onClick={handleSave} disabled={saving} className="btn-primary w-full py-3.5 flex items-center justify-center gap-2">
                {saving
                  ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><Check size={16} /> Simpan Transaksi Berulang</>
                }
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
