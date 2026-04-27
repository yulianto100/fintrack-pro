'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApiList } from '@/hooks/useApiData'
import { useStockPrices } from '@/hooks/usePrices'
import { formatCurrency, formatPercent, parseLotValue, calcProfitLoss, formatDate } from '@/lib/utils'
import type { StockHolding } from '@/types'
import { Plus, Trash2, TrendingUp, TrendingDown, X, DollarSign, Pencil, AlertCircle, RefreshCw } from 'lucide-react'
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

// ─── Main page ───────────────────────────────────────────────────────────────
export default function SahamPage() {
  const { data: holdings, loading, refetch } = useApiList<StockHolding>('/api/portfolio/stocks', { refreshMs: 15000 })
  const symbols = useMemo(() => [...new Set((holdings || []).map((s) => s.symbol))], [holdings])
  const { prices, loading: pricesLoading, refetch: refetchPrices } = useStockPrices(symbols)

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

  // ── Validate ──
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

  // ── Add ──
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
    finally { setSaving(false) }
  }

  // ── Edit ──
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
          id: editTarget.id, lots: parseInt(editForm.lots),
          avgPrice: parseFloat(editForm.avgPrice), buyDate: editForm.buyDate,
          notes: editForm.sekuritas,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Saham berhasil diupdate! ✓')
      setEditTarget(null); refetch()
    } catch { toast.error('Gagal mengupdate saham') }
    finally { setEditSaving(false) }
  }

  // ── Delete ──
  const handleDelete = async (id: string) => {
    if (!confirm('Hapus entri saham ini?')) return
    await fetch(`/api/portfolio/stocks?id=${id}`, { method: 'DELETE' })
    toast.success('Saham dihapus'); refetch()
  }

  // ── Sell complete — transaction is already created inside SahamSellModal ──
  const handleSellComplete = () => {
    refetch()
    setSellTarget(null)
  }

  // ── Group holdings by symbol ──
  const groupedBySymbol = useMemo(() => {
    const groups: Record<string, {
      totalLots:  number
      totalCost:  number
      entries:    StockHolding[]
    }> = {}
    ;(holdings || []).forEach((h) => {
      if (!groups[h.symbol]) groups[h.symbol] = { totalLots: 0, totalCost: 0, entries: [] }
      groups[h.symbol].totalLots += h.lots
      groups[h.symbol].totalCost += h.lots * 100 * h.avgPrice   // cost in rupiah
      groups[h.symbol].entries.push(h)
    })
    return groups
  }, [holdings])

  // ── Overall portfolio totals ──
  const totals = useMemo(() => {
    let value = 0, cost = 0
    ;(holdings || []).forEach((h) => {
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
        <div className="flex gap-2">
          <button onClick={() => { refetch(); refetchPrices() }}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.90)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            <RefreshCw size={15} />
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary px-4 py-2 flex items-center gap-1.5 text-sm">
            <Plus size={16} /> Tambah
          </button>
        </div>
      </div>

      {/* Portfolio Summary Hero */}
      <div className="glass-hero p-5 mb-5" style={{ borderColor: 'rgba(99,179,237,0.22)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Total Nilai Pasar</p>
            <p className="text-2xl font-display font-bold" style={{ color: 'var(--blue)' }}>
              {formatCurrency(totals.value)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Total Modal</p>
            <p className="text-sm font-bold font-mono" style={{ color: 'var(--text-secondary)' }}>
              {formatCurrency(totals.cost)}
            </p>
          </div>
        </div>
        {totals.cost > 0 && (
          <div className="flex items-center gap-2 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
              style={{
                background: totals.pl >= 0 ? 'rgba(34,197,94,0.10)' : 'rgba(252,129,129,0.12)',
                border: `1px solid ${totals.pl >= 0 ? 'rgba(34,197,94,0.18)' : 'rgba(252,129,129,0.25)'}`,
              }}>
              {totals.pl >= 0
                ? <TrendingUp size={13} color="var(--accent)" />
                : <TrendingDown size={13} color="var(--red)" />}
              <p className="text-xs font-bold" style={{ color: totals.pl >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                {totals.pl >= 0 ? '+' : ''}{formatCurrency(totals.pl)} P&L
              </p>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {formatPercent(totals.plPct)} dari modal
            </p>
          </div>
        )}
      </div>

      {/* Holdings — grouped by symbol */}
      {loading ? (
        <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
      ) : Object.keys(groupedBySymbol).length === 0 ? (
        <div className="text-center py-14 glass-card">
          <p className="text-4xl mb-3">📈</p>
          <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Belum ada saham</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Tambahkan saham IDX Anda</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[11px] font-semibold px-1" style={{ color: 'var(--text-muted)' }}>
            KEPEMILIKAN ({(holdings || []).length} entri)
          </p>

          {Object.entries(groupedBySymbol).map(([symbol, group]) => {
            const stockData      = prices[symbol]
            const currentPrice   = stockData?.currentPrice || 0
            const totalValue     = group.totalLots * 100 * currentPrice
            const { profitLoss: groupPl, profitLossPercent: groupPlPct } = calcProfitLoss(totalValue, group.totalCost)
            const isUp           = (stockData?.change || 0) >= 0

            // weighted avg price for the symbol
            const weightedAvg    = group.totalCost / (group.totalLots * 100)

            return (
              <motion.div key={symbol} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="glass-card overflow-hidden">

                {/* ── Symbol group header ── */}
                <div className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-3">
                    {/* Symbol avatar */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                      style={{ background: 'rgba(99,179,237,0.14)', color: 'var(--blue)' }}>
                      {symbol.slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{symbol}</p>
                      {/* Total lot badge */}
                      <p className="text-xs font-bold" style={{ color: 'var(--blue)' }}>
                        {group.totalLots} lot
                      </p>
                    </div>
                  </div>

                  {/* Right: total nilai + PnL */}
                  <div className="text-right">
                    <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-muted)' }}>
                      TOTAL NILAI SEKARANG
                    </p>
                    <p className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                      {pricesLoading ? '—' : formatCurrency(totalValue)}
                    </p>
                    {group.totalCost > 0 && (
                      <p className="text-xs font-medium"
                        style={{ color: groupPl >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                        {groupPl >= 0 ? '+' : ''}{formatCurrency(groupPl)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Live price + PnL pct strip — enhanced */}
                <div className="flex items-center justify-between px-4 py-2.5"
                  style={{
                    background: groupPl >= 0 ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)',
                    borderBottom: '1px solid var(--border)',
                  }}>
                  <div className="flex items-center gap-2">
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Harga kini</p>
                    <p className="text-xs font-bold font-mono" style={{ color: 'var(--blue)' }}>
                      {pricesLoading ? '—' : formatCurrency(currentPrice)}
                    </p>
                    {stockData && (
                      <div className="flex items-center gap-0.5">
                        {isUp ? <TrendingUp size={10} color="var(--accent)" /> : <TrendingDown size={10} color="var(--red)" />}
                        <span className="text-[10px] font-medium"
                          style={{ color: isUp ? 'var(--accent)' : 'var(--red)' }}>
                          {formatPercent(stockData.changePercent)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Avg beli</p>
                      <p className="text-[10px] font-mono font-bold" style={{ color: 'var(--text-secondary)' }}>
                        {formatCurrency(weightedAvg)}/lbr
                      </p>
                    </div>
                    {/* P/L badge */}
                    {group.totalCost > 0 && (
                      <div className="px-2 py-1 rounded-lg text-[11px] font-bold"
                        style={{
                          background: groupPl >= 0 ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                          color: groupPl >= 0 ? 'var(--accent)' : 'var(--red)',
                        }}>
                        {groupPl >= 0 ? '↑' : '↓'} {formatPercent(Math.abs(groupPlPct))}
                      </div>
                    )}
                  </div>
                </div>
                {/* P/L performance bar */}
                {group.totalCost > 0 && (
                  <div className="px-4 py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="flex justify-between text-[9px] mb-1" style={{ color: 'var(--text-muted)' }}>
                      <span>Modal: {formatCurrency(group.totalCost)}</span>
                      <span style={{ color: groupPl >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                        {groupPl >= 0 ? '+' : ''}{formatCurrency(groupPl)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(100, Math.abs(groupPlPct) > 50 ? 100 : 50 + Math.min(50, Math.abs(groupPlPct)))}%`,
                          background: groupPl >= 0
                            ? 'linear-gradient(90deg, #22C55E, #4ADE80)'
                            : 'linear-gradient(90deg, #EF4444, #F87171)',
                        }} />
                    </div>
                  </div>
                )}

                {/* ── Individual purchase entries ── */}
                {group.entries.map((h, i) => {
                  const entryValue = h.lots * 100 * currentPrice
                  const entryCost  = h.lots * 100 * h.avgPrice
                  const { profitLoss: entryPl } = calcProfitLoss(entryValue, entryCost)
                  const sekuritas  = h.notes || '—'

                  return (
                    <div key={h.id}
                      className="flex items-center justify-between px-4 py-3"
                      style={{
                        borderBottom: i < group.entries.length - 1 ? '1px solid var(--border)' : 'none',
                        background: 'rgba(255,255,255,0.015)',
                      }}>
                      <div className="flex-1 min-w-0">
                        {/* Row 1: lot count + buy price */}
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold font-mono" style={{ color: 'var(--text-secondary)' }}>
                            {h.lots} lot · {formatCurrency(h.avgPrice)}/lbr
                          </span>
                        </div>
                        {/* Row 2: sekuritas badge + date */}
                        <div className="flex items-center gap-1.5">
                          {/* Sekuritas badge */}
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                            style={{ background: 'rgba(99,179,237,0.12)', color: 'var(--blue)' }}>
                            {sekuritas}
                          </span>
                          {h.buyDate && (
                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                              {formatDate(h.buyDate)}
                            </span>
                          )}
                          {/* Entry P&L if price available */}
                          {entryValue > 0 && entryCost > 0 && (
                            <span className="text-[10px] font-medium ml-auto"
                              style={{ color: entryPl >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                              {entryPl >= 0 ? '+' : ''}{formatCurrency(entryPl)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
                        <button onClick={() => setSellTarget(h)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: 'rgba(34,197,94,0.10)', color: 'var(--accent)', border: '1px solid rgba(34,197,94,0.16)' }}>
                          <DollarSign size={12} />
                        </button>
                        <button onClick={() => openEdit(h)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: 'rgba(99,179,237,0.10)', color: 'var(--blue)', border: '1px solid rgba(99,179,237,0.16)' }}>
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => handleDelete(h.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: 'var(--red-dim)', color: 'var(--red)' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  )
                })}
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
                  Jika saham sudah ada, entri baru akan ditambahkan terpisah di bawah simbol yang sama.
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
                <div className="p-3 rounded-xl text-xs"
                  style={{ background: 'var(--blue-dim)', border: '1px solid rgba(99,179,237,0.2)' }}>
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
                <div className="p-3 rounded-xl text-xs"
                  style={{ background: 'var(--blue-dim)', border: '1px solid rgba(99,179,237,0.2)' }}>
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
