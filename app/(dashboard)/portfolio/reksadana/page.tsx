'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApiList } from '@/hooks/useApiData'
import { formatCurrency, formatNumber, formatPercent, formatDate } from '@/lib/utils'
import { calcReksadana } from '@/lib/investment-calculator'
import type { ReksadanaHolding, ReksadanaType } from '@/types'
import { Plus, Trash2, X, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

const RD_TYPES: { value: ReksadanaType; label: string; icon: string; color: string }[] = [
  { value: 'pasar_uang',      label: 'Pasar Uang',      icon: '💵', color: '#22c55e' },
  { value: 'pendapatan_tetap',label: 'Pendapatan Tetap', icon: '📊', color: '#3b82f6' },
  { value: 'campuran',        label: 'Campuran',         icon: '🔀', color: '#f59e0b' },
  { value: 'saham',           label: 'Saham',            icon: '📈', color: '#63b3ed' },
  { value: 'indeks',          label: 'Indeks',           icon: '🏛️', color: '#a855f7' },
]

const rdTypeMap = Object.fromEntries(RD_TYPES.map((t) => [t.value, t]))

export default function ReksadanaPage() {
  const { data: holdings, loading, refetch } = useApiList<ReksadanaHolding>('/api/portfolio/reksadana', { refreshMs: 60000 })

  const [showAdd,      setShowAdd     ] = useState(false)
  const [saving,       setSaving      ] = useState(false)
  const [updateTarget, setUpdateTarget] = useState<ReksadanaHolding | null>(null)
  const [newNAV,       setNewNAV      ] = useState('')
  const [updatingNAV,  setUpdatingNAV ] = useState(false)

  const [form, setForm] = useState({
    productName: '', manager: '', type: 'pasar_uang' as ReksadanaType,
    unit: '', buyNAV: '', currentNAV: '',
    buyDate: new Date().toISOString().split('T')[0], notes: '',
  })

  const totals = useMemo(() => {
    let totalValue = 0, totalCost = 0
    ;(holdings || []).forEach((h) => {
      const { currentValue, costBasis } = calcReksadana(h.unit, h.currentNAV, h.buyNAV)
      totalValue += currentValue
      totalCost  += costBasis
    })
    const pnl    = totalValue - totalCost
    const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0
    return { totalValue, totalCost, pnl, pnlPct }
  }, [holdings])

  const preview = useMemo(() => {
    if (!form.unit || !form.buyNAV || !form.currentNAV) return null
    return calcReksadana(parseFloat(form.unit), parseFloat(form.currentNAV), parseFloat(form.buyNAV))
  }, [form.unit, form.buyNAV, form.currentNAV])

  const handleAdd = async () => {
    if (!form.productName || !form.unit || !form.buyNAV || !form.currentNAV) {
      toast.error('Isi semua field wajib'); return
    }
    setSaving(true)
    try {
      const res  = await fetch('/api/portfolio/reksadana', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Reksadana berhasil ditambahkan! ✓')
      setShowAdd(false); refetch()
      setForm({ productName:'', manager:'', type:'pasar_uang', unit:'', buyNAV:'', currentNAV:'', buyDate: new Date().toISOString().split('T')[0], notes:'' })
    } catch { toast.error('Gagal menambahkan reksadana') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus reksadana ini?')) return
    await fetch(`/api/portfolio/reksadana?id=${id}`, { method: 'DELETE' })
    toast.success('Reksadana dihapus'); refetch()
  }

  const handleUpdateNAV = async () => {
    if (!updateTarget || !newNAV) return
    setUpdatingNAV(true)
    try {
      const res  = await fetch('/api/portfolio/reksadana', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: updateTarget.id, currentNAV: parseFloat(newNAV) }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('NAB berhasil diupdate! ✓')
      setUpdateTarget(null); setNewNAV(''); refetch()
    } catch { toast.error('Gagal update NAB') }
    finally { setUpdatingNAV(false) }
  }

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>📦 Reksadana</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Update NAB manual</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary px-4 py-2 flex items-center gap-1.5 text-sm">
          <Plus size={16} /> Tambah
        </button>
      </div>

      {/* Summary */}
      {(holdings || []).length > 0 && (
        <div className="glass-card p-5 mb-5" style={{ borderColor: 'rgba(99,179,237,0.2)' }}>
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Nilai Pasar</p>
              <p className="text-2xl font-display font-bold" style={{ color: 'var(--blue)' }}>
                {formatCurrency(totals.totalValue)}
              </p>
            </div>
            <div className="h-px" style={{ background: 'var(--border)' }} />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Total Modal</p>
                <p className="text-sm font-bold font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {formatCurrency(totals.totalCost)}
                </p>
              </div>
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Total P&L</p>
                <div className="flex items-center gap-1">
                  {totals.pnl >= 0 ? <TrendingUp size={13} color="var(--accent)"/> : <TrendingDown size={13} color="var(--red)"/>}
                  <p className="text-sm font-bold" style={{ color: totals.pnl >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                    {totals.pnl >= 0 ? '+' : ''}{formatCurrency(totals.pnl)}
                  </p>
                </div>
                <p className="text-xs" style={{ color: totals.pnl >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                  {formatPercent(totals.pnlPct)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Holdings */}
      {loading ? (
        <div className="space-y-3">{[...Array(2)].map((_,i) => <div key={i} className="skeleton h-28 rounded-2xl"/>)}</div>
      ) : !(holdings || []).length ? (
        <div className="text-center py-16 glass-card">
          <p className="text-4xl mb-3">📦</p>
          <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Belum ada reksadana</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Tambahkan kepemilikan reksadana Anda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(holdings || []).map((h) => {
            const { currentValue, costBasis, profitLoss: pl, profitLossPercent: plPct } = calcReksadana(h.unit, h.currentNAV, h.buyNAV)
            const typeCfg = rdTypeMap[h.type]
            return (
              <motion.div key={h.id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                className="glass-card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: `${typeCfg?.color || '#63b3ed'}18` }}>
                      {typeCfg?.icon || '📦'}
                    </div>
                    <div>
                      <p className="font-bold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>{h.productName}</p>
                      {h.manager && <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{h.manager}</p>}
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium mt-0.5 inline-block"
                        style={{ background: `${typeCfg?.color || '#63b3ed'}18`, color: typeCfg?.color || '#63b3ed' }}>
                        {typeCfg?.label || h.type}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => { setUpdateTarget(h); setNewNAV(String(h.currentNAV)) }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background:'rgba(99,179,237,0.1)', color:'var(--blue)', border:'1px solid rgba(99,179,237,0.2)' }}
                      title="Update NAB">
                      <RefreshCw size={12}/>
                    </button>
                    <button onClick={() => handleDelete(h.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background:'var(--red-dim)', color:'var(--red)' }}>
                      <Trash2 size={12}/>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-0 rounded-xl overflow-hidden" style={{ background:'rgba(255,255,255,0.90)' }}>
                  {[
                    { label: 'Unit',       value: `${formatNumber(h.unit, 4)} unit`,       color: 'var(--text-secondary)' },
                    { label: 'NAB Beli',   value: `${formatCurrency(h.buyNAV)}/unit`,       color: 'var(--text-secondary)' },
                    { label: 'NAB Saat Ini', value: `${formatCurrency(h.currentNAV)}/unit`, color: 'var(--blue)' },
                    { label: 'Nilai Pasar', value: formatCurrency(currentValue),            color: 'var(--blue)' },
                    { label: 'Modal',      value: formatCurrency(costBasis),                color: 'var(--text-secondary)' },
                  ].map((row, i, arr) => (
                    <div key={row.label}
                      className="flex items-center justify-between px-3 py-2"
                      style={{ borderBottom: i < arr.length-1 ? '1px solid var(--border)' : 'none' }}>
                      <p className="text-xs" style={{ color:'var(--text-muted)' }}>{row.label}</p>
                      <p className="text-xs font-bold font-mono" style={{ color: row.color }}>{row.value}</p>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-3 py-2">
                    <p className="text-xs" style={{ color:'var(--text-muted)' }}>P&L</p>
                    <div className="flex items-center gap-1.5">
                      {pl >= 0 ? <TrendingUp size={11} color="var(--accent)"/> : <TrendingDown size={11} color="var(--red)"/>}
                      <p className="text-xs font-bold" style={{ color: pl >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                        {pl >= 0 ? '+' : ''}{formatCurrency(pl)} ({formatPercent(plPct)})
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] mt-2" style={{ color:'var(--text-muted)' }}>
                  Beli: {formatDate(h.buyDate)}
                </p>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Update NAB modal */}
      <AnimatePresence>
        {updateTarget && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="absolute inset-0"
              style={{ background:'rgba(0,0,0,0.65)', backdropFilter:'blur(6px)' }}
              onClick={() => setUpdateTarget(null)}/>
            <motion.div initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
              transition={{ type:'spring', damping:30, stiffness:350 }}
              className="relative w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl"
              style={{ background:'rgba(255,255,255,0.80)', border:'1px solid var(--border)' }}
              onClick={(e) => e.stopPropagation()}>
              <div className="drag-indicator mt-3 sm:hidden"/>
              <div className="flex items-center justify-between px-5 py-4">
                <h2 className="font-display font-bold text-lg" style={{ color:'var(--text-primary)' }}>Update NAB</h2>
                <button onClick={() => setUpdateTarget(null)}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background:'rgba(255,255,255,0.90)', color:'var(--text-secondary)' }}>
                  <X size={18}/>
                </button>
              </div>
              <div className="px-5 pb-7 space-y-4">
                <p className="text-sm font-medium" style={{ color:'var(--text-primary)' }}>{updateTarget.productName}</p>
                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color:'var(--text-muted)' }}>
                    NAB Terbaru (Rp/unit)
                  </label>
                  <input type="number" className="input-glass" placeholder="Rp"
                    value={newNAV} onChange={(e) => setNewNAV(e.target.value)}/>
                </div>
                {newNAV && updateTarget && (() => {
                  const { profitLoss: pl, profitLossPercent: plPct, currentValue } = calcReksadana(
                    updateTarget.unit, parseFloat(newNAV), updateTarget.buyNAV
                  )
                  return (
                    <div className="p-3 rounded-xl space-y-1"
                      style={{ background: pl >= 0 ? 'rgba(34,197,94,0.08)' : 'rgba(252,129,129,0.08)',
                               border: `1px solid ${pl >= 0 ? 'rgba(34,197,94,0.16)' : 'rgba(252,129,129,0.2)'}` }}>
                      <div className="flex justify-between text-xs">
                        <span style={{ color:'var(--text-muted)' }}>Nilai Baru</span>
                        <span className="font-bold" style={{ color:'var(--blue)' }}>{formatCurrency(currentValue)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span style={{ color:'var(--text-muted)' }}>P&L</span>
                        <span className="font-bold" style={{ color: pl >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                          {pl >= 0 ? '+' : ''}{formatCurrency(pl)} ({formatPercent(plPct)})
                        </span>
                      </div>
                    </div>
                  )
                })()}
                <button onClick={handleUpdateNAV} disabled={updatingNAV} className="btn-primary w-full py-3.5"
                  style={{ background:'linear-gradient(135deg, #63b3ed, #2b6cb0)' }}>
                  {updatingNAV ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"/> : '✓ Update NAB'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add modal */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="absolute inset-0"
              style={{ background:'rgba(0,0,0,0.65)', backdropFilter:'blur(6px)' }}
              onClick={() => setShowAdd(false)}/>
            <motion.div initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
              transition={{ type:'spring', damping:30, stiffness:350 }}
              className="relative w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl"
              style={{ background:'rgba(255,255,255,0.80)', border:'1px solid var(--border)', maxHeight:'92dvh', overflowY:'auto' }}
              onClick={(e) => e.stopPropagation()}>
              <div className="drag-indicator mt-3 sm:hidden"/>
              <div className="flex items-center justify-between px-5 py-4">
                <h2 className="font-display font-bold text-lg" style={{ color:'var(--text-primary)' }}>Tambah Reksadana</h2>
                <button onClick={() => setShowAdd(false)}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background:'rgba(255,255,255,0.90)', color:'var(--text-secondary)' }}>
                  <X size={18}/>
                </button>
              </div>
              <div className="px-5 pb-7 space-y-4">
                {/* Type selector */}
                <div>
                  <label className="text-xs mb-2 block font-semibold" style={{ color:'var(--text-muted)' }}>Jenis Reksadana</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {RD_TYPES.slice(0,3).map((t) => (
                      <button key={t.value}
                        onClick={() => setForm({ ...form, type: t.value })}
                        className="py-2.5 rounded-xl text-center transition-all"
                        style={{
                          background: form.type === t.value ? `${t.color}16` : 'rgba(255,255,255,0.88)',
                          border: `1px solid ${form.type === t.value ? t.color + '40' : 'var(--border)'}`,
                        }}>
                        <p className="text-lg mb-0.5">{t.icon}</p>
                        <p className="text-[9px]" style={{ color: form.type === t.value ? t.color : 'var(--text-muted)' }}>{t.label}</p>
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                    {RD_TYPES.slice(3).map((t) => (
                      <button key={t.value}
                        onClick={() => setForm({ ...form, type: t.value })}
                        className="py-2.5 rounded-xl text-center transition-all"
                        style={{
                          background: form.type === t.value ? `${t.color}16` : 'rgba(255,255,255,0.88)',
                          border: `1px solid ${form.type === t.value ? t.color + '40' : 'var(--border)'}`,
                        }}>
                        <p className="text-lg mb-0.5">{t.icon}</p>
                        <p className="text-[9px]" style={{ color: form.type === t.value ? t.color : 'var(--text-muted)' }}>{t.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color:'var(--text-muted)' }}>
                    Nama Produk <span style={{ color:'var(--accent)' }}>*</span>
                  </label>
                  <input type="text" className="input-glass" placeholder="contoh: Bibit Dana Likuid"
                    value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })}/>
                </div>

                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color:'var(--text-muted)' }}>Manajer Investasi</label>
                  <input type="text" className="input-glass" placeholder="opsional"
                    value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })}/>
                </div>

                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color:'var(--text-muted)' }}>
                    Jumlah Unit <span style={{ color:'var(--accent)' }}>*</span>
                  </label>
                  <input type="number" step="0.0001" className="input-glass" placeholder="contoh: 1250.5000"
                    value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}/>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs mb-1.5 block font-semibold" style={{ color:'var(--text-muted)' }}>
                      NAB Beli (Rp/unit) <span style={{ color:'var(--accent)' }}>*</span>
                    </label>
                    <input type="number" className="input-glass" placeholder="Rp"
                      value={form.buyNAV} onChange={(e) => setForm({ ...form, buyNAV: e.target.value })}/>
                  </div>
                  <div>
                    <label className="text-xs mb-1.5 block font-semibold" style={{ color:'var(--text-muted)' }}>
                      NAB Saat Ini <span style={{ color:'var(--accent)' }}>*</span>
                    </label>
                    <input type="number" className="input-glass" placeholder="Rp"
                      value={form.currentNAV} onChange={(e) => setForm({ ...form, currentNAV: e.target.value })}/>
                  </div>
                </div>

                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color:'var(--text-muted)' }}>Tanggal Beli</label>
                  <input type="date" className="input-glass"
                    value={form.buyDate} onChange={(e) => setForm({ ...form, buyDate: e.target.value })}/>
                </div>

                {/* Preview */}
                {preview && (
                  <div className="p-3.5 rounded-xl space-y-2"
                    style={{ background:'rgba(99,179,237,0.07)', border:'1px solid rgba(99,179,237,0.18)' }}>
                    <p className="text-xs font-semibold" style={{ color:'var(--blue)' }}>Preview</p>
                    <div className="flex justify-between text-xs">
                      <span style={{ color:'var(--text-muted)' }}>Nilai Pasar</span>
                      <span className="font-bold font-mono" style={{ color:'var(--blue)' }}>{formatCurrency(preview.currentValue)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span style={{ color:'var(--text-muted)' }}>Modal</span>
                      <span className="font-mono" style={{ color:'var(--text-secondary)' }}>{formatCurrency(preview.costBasis)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="font-bold" style={{ color:'var(--text-muted)' }}>P&L</span>
                      <span className="font-bold" style={{ color: preview.profitLoss >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                        {preview.profitLoss >= 0 ? '+' : ''}{formatCurrency(preview.profitLoss)} ({formatPercent(preview.profitLossPercent)})
                      </span>
                    </div>
                  </div>
                )}

                <button onClick={handleAdd} disabled={saving} className="btn-primary w-full py-3.5"
                  style={{ background:'linear-gradient(135deg, #63b3ed, #2b6cb0)' }}>
                  {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"/> : '💾 Simpan Reksadana'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
