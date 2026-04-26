'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApiList } from '@/hooks/useApiData'
import { useStockPrices } from '@/hooks/usePrices'
import { formatCurrency, formatPercent, parseLotValue, calcProfitLoss } from '@/lib/utils'
import type { StockHolding } from '@/types'
import { Plus, Trash2, TrendingUp, TrendingDown, X, DollarSign, Pencil, AlertCircle } from 'lucide-react'
import { SahamSellModal } from '@/components/sell-modal'
import toast from 'react-hot-toast'

// ─── Tiny helpers ────────────────────────────────────────────────────────────
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
        style={{
          background: 'rgba(255,255,255,0.92)',
          border: '1px solid var(--border)',
          maxHeight: '92dvh',
          overflowY: 'auto',
        }}
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

// ─── Main page ───────────────────────────────────────────────────────────────
export default function SahamPage() {
  const { data: holdings, loading, refetch } = useApiList<StockHolding>('/api/portfolio/stocks', { refreshMs: 15000 })
  const symbols = useMemo(() => (holdings || []).map((s) => s.symbol), [holdings])
  const { prices, loading: pricesLoading } = useStockPrices(symbols)

  // ── Add modal ──
  const [showAdd, setShowAdd] = useState(false)
  const [saving,  setSaving ] = useState(false)
  const [errors,  setErrors ] = useState<Record<string, string>>({})
  const [form,    setForm   ] = useState({
    symbol: '', lots: '', avgPrice: '', buyDate: '', sekuritas: '',
  })

  // ── Edit modal ──
  const [editTarget, setEditTarget] = useState<StockHolding | null>(null)
  const [editForm,   setEditForm  ] = useState({ lots: '', avgPrice: '', buyDate: '', sekuritas: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})

  // ── Sell modal ──
  const [sellTarget, setSellTarget] = useState<StockHolding | null>(null)

  // ── Validation ──
  const validate = (f: typeof form) => {
    const e: Record<string, string> = {}
    if (!f.sekuritas) e.sekuritas = 'Sekuritas wajib diisi'
    if (!f.symbol)    e.symbol    = 'Kode saham wajib diisi'
    if (!f.lots)      e.lots      = 'Jumlah lot wajib diisi'
    if (!f.avgPrice)  e.avgPrice  = 'Harga beli wajib diisi'
    return e
  }

  const validateEdit = (f: typeof editForm) => {
    const e: Record<string, string> = {}
    if (!f.sekuritas) e.sekuritas = 'Sekuritas wajib diisi'
    if (!f.lots)      e.lots      = 'Jumlah lot wajib diisi'
    if (!f.avgPrice)  e.avgPrice  = 'Harga beli wajib diisi'
    return e
  }

  // ── Add handler ──
  const handleAdd = async () => {
    const e = validate(form)
    if (Object.keys(e).length) { setErrors(e); return }
    setErrors({})
    setSaving(true)
    try {
      const res  = await fetch('/api/portfolio/stocks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, notes: form.sekuritas }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success(json.merged
        ? `${form.symbol.toUpperCase()} sudah ada — lot & avg price diupdate! ✓`
        : 'Saham berhasil ditambahkan! ✓')
      setShowAdd(false); refetch()
      setForm({ symbol: '', lots: '', avgPrice: '', buyDate: '', sekuritas: '' })
    } catch { toast.error('Gagal menambahkan saham') }
    finally  { setSaving(false) }
  }

  // ── Edit handler ──
  const openEdit = (h: StockHolding) => {
    setEditTarget(h)
    setEditForm({
      lots:      String(h.lots),
      avgPrice:  String(h.avgPrice),
      buyDate:   h.buyDate || '',
      sekuritas: h.notes || '',
    })
    setEditErrors({})
  }

  const handleEdit = async () => {
    if (!editTarget) return
    const e = validateEdit(editForm)
    if (Object.keys(e).length) { setEditErrors(e); return }
    setEditErrors({})
    setEditSaving(true)
    try {
      const res  = await fetch('/api/portfolio/stocks', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id:       editTarget.id,
          lots:     parseInt(editForm.lots),
          avgPrice: parseFloat(editForm.avgPrice),
          buyDate:  editForm.buyDate,
          notes:    editForm.sekuritas,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Saham berhasil diupdate! ✓')
      setEditTarget(null); refetch()
    } catch { toast.error('Gagal mengupdate saham') }
    finally  { setEditSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus saham ini?')) return
    await fetch(`/api/portfolio/stocks?id=${id}`, { method: 'DELETE' })
    toast.success('Saham dihapus'); refetch()
  }

  // ── Auto-transaction on sell ──
  const handleSellComplete = async () => {
    if (!sellTarget) return
    const sellPrice = prices[sellTarget.symbol]?.currentPrice || 0
    const sellAmount = sellPrice * sellTarget.lots * 100
    if (sellAmount > 0) {
      try {
        await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type:        'income',
            amount:      sellAmount,
            wallet:      'bank',
            description: `Hasil jual saham ${sellTarget.symbol}`,
            date:        new Date().toISOString().split('T')[0],
            categoryId:  '',
          }),
        })
        toast.success(`💰 ${formatCurrency(sellAmount)} ditambahkan ke Bank`, { duration: 4000 })
      } catch { /* silent */ }
    }
    refetch()
    setSellTarget(null)
  }

  // ── Totals ──
  const totals = useMemo(() => {
    if (!holdings) return { value: 0, cost: 0, pl: 0, plPct: 0 }
    let value = 0, cost = 0
    holdings.forEach((h) => {
      value += parseLotValue(h.lots, prices[h.symbol]?.currentPrice || 0)
      cost  += parseLotValue(h.lots, h.avgPrice)
    })
    const { profitLoss: pl, profitLossPercent: plPct } = calcProfitLoss(value, cost)
    return { value, cost, pl, plPct }
  }, [holdings, prices])

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>📈 Portofolio Saham</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>IDX — harga realtime · auto-merge aktif</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary px-4 py-2 flex items-center gap-1.5 text-sm">
          <Plus size={16} /> Tambah
        </button>
      </div>

      {/* Portfolio Summary */}
      <div className="glass-card p-5 mb-5" style={{ borderColor: 'rgba(99,179,237,0.2)' }}>
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Nilai Pasar</p>
            <p className="text-2xl font-display font-bold" style={{ color: 'var(--blue)' }}>
              {formatCurrency(totals.value)}
            </p>
          </div>
          <div className="h-px" style={{ background: 'var(--border)' }} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Total Modal</p>
              <p className="text-sm font-bold font-mono" style={{ color: 'var(--text-secondary)' }}>
                {formatCurrency(totals.cost)}
              </p>
            </div>
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Total P&L</p>
              <div className="flex items-center gap-1">
                {totals.pl >= 0
                  ? <TrendingUp size={14} color="var(--accent)" />
                  : <TrendingDown size={14} color="var(--red)" />}
                <p className="text-sm font-bold" style={{ color: totals.pl >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                  {totals.pl >= 0 ? '+' : ''}{formatCurrency(totals.pl)}
                </p>
              </div>
              <p className="text-xs" style={{ color: totals.pl >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                {formatPercent(totals.plPct)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Holdings list */}
      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}</div>
      ) : !holdings?.length ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📈</p>
          <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Belum ada saham</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Tambahkan saham IDX Anda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(holdings || []).map((h) => {
            const stockData    = prices[h.symbol]
            const currentPrice = stockData?.currentPrice || 0
            const currentValue = parseLotValue(h.lots, currentPrice)
            const costBasis    = parseLotValue(h.lots, h.avgPrice)
            const { profitLoss: pl, profitLossPercent: plPct } = calcProfitLoss(currentValue, costBasis)
            const isUp         = (stockData?.change || 0) >= 0
            const sekuritas    = h.notes || '—'

            return (
              <motion.div key={h.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="glass-card p-4">

                {/* Row 1: Identity + live price */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                      style={{ background: 'rgba(99,179,237,0.12)', color: 'var(--blue)' }}>
                      {h.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{h.symbol}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: 'rgba(99,179,237,0.14)', color: 'var(--blue)' }}>
                          {sekuritas}
                        </span>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {h.lots} lot · {h.lots * 100} lbr
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                      {pricesLoading ? '—' : formatCurrency(currentPrice)}
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

                {/* Row 2: Stats */}
                <div className="flex flex-col gap-0 rounded-xl overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.90)' }}>
                  {[
                    { label: 'Nilai Pasar', value: formatCurrency(currentValue),         color: 'var(--blue)'           },
                    { label: 'Modal',        value: formatCurrency(costBasis),             color: 'var(--text-secondary)' },
                    { label: 'Avg Beli',     value: `${formatCurrency(h.avgPrice)}/lbr`, color: 'var(--text-secondary)' },
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

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 mt-3">
                  <button onClick={() => setSellTarget(h)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg"
                    style={{ background: 'rgba(34,197,94,0.10)', color: 'var(--accent)', border: '1px solid rgba(34,197,94,0.16)' }}>
                    <DollarSign size={12} /> Jual
                  </button>
                  <button onClick={() => openEdit(h)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg"
                    style={{ background: 'rgba(99,179,237,0.10)', color: 'var(--blue)', border: '1px solid rgba(99,179,237,0.16)' }}>
                    <Pencil size={12} /> Edit
                  </button>
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

      {/* ── Add Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAdd && (
          <ModalShell title="Tambah Saham" onClose={() => { setShowAdd(false); setErrors({}) }}>
            <div className="px-5 pb-7 space-y-4">
              <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: 'rgba(99,179,237,0.08)' }}>
                <span className="text-sm">🔀</span>
                <p className="text-xs" style={{ color: 'var(--blue)' }}>
                  Jika saham sudah ada, lot & avg price akan otomatis digabung (weighted average).
                </p>
              </div>

              <Field label="Sekuritas" required error={errors.sekuritas}>
                <input type="text" className="input-glass" placeholder="Contoh: Ajaib, Bibit, IPOT, Stockbit"
                  value={form.sekuritas} onChange={(e) => setForm({ ...form, sekuritas: e.target.value })} />
              </Field>

              <Field label="Kode Saham (IDX)" required error={errors.symbol}>
                <input type="text" className="input-glass uppercase" placeholder="Contoh: BBCA"
                  value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Jumlah Lot" required error={errors.lots}>
                  <input type="number" className="input-glass" placeholder="Contoh: 10"
                    value={form.lots} onChange={(e) => setForm({ ...form, lots: e.target.value })} />
                </Field>
                <Field label="Harga Beli/lbr" required error={errors.avgPrice}>
                  <input type="number" className="input-glass" placeholder="Contoh: 9400"
                    value={form.avgPrice} onChange={(e) => setForm({ ...form, avgPrice: e.target.value })} />
                </Field>
              </div>

              <Field label="Tanggal Beli">
                <input type="date" className="input-glass"
                  value={form.buyDate} onChange={(e) => setForm({ ...form, buyDate: e.target.value })} />
              </Field>

              {form.lots && form.avgPrice && (
                <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--blue-dim)', border: '1px solid rgba(99,179,237,0.2)' }}>
                  <p style={{ color: 'var(--blue)' }}>
                    Modal: {formatCurrency(parseInt(form.lots || '0') * 100 * parseFloat(form.avgPrice || '0'))}
                    <span className="ml-2" style={{ color: 'var(--text-muted)' }}>
                      ({parseInt(form.lots || '0') * 100} lembar)
                    </span>
                  </p>
                </div>
              )}

              <button onClick={handleAdd} disabled={saving}
                className="w-full py-3.5 rounded-2xl font-semibold text-white transition-all active:scale-[0.98]"
                style={{
                  background: saving ? 'rgba(99,179,237,0.5)' : 'linear-gradient(135deg, #63b3ed, #2b6cb0)',
                  boxShadow: saving ? 'none' : '0 4px 16px rgba(99,179,237,0.30)',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-space)',
                }}>
                {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : '💾 Simpan Saham'}
              </button>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* ── Edit Modal ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {editTarget && (
          <ModalShell title={`Edit ${editTarget.symbol}`} onClose={() => { setEditTarget(null); setEditErrors({}) }}>
            <div className="px-5 pb-7 space-y-4">
              <div className="p-3 rounded-xl" style={{ background: 'rgba(99,179,237,0.08)', border: '1px solid rgba(99,179,237,0.16)' }}>
                <p className="text-xs font-bold" style={{ color: 'var(--blue)' }}>Saham: {editTarget.symbol}</p>
              </div>

              <Field label="Sekuritas" required error={editErrors.sekuritas}>
                <input type="text" className="input-glass" placeholder="Contoh: Ajaib, Bibit"
                  value={editForm.sekuritas} onChange={(e) => setEditForm({ ...editForm, sekuritas: e.target.value })} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Jumlah Lot" required error={editErrors.lots}>
                  <input type="number" className="input-glass" placeholder="Contoh: 10"
                    value={editForm.lots} onChange={(e) => setEditForm({ ...editForm, lots: e.target.value })} />
                </Field>
                <Field label="Avg Harga Beli" required error={editErrors.avgPrice}>
                  <input type="number" className="input-glass" placeholder="Rp"
                    value={editForm.avgPrice} onChange={(e) => setEditForm({ ...editForm, avgPrice: e.target.value })} />
                </Field>
              </div>

              <Field label="Tanggal Beli">
                <input type="date" className="input-glass"
                  value={editForm.buyDate} onChange={(e) => setEditForm({ ...editForm, buyDate: e.target.value })} />
              </Field>

              {editForm.lots && editForm.avgPrice && (
                <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--blue-dim)', border: '1px solid rgba(99,179,237,0.2)' }}>
                  <p style={{ color: 'var(--blue)' }}>
                    Modal: {formatCurrency(parseInt(editForm.lots || '0') * 100 * parseFloat(editForm.avgPrice || '0'))}
                  </p>
                </div>
              )}

              <button onClick={handleEdit} disabled={editSaving}
                className="w-full py-3.5 rounded-2xl font-semibold text-white transition-all active:scale-[0.98]"
                style={{
                  background: editSaving ? 'rgba(99,179,237,0.5)' : 'linear-gradient(135deg, #63b3ed, #2b6cb0)',
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

      {/* ── Sell Modal ────────────────────────────────────────────────── */}
      {sellTarget && (
        <SahamSellModal
          holding={sellTarget}
          currentPrice={prices[sellTarget.symbol]?.currentPrice || 0}
          onClose={() => setSellTarget(null)}
          onSuccess={handleSellComplete}
        />
      )}
    </div>
  )
}
