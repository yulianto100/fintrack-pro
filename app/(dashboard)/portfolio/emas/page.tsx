'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApiList } from '@/hooks/useApiData'
import { useGoldPrices } from '@/hooks/usePrices'
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils'
import type { GoldHolding, GoldSource, GoldType } from '@/types'
import { Plus, Trash2, RefreshCw, X, Wifi, WifiOff, TrendingUp, TrendingDown, DollarSign, Pencil } from 'lucide-react'
import { EmasSellModal } from '@/components/sell-modal'
import toast from 'react-hot-toast'

// ─── Provider config — Emasku dihapus ──────────────────────────────────────
const PROVIDERS: Record<string, { label: string; icon: string; color: string; type: GoldType }> = {
  antam:     { label: 'Antam',     icon: '🏅', color: '#f6cc60', type: 'fisik'   },
  pegadaian: { label: 'Pegadaian', icon: '🟡', color: '#f97316', type: 'digital' },
  treasury:  { label: 'Treasury',  icon: '💛', color: '#eab308', type: 'digital' },
  ubs:       { label: 'UBS',       icon: '🥈', color: '#94a3b8', type: 'fisik'   },
  galeri24:  { label: 'Galeri24',  icon: '🔶', color: '#fb923c', type: 'fisik'   },
}

const GOLD_TYPES: { value: GoldType; label: string; icon: string }[] = [
  { value: 'fisik',   label: 'Fisik',   icon: '🪙' },
  { value: 'digital', label: 'Digital', icon: '📲' },
]

