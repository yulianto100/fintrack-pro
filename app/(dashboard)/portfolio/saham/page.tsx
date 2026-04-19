'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApiList } from '@/hooks/useApiData'
import { useStockPrices } from '@/hooks/usePrices'
import { formatCurrency, formatPercent, parseLotValue, calcProfitLoss } from '@/lib/utils'
import type { StockHolding } from '@/types'
import { Plus, Trash2, TrendingUp, TrendingDown, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SahamPage() {
  const { data: holdings, loading, refetch } = useApiList<StockHolding>('/api/portfolio/stocks', { refreshMs: 15000 })
  const symbols = useMemo(() => (holdings || []).map((s) => s.symbol), [holdings])
  const { prices, loading: pricesLoading } = useStockPrices(symbols)

  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ symbol: '', lots: '', avgPrice: '', buyDate: '', notes: '' })

  const handleAdd = async () => {
    if (!form.symbol || !form.lots || !form.avgPrice) {
      toast.error('Isi semua field yang wajib')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/portfolio/stocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Saham berhasil ditambahkan! ✓')
      setShowAdd(false)
      refetch()
      setForm({ symbol: '', lots: '', avgPrice: '', buyDate: '', notes: '' })
    } catch {
      toast.error('Gagal menambahkan saham')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus saham ini?')) return
    await fetch(`/api/portfolio/stocks?id=${id}`, { method: 'DELETE' })
    toast.success('Saham dihapus')
    refetch()
  }

  // Portfolio totals
  const totals = useMemo(() => {
    if (!holdings) return { value: 0, cost: 0, pl: 0, plPct: 0 }
    let value = 0, cost = 0
    holdings.forEach((h) => {
      const p = prices[h.symbol]?.currentPrice || 0
      value += parseLotValue(h.lots, p)
      cost += parseLotValue(h.lots, h.avgPrice)
    })
    const { profitLoss: pl, profitLossPercent: plPct } = calcProfitLoss(value, cost)
    return { value, cost, pl, plPct }
  }, [holdings, prices])

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>📈 Portofolio Saham</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>IDX — harga realtime</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary px-4 py-2 flex items-center gap-1.5 text-sm">
          <Plus size={16} /> Tambah
        </button>
      </div>

      {/* Summary */}
      <div className="glass-card p-5 mb-5" style={{ borderColor: 'rgba(59,130,246,0.2)' }}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Nilai Pasar</p>
            <p className="text-2xl font-display font-bold" style={{ color: '#3b82f6' }}>{formatCurrency(totals.value)}</p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Total P&L</p>
            <div className="flex items-center gap-1">
              {totals.pl >= 0 ? <TrendingUp size={16} color="var(--accent)" /> : <TrendingDown size={16} color="var(--red)" />}
              <p className="text-lg font-bold" style={{ color: totals.pl >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                {totals.pl >= 0 ? '+' : ''}{formatCurrency(totals.pl)}
              </p>
            </div>
            <p className="text-xs" style={{ color: totals.pl >= 0 ? 'var(--accent)' : 'var(--red)' }}>
              {formatPercent(totals.plPct)}
            </p>
          </div>
        </div>
      </div>

      {/* Holdings */}
      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
      ) : !holdings?.length ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📈</p>
          <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Belum ada saham</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Tambahkan saham IDX Anda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(holdings || []).map((h) => {
            const stockData = prices[h.symbol]
            const currentPrice = stockData?.currentPrice || 0
            const currentValue = parseLotValue(h.lots, currentPrice)
            const costBasis = parseLotValue(h.lots, h.avgPrice)
            const { profitLoss: pl, profitLossPercent: plPct } = calcProfitLoss(currentValue, costBasis)
            const isUp = (stockData?.change || 0) >= 0

            return (
              <motion.div key={h.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="glass-card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm"
                      style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                      {h.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{h.symbol}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{h.lots} lot · {h.lots * 100} lembar</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                      {pricesLoading ? '...' : formatCurrency(currentPrice)}
                    </p>
                    {stockData && (
                      <div className="flex items-center gap-1 justify-end">
                        {isUp ? <TrendingUp size={11} color="var(--accent)" /> : <TrendingDown size={11} color="var(--red)" />}
                        <p className="text-xs" style={{ color: isUp ? 'var(--accent)' : 'var(--red)' }}>
                          {formatPercent(stockData.changePercent)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center py-3 rounded-xl"
                  style={{ background: 'var(--surface-3)' }}>
                  <div>
                    <p className="text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>Nilai</p>
                    <p className="text-xs font-bold font-mono" style={{ color: '#3b82f6' }}>{formatCurrency(currentValue)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>Modal</p>
                    <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(costBasis)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>P&L</p>
                    <p className="text-xs font-bold" style={{ color: pl >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                      {pl >= 0 ? '+' : ''}{formatCurrency(pl)}
                    </p>
                    <p className="text-[9px]" style={{ color: pl >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                      {formatPercent(plPct)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Avg: {formatCurrency(h.avgPrice)}/lembar
                  </p>
                  <button onClick={() => handleDelete(h.id)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg"
                    style={{ background: 'var(--red-dim)', color: 'var(--red)' }}>
                    <Trash2 size={12} /> Hapus
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Add modal */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => setShowAdd(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="relative w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl p-6"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Tambah Saham</h2>
                <button onClick={() => setShowAdd(false)} className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)' }}>
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Kode Saham (IDX)</label>
                  <input type="text" className="input-glass uppercase" placeholder="contoh: BBCA"
                    value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Jumlah Lot</label>
                    <input type="number" className="input-glass" placeholder="contoh: 10"
                      value={form.lots} onChange={(e) => setForm({ ...form, lots: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Harga Beli Avg/lembar</label>
                    <input type="number" className="input-glass" placeholder="Rp"
                      value={form.avgPrice} onChange={(e) => setForm({ ...form, avgPrice: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Tanggal Beli</label>
                    <input type="date" className="input-glass"
                      value={form.buyDate} onChange={(e) => setForm({ ...form, buyDate: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Catatan</label>
                    <input type="text" className="input-glass" placeholder="Opsional"
                      value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </div>
                </div>
                {form.lots && form.avgPrice && (
                  <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--blue-dim)' }}>
                    <p style={{ color: '#3b82f6' }}>
                      Modal: {formatCurrency(parseInt(form.lots || '0') * 100 * parseFloat(form.avgPrice || '0'))}
                      <span className="ml-2" style={{ color: 'var(--text-muted)' }}>
                        ({parseInt(form.lots || '0') * 100} lembar)
                      </span>
                    </p>
                  </div>
                )}
                <button onClick={handleAdd} disabled={saving} className="btn-primary w-full py-3.5"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                  {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Simpan'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
