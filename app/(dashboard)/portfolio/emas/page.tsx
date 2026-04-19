'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApiList } from '@/hooks/useApiData'
import { useGoldPrices } from '@/hooks/usePrices'
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils'
import type { GoldHolding, GoldSource } from '@/types'
import { Plus, Trash2, RefreshCw, X } from 'lucide-react'
import toast from 'react-hot-toast'

const SRC = {
  antam:     { label: 'Antam',     icon: '🏅', color: '#fbbf24' },
  pegadaian: { label: 'Pegadaian', icon: '🟡', color: '#f97316' },
  treasury:  { label: 'Treasury',  icon: '💛', color: '#eab308' },
}

export default function EmasPage() {
  const { data: holdings, loading, refetch } = useApiList<GoldHolding>('/api/portfolio/gold', { refreshMs: 30000 })
  const { prices, lastUpdated, refetch: refetchPrices } = useGoldPrices()
  const [showAdd, setShowAdd] = useState(false)
  const [saving,  setSaving ] = useState(false)
  const [form,    setForm   ] = useState({
    grams: '', source: 'antam' as GoldSource, buyPrice: '',
    buyDate: new Date().toISOString().split('T')[0], notes: '',
  })

  const handleAdd = async () => {
    if (!form.grams || parseFloat(form.grams) <= 0) { toast.error('Masukkan jumlah gram yang valid'); return }
    setSaving(true)
    try {
      const res  = await fetch('/api/portfolio/gold', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Emas berhasil ditambahkan! ✓')
      setShowAdd(false)
      setForm({ grams: '', source: 'antam', buyPrice: '', buyDate: new Date().toISOString().split('T')[0], notes: '' })
      refetch()
    } catch { toast.error('Gagal menambahkan emas') }
    finally   { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data emas ini?')) return
    await fetch(`/api/portfolio/gold?id=${id}`, { method: 'DELETE' })
    toast.success('Data emas dihapus')
    refetch()
  }

  const totalGrams = holdings.reduce((s, h) => s + h.grams, 0)
  const totalValue = holdings.reduce((s, h) => s + h.grams * (prices?.[h.source]?.sellPrice || 0), 0)

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>🥇 Portofolio Emas</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {lastUpdated ? `Harga: ${lastUpdated.toLocaleTimeString('id-ID')}` : 'Memuat harga...'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { refetch(); refetchPrices() }}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            <RefreshCw size={15}/>
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary px-4 py-2 flex items-center gap-1.5 text-sm">
            <Plus size={16}/> Tambah
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="glass-card p-5 mb-5 relative overflow-hidden" style={{ borderColor: 'rgba(251,191,36,0.25)' }}>
        <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'rgba(251,191,36,0.1)' }} />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Total Gram</p>
            <p className="text-2xl font-display font-bold" style={{ color: '#fbbf24' }}>
              {formatNumber(totalGrams, 3)} <span className="text-base">gr</span>
            </p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Nilai Sekarang</p>
            <p className="text-lg font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(totalValue)}
            </p>
          </div>
        </div>
      </div>

      {/* Live prices */}
      {prices && (
        <div className="grid grid-cols-3 gap-2 mb-5">
          {(Object.entries(SRC) as [GoldSource, typeof SRC.antam][]).map(([src, cfg]) => {
            const p = prices[src]
            if (!p) return null
            return (
              <div key={src} className="glass-card p-3 text-center">
                <p className="text-xl mb-1">{cfg.icon}</p>
                <p className="text-[11px] font-semibold mb-2" style={{ color: cfg.color }}>{cfg.label}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Jual</p>
                <p className="text-xs font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{formatCurrency(p.buyPrice)}</p>
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Buyback</p>
                <p className="text-xs font-mono" style={{ color: cfg.color }}>{formatCurrency(p.sellPrice)}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl"/>)}</div>
      ) : holdings.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🥇</p>
          <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Belum ada emas</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Tekan + Tambah untuk input emas kamu</p>
        </div>
      ) : (
        <div className="space-y-3">
          {holdings.map((h) => {
            const price = prices?.[h.source]?.sellPrice || 0
            const value = h.grams * price
            const pl    = h.buyPrice ? value - h.grams * h.buyPrice : null
            return (
              <motion.div key={h.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="glass-card p-4 flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: 'rgba(251,191,36,0.12)' }}>
                  {SRC[h.source]?.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{SRC[h.source]?.label}</p>
                    <button onClick={() => handleDelete(h.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: 'var(--red-dim)', color: 'var(--red)' }}>
                      <Trash2 size={13}/>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    <div>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Gram</p>
                      <p className="text-sm font-bold" style={{ color: '#fbbf24' }}>{formatNumber(h.grams, 3)} gr</p>
                    </div>
                    <div>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Nilai</p>
                      <p className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{formatCurrency(value)}</p>
                    </div>
                    {pl !== null && (
                      <div>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>P&L</p>
                        <p className="text-xs font-semibold" style={{ color: pl >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                          {pl >= 0 ? '+' : ''}{formatCurrency(pl)}
                        </p>
                      </div>
                    )}
                    {h.buyDate && (
                      <div>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Beli</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{formatDate(h.buyDate)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
              onClick={() => setShowAdd(false)} />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="relative w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl p-6"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', maxHeight: '90dvh', overflowY: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Tambah Emas</h2>
                <button onClick={() => setShowAdd(false)}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)' }}>
                  <X size={18}/>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>Jumlah Gram</label>
                  <input type="number" step="0.001" className="input-glass" placeholder="contoh: 5.5"
                    value={form.grams} onChange={(e) => setForm({ ...form, grams: e.target.value })} />
                </div>

                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>Sumber</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.entries(SRC) as [GoldSource, typeof SRC.antam][]).map(([src, cfg]) => (
                      <button key={src} onClick={() => setForm({ ...form, source: src })}
                        className="py-3 rounded-xl text-center transition-all"
                        style={{
                          background: form.source === src ? `${cfg.color}18` : 'var(--surface-3)',
                          border: `1px solid ${form.source === src ? cfg.color + '60' : 'rgba(34,197,94,0.15)'}`,
                          color: form.source === src ? cfg.color : 'var(--text-secondary)',
                        }}>
                        <p className="text-xl">{cfg.icon}</p>
                        <p className="text-xs mt-1">{cfg.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>Harga Beli/gr (opsional)</label>
                    <input type="number" className="input-glass" placeholder="Rp"
                      value={form.buyPrice} onChange={(e) => setForm({ ...form, buyPrice: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>Tanggal Beli</label>
                    <input type="date" className="input-glass"
                      value={form.buyDate} onChange={(e) => setForm({ ...form, buyDate: e.target.value })} />
                  </div>
                </div>

                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>Catatan (opsional)</label>
                  <input type="text" className="input-glass" placeholder="Misal: Kado ulang tahun"
                    value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>

                {/* Live price preview */}
                {prices?.[form.source] && form.grams && (
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: '#fbbf24' }}>Preview Nilai</p>
                    <p className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(parseFloat(form.grams || '0') * (prices[form.source]?.sellPrice || 0))}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {form.grams} gr × {formatCurrency(prices[form.source]?.sellPrice || 0)}/gr
                    </p>
                  </div>
                )}

                <button onClick={handleAdd} disabled={saving}
                  className="btn-primary w-full py-4"
                  style={{ background: 'linear-gradient(135deg, #fbbf24, #d97706)' }}>
                  {saving
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"/>
                    : 'Simpan Emas'
                  }
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
