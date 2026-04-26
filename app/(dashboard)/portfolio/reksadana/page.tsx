'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApiList } from '@/hooks/useApiData'
import { formatCurrency, formatNumber, formatPercent, formatDate } from '@/lib/utils'
import { calcReksadana } from '@/lib/investment-calculator'
import type { ReksadanaHolding, ReksadanaType } from '@/types'
import { Plus, Trash2, X, TrendingUp, TrendingDown, RefreshCw, Pencil, AlertCircle, Zap } from 'lucide-react'
import toast from 'react-hot-toast'

const RD_TYPES: { value: ReksadanaType; label: string; icon: string; color: string }[] = [
  { value: 'pasar_uang',       label: 'Pasar Uang',       icon: '💵', color: '#22c55e' },
  { value: 'pendapatan_tetap', label: 'Pendapatan Tetap',  icon: '📊', color: '#3b82f6' },
  { value: 'campuran',         label: 'Campuran',           icon: '🔀', color: '#f59e0b' },
  { value: 'saham',            label: 'Saham',              icon: '📈', color: '#63b3ed' },
  { value: 'indeks',           label: 'Indeks',             icon: '🏛️', color: '#a855f7' },
]
const rdTypeMap = Object.fromEntries(RD_TYPES.map((t) => [t.value, t]))

// Simulated NAB growth rates per type (annual % for demo)
const NAB_SIM: Record<ReksadanaType, number> = {
  pasar_uang:       5.5,
  pendapatan_tetap: 8.0,
  campuran:         10.0,
  saham:            13.0,
  indeks:           11.5,
}

function simulateCurrentNAV(buyNAV: number, buyDate: string, type: ReksadanaType): number {
  const days     = Math.max(0, (Date.now() - new Date(buyDate).getTime()) / 86400000)
  const annualR  = NAB_SIM[type] / 100
  return buyNAV * Math.pow(1 + annualR, days / 365)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>
        {label} {required && <span style={{ color: 'var(--accent)' }}>*</span>}
      </label>
      {children}
      {error && (
        <div className="flex items-center gap-1 mt-1">
          <AlertCircle size={11} color="var(--red)" />
          <p className="text-[11px]" style={{ color: 'var(--red)' }}>{error}</p>
        </div>
      )}
    </div>
  )
}

function ModalShell({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
        onClick={onClose} />
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 350 }}
        className="relative w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl"
        style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid var(--border)', maxHeight: '92dvh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}>
        <div className="drag-indicator mt-3 sm:hidden" />
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          <button onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.06)', color: 'var(--text-secondary)' }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  )
}