// ─── Fintech-style price card ───────────────────────────────────────────────
function PriceCard({ source, price, selected, onClick }: {
  source: string
  price: { buyPrice: number; sellPrice: number; isLive?: boolean }
  selected?: boolean
  onClick?: () => void
}) {
  const cfg = PROVIDERS[source]
  if (!cfg) return null
  const spread = price.buyPrice - price.sellPrice

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="relative rounded-2xl p-3.5 cursor-pointer transition-all"
      style={{
        background: selected
          ? `linear-gradient(135deg, ${cfg.color}22, ${cfg.color}0a)`
          : 'rgba(255,255,255,0.88)',
        border: `1px solid ${selected ? cfg.color + '55' : 'var(--border)'}`,
        boxShadow: selected ? `0 0 16px ${cfg.color}18` : 'none',
      }}
    >
      {selected && (
        <div className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
          style={{ background: cfg.color }}>
          <svg width="8" height="8" viewBox="0 0 8 8">
            <path d="M1.5 4L3 5.5L6.5 2.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        </div>
      )}
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-xl">{cfg.icon}</span>
        <div>
          <p className="text-xs font-bold leading-tight" style={{ color: selected ? cfg.color : 'var(--text-primary)' }}>
            {cfg.label}
          </p>
          <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{cfg.type}</p>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <p className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>BELI</p>
          <p className="text-xs font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
            {formatCurrency(price.buyPrice)}
          </p>
        </div>
        <div className="h-px" style={{ background: 'var(--border)' }} />
        <div className="flex justify-between items-center">
          <p className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>BUYBACK</p>
          <p className="text-xs font-mono" style={{ color: cfg.color }}>
            {formatCurrency(price.sellPrice)}
          </p>
        </div>
        <div className="mt-1.5">
          <div className="flex justify-between items-center mb-0.5">
            <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Spread</p>
            <p className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
              {formatCurrency(spread)}
            </p>
          </div>
          {/* Spread bar */}
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (spread / 200000) * 100)}%`,
                background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}88)`,
              }} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function EmasPage() {
  const { data: holdings, loading, refetch } = useApiList<GoldHolding>('/api/portfolio/gold', { refreshMs: 10000 })
  const { prices, lastUpdated, isLive, refetch: refetchPrices } = useGoldPrices()

  const [showAdd,  setShowAdd ] = useState(false)
  const [saving,   setSaving  ] = useState(false)
  const [form,     setForm    ] = useState({
    grams: '', source: 'antam' as GoldSource, goldType: 'fisik' as GoldType,
    buyPrice: '', buyDate: new Date().toISOString().split('T')[0], notes: '',
  })
  const [sellTarget, setSellTarget] = useState<GoldHolding | null>(null)

  // ── Edit modal ──
  const [editEmasTarget, setEditEmasTarget] = useState<GoldHolding | null>(null)
  const [editEmasForm,   setEditEmasForm  ] = useState({ grams: '', buyPrice: '', buyDate: '', notes: '' })
  const [editEmasSaving, setEditEmasSaving] = useState(false)

  const openEditEmas = (h: GoldHolding) => {
    setEditEmasTarget(h)
    setEditEmasForm({
      grams:    String(h.grams),
      buyPrice: String(h.buyPrice || ''),
      buyDate:  h.buyDate || '',
      notes:    h.notes || '',
    })
  }

  const handleEditEmas = async () => {
    if (!editEmasTarget) return
    if (!editEmasForm.grams || parseFloat(editEmasForm.grams) <= 0) { return }
    setEditEmasSaving(true)
    try {
      const res = await fetch('/api/portfolio/gold', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id:       editEmasTarget.id,
          grams:    parseFloat(editEmasForm.grams),
          buyPrice: editEmasForm.buyPrice ? parseFloat(editEmasForm.buyPrice) : undefined,
          buyDate:  editEmasForm.buyDate,
          notes:    editEmasForm.notes,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Emas berhasil diupdate! ✓')
      setEditEmasTarget(null); refetch()
    } catch { toast.error('Gagal mengupdate emas') }
    finally { setEditEmasSaving(false) }
  }

  const availableProviders = Object.entries(PROVIDERS)
    .filter(([, v]) => v.type === form.goldType) as [string, typeof PROVIDERS.antam][]

  const totalGrams = holdings.reduce((s, h) => s + h.grams, 0)
  const totalValue = holdings.reduce((s, h) => s + h.grams * (prices?.[h.source]?.sellPrice || 0), 0)
  const totalCost  = holdings.filter((h) => h.buyPrice).reduce((s, h) => s + h.grams * (h.buyPrice || 0), 0)
  const totalPnl   = totalCost > 0 ? totalValue - totalCost : null

  const handleAdd = async () => {
    if (!form.grams || parseFloat(form.grams) <= 0) {
      toast.error('Masukkan jumlah gram yang valid')
      return
    }
    setSaving(true)
    try {
      // Send buyPrice only if user filled it in
      const payload: Record<string, unknown> = {
        grams:    form.grams,
        source:   form.source,
        goldType: form.goldType,
        buyDate:  form.buyDate,
        notes:    form.notes,
      }
      // Only include buyPrice if non-empty
      if (form.buyPrice && parseFloat(form.buyPrice) > 0) {
        payload.buyPrice = form.buyPrice
      }

      const res  = await fetch('/api/portfolio/gold', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Emas berhasil ditambahkan! ✓')
      setShowAdd(false)
      setForm({ grams:'', source:'antam', goldType:'fisik', buyPrice:'', buyDate: new Date().toISOString().split('T')[0], notes:'' })
      refetch()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menambahkan emas')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data emas ini?')) return
    await fetch(`/api/portfolio/gold?id=${id}`, { method: 'DELETE' })
    toast.success('Data emas dihapus')
    refetch()
  }

  // Grouped holdings for display
  const holdingsBySource = useMemo(() => {
    const groups: Record<string, { grams: number; value: number; pnl: number | null; entries: GoldHolding[] }> = {}
    holdings.forEach((h) => {
      const price = prices?.[h.source]?.sellPrice || 0
      if (!groups[h.source]) groups[h.source] = { grams: 0, value: 0, pnl: null, entries: [] }
      groups[h.source].grams += h.grams
      groups[h.source].value += h.grams * price
      if (h.buyPrice) {
        const thisPnl = h.grams * (price - h.buyPrice)
        groups[h.source].pnl = (groups[h.source].pnl || 0) + thisPnl
      }
      groups[h.source].entries.push(h)
    })
    return groups
  }, [holdings, prices])

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>
            🥇 Portofolio Emas
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            {isLive ? <Wifi size={11} color="var(--accent)"/> : <WifiOff size={11} color="var(--text-muted)"/>}
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {isLive ? 'Harga live' : 'Harga estimasi'} · {lastUpdated?.toLocaleTimeString('id-ID') || '—'} · auto 10s
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { refetch(); refetchPrices() }}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background:'rgba(255,255,255,0.90)', border:'1px solid var(--border)', color:'var(--text-secondary)' }}>
            <RefreshCw size={15}/>
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary px-4 py-2 flex items-center gap-1.5 text-sm">
            <Plus size={16}/> Tambah
          </button>
        </div>
      </div>

      {/* Summary hero */}
      <div className="glass-hero p-5 mb-4" style={{ borderColor:'rgba(246,204,96,0.22)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs mb-0.5" style={{ color:'var(--text-muted)' }}>Total Kepemilikan</p>
            <p className="text-2xl font-display font-bold" style={{ color:'#f6cc60' }}>
              {formatNumber(totalGrams, 3)} <span className="text-base font-normal">gram</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs mb-0.5" style={{ color:'var(--text-muted)' }}>Nilai Pasar</p>
            <p className="text-lg font-bold font-mono" style={{ color:'var(--text-primary)' }}>
              {formatCurrency(totalValue)}
            </p>
          </div>
        </div>
        {totalPnl !== null && (
          <div className="flex items-center gap-2 pt-3"
            style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
              style={{
                background: totalPnl >= 0 ? 'rgba(34,197,94,0.10)' : 'rgba(252,129,129,0.12)',
                border: `1px solid ${totalPnl >= 0 ? 'rgba(34,197,94,0.18)' : 'rgba(252,129,129,0.25)'}`,
              }}>
              {totalPnl >= 0 ? <TrendingUp size={13} color="var(--accent)"/> : <TrendingDown size={13} color="var(--red)"/>}
              <p className="text-xs font-bold" style={{ color: totalPnl >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                {totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)} P&L
              </p>
            </div>
            <p className="text-xs" style={{ color:'var(--text-muted)' }}>
              dari {formatCurrency(totalCost)} modal
            </p>
          </div>
        )}
      </div>

      {/* Live price cards — fintech style grid */}
      {prices && (
        <div className="mb-4">
          <p className="text-[11px] font-semibold px-1 mb-2.5" style={{ color:'var(--text-muted)' }}>
            HARGA REAL-TIME / GRAM
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.entries(PROVIDERS) as [string, typeof PROVIDERS.antam][]).map(([src]) => {
              const p = prices[src]
              if (!p) return null
              return (
                <PriceCard key={src} source={src} price={p} />
              )
            })}
          </div>
        </div>
      )}

      {/* Holdings */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_,i) => <div key={i} className="skeleton h-20 rounded-2xl"/>)}
        </div>
      ) : holdings.length === 0 ? (
        <div className="text-center py-14 glass-card">
          <p className="text-4xl mb-3">🥇</p>
          <p className="font-medium mb-1" style={{ color:'var(--text-primary)' }}>Belum ada kepemilikan emas</p>
          <p className="text-sm" style={{ color:'var(--text-muted)' }}>Tekan + Tambah untuk mulai</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[11px] font-semibold px-1" style={{ color:'var(--text-muted)' }}>
            KEPEMILIKAN ({holdings.length} entri)
          </p>
          {Object.entries(holdingsBySource).map(([src, group]) => {
            const cfg = PROVIDERS[src]
            if (!cfg) return null
            return (
              <motion.div key={src} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                className="glass-card overflow-hidden">
                {/* Group header */}
                <div className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: group.entries.length > 1 ? '1px solid var(--border)' : 'none' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                      style={{ background:`${cfg.color}18` }}>
                      {cfg.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-sm" style={{ color:'var(--text-primary)' }}>{cfg.label}</p>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background:`${cfg.color}18`, color:cfg.color }}>{cfg.type}</span>
                      </div>
                      <p className="text-xs font-bold" style={{ color:'#f6cc60' }}>
                        {formatNumber(group.grams, 3)} gr
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold font-mono" style={{ color:'var(--text-primary)' }}>
                      {formatCurrency(group.value)}
                    </p>
                    {group.pnl !== null && (
                      <p className="text-xs font-medium"
                        style={{ color: group.pnl >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                        {group.pnl >= 0 ? '+' : ''}{formatCurrency(group.pnl)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Individual entries */}
                {group.entries.map((h, i) => (
                  <div key={h.id}
                    className="flex items-center justify-between px-4 py-2.5"
                    style={{
                      borderBottom: i < group.entries.length - 1 ? '1px solid var(--border)' : 'none',
                      background: 'rgba(255,255,255,0.015)',
                    }}>
                    <div>
                      <p className="text-xs font-mono" style={{ color:'var(--text-secondary)' }}>
                        {formatNumber(h.grams, 3)} gr
                        {h.buyPrice ? ` · beli ${formatCurrency(h.buyPrice)}/gr` : ''}
                      </p>
                      {h.buyDate && (
                        <p className="text-[10px]" style={{ color:'var(--text-muted)' }}>
                          {formatDate(h.buyDate)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setSellTarget(h)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background:'rgba(34,197,94,0.10)', color:'var(--accent)', border:'1px solid rgba(34,197,94,0.16)' }}>
                        <DollarSign size={12}/>
                      </button>
                      <button onClick={() => openEditEmas(h)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background:'rgba(246,204,96,0.10)', color:'#d97706', border:'1px solid rgba(246,204,96,0.25)' }}>
                        <Pencil size={12}/>
                      </button>
                      <button onClick={() => handleDelete(h.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background:'var(--red-dim)', color:'var(--red)' }}>
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  </div>
                ))}
              </motion.div>
            )
          })}
        </div>
      )}

      {/* ─── Add Modal ─── */}
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
                <h2 className="font-display font-bold text-lg" style={{ color:'var(--text-primary)' }}>
                  Tambah Emas
                </h2>
                <button onClick={() => setShowAdd(false)}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background:'rgba(255,255,255,0.90)', color:'var(--text-secondary)' }}>
                  <X size={18}/>
                </button>
              </div>

              <div className="px-5 pb-7 space-y-4">
                {/* Jenis */}
                <div>
                  <label className="text-xs mb-2 block font-semibold" style={{ color:'var(--text-muted)' }}>
                    Jenis Emas
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {GOLD_TYPES.map((t) => (
                      <button key={t.value}
                        onClick={() => setForm({
                          ...form,
                          goldType: t.value,
                          source: t.value === 'digital' ? 'pegadaian' : 'antam',
                        })}
                        className="py-3 rounded-xl flex items-center justify-center gap-2 font-medium text-sm transition-all"
                        style={{
                          background: form.goldType === t.value ? 'rgba(246,204,96,0.14)' : 'rgba(255,255,255,0.88)',
                          border: `1px solid ${form.goldType === t.value ? '#f6cc6050' : 'var(--border)'}`,
                          color: form.goldType === t.value ? '#f6cc60' : 'var(--text-muted)',
                        }}>
                        <span className="text-lg">{t.icon}</span> {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Provider */}
                <div>
                  <label className="text-xs mb-2 block font-semibold" style={{ color:'var(--text-muted)' }}>
                    Provider
                  </label>
                  <div className={`grid gap-2 ${availableProviders.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    {availableProviders.map(([src, cfg]) => (
                      <button key={src}
                        onClick={() => setForm({ ...form, source: src as GoldSource })}
                        className="py-3 rounded-xl text-center transition-all"
                        style={{
                          background: form.source === src ? `${cfg.color}16` : 'rgba(255,255,255,0.88)',
                          border: `1px solid ${form.source === src ? cfg.color + '50' : 'var(--border)'}`,
                        }}>
                        <p className="text-xl mb-1">{cfg.icon}</p>
                        <p className="text-xs font-medium" style={{ color: form.source === src ? cfg.color : 'var(--text-muted)' }}>
                          {cfg.label}
                        </p>
                        {prices?.[src] && (
                          <p className="text-[9px] font-mono mt-0.5" style={{ color:'var(--text-muted)' }}>
                            {formatCurrency(prices[src].buyPrice)}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gram */}
                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color:'var(--text-muted)' }}>
                    Jumlah Gram <span style={{ color:'var(--accent)' }}>*</span>
                  </label>
                  <input type="number" step="0.001" min="0.001" className="input-glass"
                    placeholder="Contoh: 5.5"
                    value={form.grams}
                    onChange={(e) => setForm({ ...form, grams: e.target.value })}/>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Buy price — truly optional */}
                  <div>
                    <label className="text-xs mb-1.5 block font-semibold" style={{ color:'var(--text-muted)' }}>
                      Harga Beli/gr
                      <span className="ml-1 text-[9px] font-normal px-1.5 py-0.5 rounded-full"
                        style={{ background:'rgba(34,197,94,0.10)', color:'var(--accent)' }}>
                        opsional
                      </span>
                    </label>
                    <input type="number" className="input-glass"
                      placeholder={prices?.[form.source] ? String(prices[form.source].buyPrice) : 'Rp'}
                      value={form.buyPrice}
                      onChange={(e) => setForm({ ...form, buyPrice: e.target.value })}/>
                  </div>
                  <div>
                    <label className="text-xs mb-1.5 block font-semibold" style={{ color:'var(--text-muted)' }}>
                      Tanggal Beli
                    </label>
                    <input type="date" className="input-glass"
                      value={form.buyDate}
                      onChange={(e) => setForm({ ...form, buyDate: e.target.value })}/>
                  </div>
                </div>

                {/* Live preview */}
                {prices?.[form.source] && form.grams && parseFloat(form.grams) > 0 && (
                  <div className="p-3.5 rounded-xl"
                    style={{ background:'rgba(246,204,96,0.07)', border:'1px solid rgba(246,204,96,0.18)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold" style={{ color:'#f6cc60' }}>Preview</p>
                      <p className="text-[10px]" style={{ color:'var(--text-muted)' }}>
                        {parseFloat(form.grams)} gr × {formatCurrency(prices[form.source].sellPrice)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs" style={{ color:'var(--text-muted)' }}>Nilai pasar saat ini</p>
                      <p className="text-sm font-bold font-mono" style={{ color:'var(--text-primary)' }}>
                        {formatCurrency(parseFloat(form.grams) * prices[form.source].sellPrice)}
                      </p>
                    </div>
                    {form.buyPrice && parseFloat(form.buyPrice) > 0 && (
                      <div className="flex items-center justify-between mt-1.5 pt-1.5"
                        style={{ borderTop:'1px solid rgba(246,204,96,0.15)' }}>
                        <p className="text-xs" style={{ color:'var(--text-muted)' }}>Estimasi P&L</p>
                        {(() => {
                          const pnl = parseFloat(form.grams) * (prices[form.source].sellPrice - parseFloat(form.buyPrice))
                          return (
                            <p className="text-sm font-bold" style={{ color: pnl >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                              {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                            </p>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color:'var(--text-muted)' }}>
                    Catatan
                    <span className="ml-1 text-[9px] font-normal px-1.5 py-0.5 rounded-full"
                      style={{ background:'rgba(34,197,94,0.10)', color:'var(--accent)' }}>
                      opsional
                    </span>
                  </label>
                  <input type="text" className="input-glass" placeholder="Misal: Kado ulang tahun"
                    value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}/>
                </div>

                <button onClick={handleAdd} disabled={saving}
                  className="btn-primary w-full py-4 text-base font-bold"
                  style={{ background:'linear-gradient(135deg,#f6cc60,#d97706)' }}>
                  {saving
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"/>
                    : '💾 Simpan'
                  }
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sell modal */}
      {sellTarget && (
        <EmasSellModal
          holding={sellTarget}
          currentSellPrice={prices?.[sellTarget.source]?.sellPrice || 0}
          sourceLabel={PROVIDERS[sellTarget.source]?.label || sellTarget.source}
          onClose={() => setSellTarget(null)}
          onSuccess={() => { refetch(); setSellTarget(null) }}
        />
      )}

      {/* ── Edit Emas Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {editEmasTarget && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
              onClick={() => setEditEmasTarget(null)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="relative w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl"
              style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid var(--border)', maxHeight: '92dvh', overflowY: 'auto' }}
              onClick={(e) => e.stopPropagation()}>
              <div className="drag-indicator mt-3 sm:hidden" />
              <div className="flex items-center justify-between px-5 py-4">
                <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Edit Emas</h2>
                <button onClick={() => setEditEmasTarget(null)}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.06)', color: 'var(--text-secondary)' }}>
                  <X size={18}/>
                </button>
              </div>
              <div className="px-5 pb-7 space-y-4">
                <div className="p-3 rounded-xl"
                  style={{ background: 'rgba(246,204,96,0.10)', border: '1px solid rgba(246,204,96,0.22)' }}>
                  <p className="text-xs font-bold" style={{ color: '#d97706' }}>
                    {PROVIDERS[editEmasTarget.source]?.label || editEmasTarget.source} · {editEmasTarget.goldType}
                  </p>
                </div>

                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Jumlah Gram <span style={{ color: 'var(--accent)' }}>*</span>
                  </label>
                  <input type="number" step="0.001" className="input-glass" placeholder="Contoh: 1.5"
                    value={editEmasForm.grams}
                    onChange={(e) => setEditEmasForm({ ...editEmasForm, grams: e.target.value })} />
                </div>

                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>Harga Beli (Rp/gram)</label>
                  <input type="number" className="input-glass" placeholder="Opsional"
                    value={editEmasForm.buyPrice}
                    onChange={(e) => setEditEmasForm({ ...editEmasForm, buyPrice: e.target.value })} />
                </div>

                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>Tanggal Beli</label>
                  <input type="date" className="input-glass"
                    value={editEmasForm.buyDate}
                    onChange={(e) => setEditEmasForm({ ...editEmasForm, buyDate: e.target.value })} />
                </div>

                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>Catatan</label>
                  <input type="text" className="input-glass" placeholder="Opsional"
                    value={editEmasForm.notes}
                    onChange={(e) => setEditEmasForm({ ...editEmasForm, notes: e.target.value })} />
                </div>

                <button onClick={handleEditEmas} disabled={editEmasSaving}
                  className="w-full py-3.5 rounded-2xl font-semibold text-white transition-all active:scale-[0.98]"
                  style={{
                    background: editEmasSaving ? 'rgba(246,204,96,0.4)' : 'linear-gradient(135deg, #f6cc60, #d97706)',
                    boxShadow: editEmasSaving ? 'none' : '0 4px 16px rgba(246,204,96,0.28)',
                    cursor: editEmasSaving ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-space)',
                    color: '#7c4700',
                  }}>
                  {editEmasSaving ? <div className="w-5 h-5 border-2 border-amber-800/30 border-t-amber-900 rounded-full animate-spin mx-auto" /> : '✓ Simpan Perubahan'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