const EMPTY_FORM = {
  productName: '', manager: '', type: 'pasar_uang' as ReksadanaType,
  unit: '', buyNAV: '', buyDate: new Date().toISOString().split('T')[0], notes: '',
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function ReksadanaPage() {
  const { data: holdings, loading, refetch } = useApiList<ReksadanaHolding>('/api/portfolio/reksadana', { refreshMs: 60000 })

  // ── Add modal ──
  const [showAdd, setShowAdd] = useState(false)
  const [saving,  setSaving ] = useState(false)
  const [errors,  setErrors ] = useState<Record<string, string>>({})
  const [form,    setForm   ] = useState(EMPTY_FORM)

  // ── Edit modal ──
  const [editTarget, setEditTarget] = useState<ReksadanaHolding | null>(null)
  const [editForm,   setEditForm  ] = useState(EMPTY_FORM)
  const [editSaving, setEditSaving] = useState(false)
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})

  // ── Manual NAV update ──
  const [updateTarget, setUpdateTarget] = useState<ReksadanaHolding | null>(null)
  const [newNAV,       setNewNAV      ] = useState('')
  const [updatingNAV,  setUpdatingNAV ] = useState(false)

  // NAV is auto-simulated if not manually updated
  const getEffectiveNAV = (h: ReksadanaHolding) => {
    // If currentNAV was manually set and differs from buyNAV, trust it
    if (h.currentNAV && h.currentNAV !== h.buyNAV) return h.currentNAV
    return simulateCurrentNAV(h.buyNAV, h.buyDate, h.type)
  }

  // Validate
  const validate = (f: typeof form) => {
    const e: Record<string, string> = {}
    if (!f.manager)     e.manager = 'Manajer Investasi wajib diisi'
    if (!f.productName) e.productName = 'Nama produk wajib diisi'
    if (!f.unit)        e.unit     = 'Jumlah unit wajib diisi'
    if (!f.buyNAV)      e.buyNAV   = 'NAB beli wajib diisi'
    return e
  }

  // Totals
  const totals = useMemo(() => {
    let totalValue = 0, totalCost = 0
    ;(holdings || []).forEach((h) => {
      const nav = getEffectiveNAV(h)
      const { currentValue, costBasis } = calcReksadana(h.unit, nav, h.buyNAV)
      totalValue += currentValue
      totalCost  += costBasis
    })
    const pnl    = totalValue - totalCost
    const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0
    return { totalValue, totalCost, pnl, pnlPct }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings])

  const handleAdd = async () => {
    const e = validate(form)
    if (Object.keys(e).length) { setErrors(e); return }
    setErrors({})
    setSaving(true)
    try {
      // Auto-simulate currentNAV on add
      const simNAV = simulateCurrentNAV(parseFloat(form.buyNAV), form.buyDate, form.type)
      const res = await fetch('/api/portfolio/reksadana', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, currentNAV: simNAV }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Reksadana berhasil ditambahkan! ✓')
      setShowAdd(false); refetch()
      setForm(EMPTY_FORM)
    } catch { toast.error('Gagal menambahkan reksadana') }
    finally { setSaving(false) }
  }

  const openEdit = (h: ReksadanaHolding) => {
    setEditTarget(h)
    setEditForm({
      productName: h.productName,
      manager:     h.manager || '',
      type:        h.type,
      unit:        String(h.unit),
      buyNAV:      String(h.buyNAV),
      buyDate:     h.buyDate,
      notes:       h.notes || '',
    })
    setEditErrors({})
  }

  const handleEdit = async () => {
    if (!editTarget) return
    const e = validate(editForm)
    if (Object.keys(e).length) { setEditErrors(e); return }
    setEditErrors({})
    setEditSaving(true)
    try {
      const simNAV = simulateCurrentNAV(parseFloat(editForm.buyNAV), editForm.buyDate, editForm.type)
      const res = await fetch('/api/portfolio/reksadana', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id:          editTarget.id,
          productName: editForm.productName,
          manager:     editForm.manager,
          type:        editForm.type,
          unit:        parseFloat(editForm.unit),
          buyNAV:      parseFloat(editForm.buyNAV),
          buyDate:     editForm.buyDate,
          notes:       editForm.notes,
          // Only reset currentNAV if it wasn't manually updated
          ...(editTarget.currentNAV === editTarget.buyNAV ? { currentNAV: simNAV } : {}),
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Reksadana berhasil diupdate! ✓')
      setEditTarget(null); refetch()
    } catch { toast.error('Gagal mengupdate reksadana') }
    finally { setEditSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus reksadana ini?')) return
    // Auto-create income transaction
    const h = (holdings || []).find((x) => x.id === id)
    if (h) {
      const nav = getEffectiveNAV(h)
      const { currentValue } = calcReksadana(h.unit, nav, h.buyNAV)
      try {
        await fetch('/api/transactions', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'income', amount: currentValue, wallet: 'bank',
            description: `Pencairan reksadana: ${h.productName}`,
            date: new Date().toISOString().split('T')[0], categoryId: '',
          }),
        })
        toast.success(`💰 ${formatCurrency(currentValue)} masuk ke Bank`, { duration: 4000 })
      } catch { /* silent */ }
    }
    await fetch(`/api/portfolio/reksadana?id=${id}`, { method: 'DELETE' })
    toast.success('Reksadana dihapus'); refetch()
  }

  const handleUpdateNAV = async () => {
    if (!updateTarget || !newNAV) return
    setUpdatingNAV(true)
    try {
      const res = await fetch('/api/portfolio/reksadana', {
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

  // ── Shared type picker ──────────────────────────────────────────────────────
  function TypePicker({ selected, onSelect }: { selected: ReksadanaType; onSelect: (t: ReksadanaType) => void }) {
    return (
      <div>
        <label className="text-xs mb-2 block font-semibold" style={{ color: 'var(--text-muted)' }}>Jenis Reksadana</label>
        <div className="grid grid-cols-3 gap-1.5">
          {RD_TYPES.slice(0, 3).map((t) => (
            <button key={t.value} onClick={() => onSelect(t.value)}
              className="py-2.5 rounded-xl text-center transition-all"
              style={{
                background: selected === t.value ? `${t.color}16` : 'rgba(255,255,255,0.88)',
                border: `1px solid ${selected === t.value ? t.color + '40' : 'var(--border)'}`,
              }}>
              <p className="text-lg mb-0.5">{t.icon}</p>
              <p className="text-[9px]" style={{ color: selected === t.value ? t.color : 'var(--text-muted)' }}>{t.label}</p>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5 mt-1.5">
          {RD_TYPES.slice(3).map((t) => (
            <button key={t.value} onClick={() => onSelect(t.value)}
              className="py-2.5 rounded-xl text-center transition-all"
              style={{
                background: selected === t.value ? `${t.color}16` : 'rgba(255,255,255,0.88)',
                border: `1px solid ${selected === t.value ? t.color + '40' : 'var(--border)'}`,
              }}>
              <p className="text-lg mb-0.5">{t.icon}</p>
              <p className="text-[9px]" style={{ color: selected === t.value ? t.color : 'var(--text-muted)' }}>{t.label}</p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>📦 Reksadana</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>NAB otomatis · update manual tersedia</p>
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
                  {totals.pnl >= 0 ? <TrendingUp size={13} color="var(--accent)" /> : <TrendingDown size={13} color="var(--red)" />}
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
        <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}</div>
      ) : !(holdings || []).length ? (
        <div className="text-center py-16 glass-card">
          <p className="text-4xl mb-3">📦</p>
          <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Belum ada reksadana</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Tambahkan kepemilikan reksadana Anda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(holdings || []).map((h) => {
            const nav = getEffectiveNAV(h)
            const isSimulated = h.currentNAV === h.buyNAV
            const { currentValue, costBasis, profitLoss: pl, profitLossPercent: plPct } = calcReksadana(h.unit, nav, h.buyNAV)
            const typeCfg = rdTypeMap[h.type]

            return (
              <motion.div key={h.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="glass-card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: `${typeCfg?.color || '#63b3ed'}18` }}>
                      {typeCfg?.icon || '📦'}
                    </div>
                    <div>
                      <p className="font-bold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>{h.productName}</p>
                      {h.manager && (
                        <p className="text-[10px] font-semibold mt-0.5" style={{ color: typeCfg?.color || '#63b3ed' }}>
                          {h.manager}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background: `${typeCfg?.color || '#63b3ed'}18`, color: typeCfg?.color || '#63b3ed' }}>
                          {typeCfg?.label || h.type}
                        </span>
                        {isSimulated && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                            style={{ background: 'rgba(245,158,11,0.10)', color: '#f59e0b' }}>
                            <Zap size={8} /> Simulasi
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => { setUpdateTarget(h); setNewNAV(String(nav.toFixed(2))) }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(99,179,237,0.1)', color: 'var(--blue)', border: '1px solid rgba(99,179,237,0.2)' }}
                      title="Update NAB">
                      <RefreshCw size={12} />
                    </button>
                    <button onClick={() => openEdit(h)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(34,197,94,0.08)', color: 'var(--accent)', border: '1px solid rgba(34,197,94,0.16)' }}>
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => handleDelete(h.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: 'var(--red-dim)', color: 'var(--red)' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-0 rounded-xl overflow-hidden mb-3" style={{ background: 'rgba(255,255,255,0.90)' }}>
                  {[
                    { label: 'Unit',         value: `${formatNumber(h.unit, 4)} unit`,  color: 'var(--text-secondary)' },
                    { label: 'NAB Beli',     value: `${formatCurrency(h.buyNAV)}/unit`, color: 'var(--text-secondary)' },
                    { label: `NAB Kini${isSimulated ? ' (sim)' : ''}`, value: `${formatCurrency(nav)}/unit`, color: 'var(--blue)' },
                    { label: 'Nilai Pasar',  value: formatCurrency(currentValue),        color: 'var(--blue)'           },
                    { label: 'Modal',        value: formatCurrency(costBasis),            color: 'var(--text-secondary)' },
                  ].map((row, i, arr) => (
                    <div key={row.label}
                      className="flex items-center justify-between px-3 py-2"
                      style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{row.label}</p>
                      <p className="text-xs font-bold font-mono" style={{ color: row.color }}>{row.value}</p>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-3 py-2">
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>P&L</p>
                    <div className="flex items-center gap-1.5">
                      {pl >= 0 ? <TrendingUp size={11} color="var(--accent)" /> : <TrendingDown size={11} color="var(--red)" />}
                      <p className="text-xs font-bold" style={{ color: pl >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                        {pl >= 0 ? '+' : ''}{formatCurrency(pl)} ({formatPercent(plPct)})
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Beli: {formatDate(h.buyDate)}</p>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* ── Update NAB Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {updateTarget && (
          <ModalShell title="Update NAB" onClose={() => setUpdateTarget(null)}>
            <div className="px-5 pb-7 space-y-4">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{updateTarget.productName}</p>
              <Field label="NAB Terbaru (Rp/unit)">
                <input type="number" className="input-glass" placeholder="Contoh: 1500.50"
                  value={newNAV} onChange={(e) => setNewNAV(e.target.value)} />
              </Field>
              {newNAV && updateTarget && (() => {
                const { profitLoss: pl, profitLossPercent: plPct, currentValue } = calcReksadana(
                  updateTarget.unit, parseFloat(newNAV), updateTarget.buyNAV
                )
                return (
                  <div className="p-3 rounded-xl space-y-1"
                    style={{
                      background: pl >= 0 ? 'rgba(34,197,94,0.08)' : 'rgba(252,129,129,0.08)',
                      border: `1px solid ${pl >= 0 ? 'rgba(34,197,94,0.16)' : 'rgba(252,129,129,0.2)'}`,
                    }}>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: 'var(--text-muted)' }}>Nilai Baru</span>
                      <span className="font-bold" style={{ color: 'var(--blue)' }}>{formatCurrency(currentValue)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: 'var(--text-muted)' }}>P&L</span>
                      <span className="font-bold" style={{ color: pl >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                        {pl >= 0 ? '+' : ''}{formatCurrency(pl)} ({formatPercent(plPct)})
                      </span>
                    </div>
                  </div>
                )
              })()}
              <button onClick={handleUpdateNAV} disabled={updatingNAV}
                className="w-full py-3.5 rounded-2xl font-semibold text-white transition-all active:scale-[0.98]"
                style={{
                  background: updatingNAV ? 'rgba(99,179,237,0.4)' : 'linear-gradient(135deg, #63b3ed, #2b6cb0)',
                  boxShadow: updatingNAV ? 'none' : '0 4px 16px rgba(99,179,237,0.30)',
                  cursor: updatingNAV ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-space)',
                }}>
                {updatingNAV ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : '✓ Update NAB'}
              </button>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* ── Add Modal ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAdd && (
          <ModalShell title="Tambah Reksadana" onClose={() => { setShowAdd(false); setErrors({}) }}>
            <div className="px-5 pb-7 space-y-4">
              {/* Automation notice */}
              <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.14)' }}>
                <Zap size={13} color="#f59e0b" style={{ marginTop: 1, flexShrink: 0 }} />
                <p className="text-xs" style={{ color: '#d97706' }}>
                  NAB kini dihitung otomatis berdasarkan jenis & tanggal beli. Bisa diupdate manual kapan saja.
                </p>
              </div>

              <TypePicker selected={form.type} onSelect={(t) => setForm({ ...form, type: t })} />

              <Field label="Manajer Investasi" required error={errors.manager}>
                <input type="text" className="input-glass" placeholder="Contoh: Bibit, Ajaib, Bareksa"
                  value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} />
              </Field>

              <Field label="Nama Produk" required error={errors.productName}>
                <input type="text" className="input-glass" placeholder="Contoh: Bibit Dana Likuid"
                  value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Jumlah Unit" required error={errors.unit}>
                  <input type="number" step="0.0001" className="input-glass" placeholder="Contoh: 1250.5"
                    value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                </Field>
                <Field label="NAB Beli (Rp/unit)" required error={errors.buyNAV}>
                  <input type="number" className="input-glass" placeholder="Contoh: 1450"
                    value={form.buyNAV} onChange={(e) => setForm({ ...form, buyNAV: e.target.value })} />
                </Field>
              </div>

              <Field label="Tanggal Beli">
                <input type="date" className="input-glass"
                  value={form.buyDate} onChange={(e) => setForm({ ...form, buyDate: e.target.value })} />
              </Field>

              {/* Preview */}
              {form.unit && form.buyNAV && form.buyDate && (() => {
                const simNAV = simulateCurrentNAV(parseFloat(form.buyNAV), form.buyDate, form.type)
                const { currentValue, costBasis, profitLoss: pl, profitLossPercent: plPct } =
                  calcReksadana(parseFloat(form.unit), simNAV, parseFloat(form.buyNAV))
                return (
                  <div className="p-3.5 rounded-xl space-y-2"
                    style={{ background: 'rgba(99,179,237,0.07)', border: '1px solid rgba(99,179,237,0.18)' }}>
                    <p className="text-xs font-semibold" style={{ color: 'var(--blue)' }}>Preview (NAB simulasi)</p>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: 'var(--text-muted)' }}>NAB Simulasi</span>
                      <span className="font-bold font-mono" style={{ color: 'var(--blue)' }}>{formatCurrency(simNAV)}/unit</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: 'var(--text-muted)' }}>Nilai Pasar</span>
                      <span className="font-bold font-mono" style={{ color: 'var(--blue)' }}>{formatCurrency(currentValue)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: 'var(--text-muted)' }}>Modal</span>
                      <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(costBasis)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="font-bold" style={{ color: 'var(--text-muted)' }}>P&L</span>
                      <span className="font-bold" style={{ color: pl >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                        {pl >= 0 ? '+' : ''}{formatCurrency(pl)} ({formatPercent(plPct)})
                      </span>
                    </div>
                  </div>
                )
              })()}

              <button onClick={handleAdd} disabled={saving}
                className="w-full py-3.5 rounded-2xl font-semibold text-white transition-all active:scale-[0.98]"
                style={{
                  background: saving ? 'rgba(99,179,237,0.4)' : 'linear-gradient(135deg, #63b3ed, #2b6cb0)',
                  boxShadow: saving ? 'none' : '0 4px 16px rgba(99,179,237,0.30)',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-space)',
                }}>
                {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : '💾 Simpan Reksadana'}
              </button>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* ── Edit Modal ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {editTarget && (
          <ModalShell title={`Edit ${editTarget.productName}`} onClose={() => { setEditTarget(null); setEditErrors({}) }}>
            <div className="px-5 pb-7 space-y-4">
              <TypePicker selected={editForm.type} onSelect={(t) => setEditForm({ ...editForm, type: t })} />

              <Field label="Manajer Investasi" required error={editErrors.manager}>
                <input type="text" className="input-glass" placeholder="Contoh: Bibit"
                  value={editForm.manager} onChange={(e) => setEditForm({ ...editForm, manager: e.target.value })} />
              </Field>

              <Field label="Nama Produk" required error={editErrors.productName}>
                <input type="text" className="input-glass" placeholder="Contoh: Bibit Dana Likuid"
                  value={editForm.productName} onChange={(e) => setEditForm({ ...editForm, productName: e.target.value })} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Jumlah Unit" required error={editErrors.unit}>
                  <input type="number" step="0.0001" className="input-glass" placeholder="Contoh: 1250.5"
                    value={editForm.unit} onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })} />
                </Field>
                <Field label="NAB Beli (Rp/unit)" required error={editErrors.buyNAV}>
                  <input type="number" className="input-glass" placeholder="Rp"
                    value={editForm.buyNAV} onChange={(e) => setEditForm({ ...editForm, buyNAV: e.target.value })} />
                </Field>
              </div>

              <Field label="Tanggal Beli">
                <input type="date" className="input-glass"
                  value={editForm.buyDate} onChange={(e) => setEditForm({ ...editForm, buyDate: e.target.value })} />
              </Field>

              <button onClick={handleEdit} disabled={editSaving}
                className="w-full py-3.5 rounded-2xl font-semibold text-white transition-all active:scale-[0.98]"
                style={{
                  background: editSaving ? 'rgba(99,179,237,0.4)' : 'linear-gradient(135deg, #63b3ed, #2b6cb0)',
                  boxShadow: editSaving ? 'none' : '0 4px 16px rgba(99,179,237,0.30)',
                  cursor: editSaving ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-space)',
                }}>
                {editSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : '✓ Simpan Perubahan'}
              </button>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>
    </div>
  )
}
