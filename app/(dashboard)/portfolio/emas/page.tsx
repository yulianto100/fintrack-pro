'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApiList } from '@/hooks/useApiData'
import { useGoldPrices } from '@/hooks/usePrices'
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils'
import type { GoldHolding, GoldSource, GoldType } from '@/types'
import { Plus, Trash2, RefreshCw, X, Wifi, WifiOff, TrendingUp, TrendingDown, DollarSign, Pencil, ChevronDown, MoreHorizontal, Activity, Award, BadgePercent, LineChart, Sparkles } from 'lucide-react'
import { EmasSellModal } from '@/components/sell-modal'
import { useBalanceVisibility } from '@/hooks/useBalanceVisibility'
import { useCountUp } from '@/hooks/useCountUp'
import toast from 'react-hot-toast'
import { toastConfirm } from '@/lib/toast-undo'
import { EmptyHint } from '@/components/shared/EmptyHint'
import { SkeletonCard } from '@/components/shared/Skeleton'

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
const SECTION_LABEL = 'text-[11px] font-semibold px-1 uppercase tracking-[0.08em]'

function signedCurrency(value: number) {
  const sign = value > 0 ? '+' : ''
  return `${sign}${formatCurrency(value)}`
}

function signedPercent(value: number) {
  const sign = value > 0 ? '+' : ''
  return `${sign}${formatNumber(value, 2)}%`
}

function compactCurrency(value: number) {
  if (Math.abs(value) >= 1_000_000_000) return `${value >= 0 ? '' : '-'}Rp${formatNumber(Math.abs(value) / 1_000_000_000, 1)} M`
  if (Math.abs(value) >= 1_000_000) return `${value >= 0 ? '' : '-'}Rp${formatNumber(Math.abs(value) / 1_000_000, 1)} jt`
  if (Math.abs(value) >= 1_000) return `${value >= 0 ? '' : '-'}Rp${formatNumber(Math.abs(value) / 1_000, 0)} rb`
  return formatCurrency(value)
}

function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  const safeValues = values.length >= 2 ? values : [1, 1.01, 1.005, 1.018, 1.014, 1.026]
  const min = Math.min(...safeValues)
  const max = Math.max(...safeValues)
  const range = max - min || 1
  const points = safeValues.map((value, index) => {
    const x = (index / Math.max(1, safeValues.length - 1)) * 80
    const y = 24 - ((value - min) / range) * 20
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  return (
    <svg viewBox="0 0 80 28" className="h-7 w-20 overflow-visible" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      <polyline points={`0,28 ${points} 80,28`} fill={color} opacity="0.08" />
    </svg>
  )
}

function PriceCard({ source, price, selected, onClick, history = [] }: {
  source: string
  price: { buyPrice: number; sellPrice: number; isLive?: boolean; updatedAt?: string }
  selected?: boolean
  onClick?: () => void
  history?: number[]
}) {
  const cfg = PROVIDERS[source]
  if (!cfg) return null
  const spread = price.buyPrice - price.sellPrice
  const spreadPct = price.buyPrice > 0 ? (spread / price.buyPrice) * 100 : 0
  const firstPoint = history[0] || price.sellPrice
  const movement = price.sellPrice - firstPoint
  const movementPct = firstPoint > 0 ? (movement / firstPoint) * 100 : 0
  const positive = movement >= 0
  const updatedAt = price.updatedAt ? new Date(price.updatedAt) : null
  const secondsAgo = updatedAt ? Math.max(0, Math.round((Date.now() - updatedAt.getTime()) / 1000)) : null

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="relative rounded-2xl p-3.5 cursor-pointer transition-all overflow-hidden"
      style={{
        background: selected
          ? `linear-gradient(135deg, ${cfg.color}22, ${cfg.color}0a)`
          : `linear-gradient(145deg, var(--surface-btn), ${cfg.color}08)`,
        border: `1px solid ${selected ? cfg.color + '55' : 'var(--border)'}`,
        boxShadow: selected ? `0 0 16px ${cfg.color}18` : `0 8px 22px rgba(0,0,0,0.08)`,
      }}
    >
      <div className="absolute inset-x-0 top-0 h-px" style={{ background:`linear-gradient(90deg, transparent, ${cfg.color}88, transparent)` }} />
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl leading-none">{cfg.icon}</span>
          <div className="min-w-0">
            <p className="text-xs font-bold leading-tight truncate" style={{ color: selected ? cfg.color : 'var(--text-primary)' }}>
              {cfg.label}
            </p>
            <p className="text-[9px] capitalize" style={{ color: 'var(--text-muted)' }}>{cfg.type}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
          style={{
            background: positive ? 'rgba(34,197,94,0.10)' : 'rgba(248,113,113,0.12)',
            color: positive ? 'var(--accent)' : 'var(--red)',
          }}>
          {positive ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
          <span className="text-[9px] font-bold">{signedPercent(movementPct)}</span>
        </div>
      </div>

      <div className="flex items-end justify-between gap-2 mb-2">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>Buyback</p>
          <p className="text-sm font-bold font-mono leading-tight" style={{ color: cfg.color }}>
            {formatCurrency(price.sellPrice)}
          </p>
        </div>
        <MiniSparkline values={history} color={cfg.color} />
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <p className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>Harga beli</p>
          <p className="text-[11px] font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>
            {formatCurrency(price.buyPrice)}
          </p>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-[9px] font-medium" style={{ color: 'var(--text-muted)' }}>Spread</p>
          <p className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
            {formatCurrency(spread)} / {formatNumber(spreadPct, 1)}%
          </p>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, spreadPct * 12)}%`,
              background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}88)`,
            }} />
        </div>
        <div className="flex items-center gap-1 pt-1">
          <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: price.isLive ? 'var(--accent)' : 'var(--text-muted)' }} />
          <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
            {secondsAgo === null ? 'Menunggu update' : `Updated ${secondsAgo}s ago`}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function EmasPage() {
  const { data: holdings, loading, refetch } = useApiList<GoldHolding>('/api/portfolio/gold', { refreshMs: 10000 })
  const { hidden } = useBalanceVisibility()
  const MASKED = '••••••'
  const { prices, lastUpdated, isLive, refetch: refetchPrices } = useGoldPrices()

  const [showAdd,  setShowAdd ] = useState(false)
  const [saving,   setSaving  ] = useState(false)
  const [form,     setForm    ] = useState({
    grams: '', source: 'antam' as GoldSource, goldType: 'fisik' as GoldType,
    buyPrice: '', buyDate: new Date().toISOString().split('T')[0], notes: '',
  })
  const [sellTarget, setSellTarget] = useState<GoldHolding | null>(null)
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({})
  const [entryActionsOpen, setEntryActionsOpen] = useState<Record<string, boolean>>({})
  const [priceHistory, setPriceHistory] = useState<Record<string, number[]>>({})

  useEffect(() => {
    if (!prices) return
    setPriceHistory((current) => {
      const next = { ...current }
      Object.entries(prices).forEach(([source, price]) => {
        const history = next[source] || []
        const last = history[history.length - 1]
        next[source] = last === price.sellPrice
          ? history
          : [...history, price.sellPrice].slice(-12)
      })
      return next
    })
  }, [prices])

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
  const totalCostGrams = holdings.filter((h) => h.buyPrice).reduce((s, h) => s + h.grams, 0)
  const avgBuyPrice = totalCostGrams > 0 ? totalCost / totalCostGrams : null
  const totalPnlPercent = totalPnl !== null && totalCost > 0 ? (totalPnl / totalCost) * 100 : null
  const snapshotValue = holdings.reduce((s, h) => {
    const history = priceHistory[h.source]
    return s + h.grams * (history?.[0] || prices?.[h.source]?.sellPrice || 0)
  }, 0)
  const marketMove = snapshotValue > 0 ? totalValue - snapshotValue : 0
  const marketMovePercent = snapshotValue > 0 ? (marketMove / snapshotValue) * 100 : 0
  const animatedTotalValue = useCountUp(totalValue, 700, !hidden)
  const animatedTotalPnl = useCountUp(totalPnl || 0, 700, !hidden)

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

  const doDelete = async (id: string) => {
    await fetch(`/api/portfolio/gold?id=${id}`, { method: 'DELETE' })
    toast.success('Data emas dihapus')
    refetch()
  }

  const handleDelete = (id: string) => {
    const holding = holdings.find((h) => h.id === id)
    const label = holding ? `${formatNumber(holding.grams, 3)} gr ${PROVIDERS[holding.source]?.label || 'emas'}` : 'data emas'
    toastConfirm(`Hapus ${label}?`, () => doDelete(id))
  }

  // Grouped holdings for display
  const holdingsBySource = useMemo(() => {
    const groups: Record<string, { grams: number; value: number; cost: number; costGrams: number; pnl: number | null; entries: GoldHolding[] }> = {}
    holdings.forEach((h) => {
      const price = prices?.[h.source]?.sellPrice || 0
      if (!groups[h.source]) groups[h.source] = { grams: 0, value: 0, cost: 0, costGrams: 0, pnl: null, entries: [] }
      groups[h.source].grams += h.grams
      groups[h.source].value += h.grams * price
      if (h.buyPrice) {
        const thisPnl = h.grams * (price - h.buyPrice)
        groups[h.source].pnl = (groups[h.source].pnl || 0) + thisPnl
        groups[h.source].cost += h.grams * h.buyPrice
        groups[h.source].costGrams += h.grams
      }
      groups[h.source].entries.push(h)
    })
    return groups
  }, [holdings, prices])

  const groupedEntries = Object.entries(holdingsBySource)
  const bestPerformer = groupedEntries
    .filter(([, group]) => group.pnl !== null && group.cost > 0)
    .map(([src, group]) => ({ src, pnlPct: ((group.pnl || 0) / group.cost) * 100 }))
    .sort((a, b) => b.pnlPct - a.pnlPct)[0]
  const topHolding = groupedEntries.sort((a, b) => b[1].value - a[1].value)[0]
  const highestSpread = prices
    ? Object.entries(prices)
        .map(([src, price]) => ({ src, spreadPct: price.buyPrice > 0 ? ((price.buyPrice - price.sellPrice) / price.buyPrice) * 100 : 0 }))
        .sort((a, b) => b.spreadPct - a.spreadPct)[0]
    : null
  const allocationSegments = groupedEntries.map(([src, group]) => ({
    src,
    width: totalValue > 0 ? (group.value / totalValue) * 100 : 0,
    color: PROVIDERS[src]?.color || 'var(--accent)',
  }))

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
            style={{ background:'var(--surface-close)', border:'1px solid var(--border)', color:'var(--text-secondary)' }}>
            <RefreshCw size={15}/>
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary px-4 py-2 flex items-center gap-1.5 text-sm">
            <Plus size={16}/> Tambah
          </button>
        </div>
      </div>

      {/* Summary hero */}
      <div className="glass-hero p-5 mb-4" style={{
        borderColor: totalPnl !== null && totalPnl >= 0 ? 'rgba(34,197,94,0.28)' : 'rgba(246,204,96,0.22)',
        boxShadow: totalPnl !== null && totalPnl >= 0 ? '0 16px 42px rgba(34,197,94,0.13), 0 8px 30px rgba(0,0,0,0.30)' : undefined,
      }}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: isLive ? 'var(--accent)' : 'var(--gold)' }} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color:'var(--text-muted)' }}>
                Nilai Portofolio
              </p>
            </div>
            <p className="text-3xl font-display font-bold leading-tight" style={{ color:'var(--text-primary)', letterSpacing: hidden ? 2 : 'normal' }}>
              {hidden ? MASKED : formatCurrency(animatedTotalValue)}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-xs font-bold" style={{ color:'#f6cc60', letterSpacing: hidden ? 1 : 'normal' }}>
                {hidden ? MASKED : `${formatNumber(totalGrams, 3)} gram`}
              </span>
              {totalPnl !== null && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                  style={{
                    background: totalPnl >= 0 ? 'rgba(34,197,94,0.12)' : 'rgba(248,113,113,0.14)',
                    border: `1px solid ${totalPnl >= 0 ? 'rgba(34,197,94,0.22)' : 'rgba(248,113,113,0.22)'}`,
                    color: totalPnl >= 0 ? 'var(--accent)' : 'var(--red)',
                  }}>
                  {totalPnl >= 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                  {hidden ? MASKED : `${signedCurrency(animatedTotalPnl)} (${signedPercent(totalPnlPercent || 0)})`}
                </span>
              )}
            </div>
          </div>
          {totalPnlPercent !== null && totalPnlPercent >= 20 && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-2xl"
              style={{ background:'rgba(34,197,94,0.10)', border:'1px solid rgba(34,197,94,0.18)', color:'var(--accent)' }}>
              <Sparkles size={14}/>
              <span className="text-xs font-bold">Profit kuat</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-2xl p-3" style={{ background:'rgba(255,255,255,0.045)', border:'1px solid var(--border)' }}>
            <p className="text-[10px] mb-1" style={{ color:'var(--text-muted)' }}>Avg beli/gr</p>
            <p className="text-xs font-bold font-mono" style={{ color:'var(--text-primary)', letterSpacing: hidden ? 1 : 'normal' }}>
              {hidden ? MASKED : avgBuyPrice ? formatCurrency(avgBuyPrice) : 'Belum ada'}
            </p>
          </div>
          <div className="rounded-2xl p-3" style={{ background:'rgba(255,255,255,0.045)', border:'1px solid var(--border)' }}>
            <p className="text-[10px] mb-1" style={{ color:'var(--text-muted)' }}>Pergerakan</p>
            <p className="text-xs font-bold" style={{ color: marketMove >= 0 ? 'var(--accent)' : 'var(--red)', letterSpacing: hidden ? 1 : 'normal' }}>
              {hidden ? MASKED : `${signedCurrency(marketMove)} (${signedPercent(marketMovePercent)})`}
            </p>
          </div>
          <div className="rounded-2xl p-3" style={{ background:'rgba(255,255,255,0.045)', border:'1px solid var(--border)' }}>
            <p className="text-[10px] mb-1" style={{ color:'var(--text-muted)' }}>Modal</p>
            <p className="text-xs font-bold font-mono" style={{ color:'var(--text-primary)', letterSpacing: hidden ? 1 : 'normal' }}>
              {hidden ? MASKED : totalCost > 0 ? compactCurrency(totalCost) : '-'}
            </p>
          </div>
        </div>

        {allocationSegments.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color:'var(--text-muted)' }}>Alokasi</p>
              <p className="text-[10px]" style={{ color:'var(--text-muted)' }}>{allocationSegments.length} issuer</p>
            </div>
            <div className="h-2 rounded-full overflow-hidden flex" style={{ background:'var(--border)' }}>
              {allocationSegments.map((segment) => (
                <div key={segment.src} className="h-full" style={{ width:`${segment.width}%`, background:segment.color }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick insights */}
      {holdings.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
          {[
            { label:'Hari ini', value: hidden ? MASKED : signedCurrency(marketMove), tone: marketMove >= 0 ? 'var(--accent)' : 'var(--red)', icon: Activity },
            { label:'7D lokal', value: hidden ? MASKED : signedPercent(marketMovePercent), tone: marketMove >= 0 ? 'var(--accent)' : 'var(--red)', icon: LineChart },
            { label:'Terbaik', value: bestPerformer ? `${PROVIDERS[bestPerformer.src]?.label} ${signedPercent(bestPerformer.pnlPct)}` : 'Belum ada', tone: 'var(--accent)', icon: Award },
            { label:'Spread tinggi', value: highestSpread ? `${PROVIDERS[highestSpread.src]?.label} ${formatNumber(highestSpread.spreadPct, 1)}%` : '-', tone: '#f6cc60', icon: BadgePercent },
            { label:'Top holding', value: topHolding ? PROVIDERS[topHolding[0]]?.label : '-', tone: '#f6cc60', icon: Sparkles },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div key={item.label} className="rounded-2xl p-3" style={{ background:'var(--surface-btn)', border:'1px solid var(--border)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={12} style={{ color:item.tone }} />
                  <p className="text-[10px] font-semibold" style={{ color:'var(--text-muted)' }}>{item.label}</p>
                </div>
                <p className="text-xs font-bold truncate" style={{ color:'var(--text-primary)', letterSpacing: hidden ? 1 : 'normal' }}>{item.value}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Live price cards — fintech style grid */}
      {prices && (
        <div className="mb-4">
          <div className="flex items-center justify-between px-1 mb-2.5">
            <p className={SECTION_LABEL} style={{ color:'var(--text-muted)' }}>
              Harga real-time / gram
            </p>
            <p className="text-[10px]" style={{ color:'var(--text-muted)' }}>
              {lastUpdated ? `Sync ${lastUpdated.toLocaleTimeString('id-ID')}` : 'Menunggu sync'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.entries(PROVIDERS) as [string, typeof PROVIDERS.antam][]).map(([src]) => {
              const p = prices[src]
              if (!p) return null
              return (
                <PriceCard key={src} source={src} price={p} history={priceHistory[src] || []} />
              )
            })}
          </div>
        </div>
      )}

      {/* Holdings */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_,i) => <SkeletonCard key={i} />)}
        </div>
      ) : holdings.length === 0 ? (
        <div className="glass-card">
          <EmptyHint
            icon="Au"
            title="Belum ada kepemilikan emas"
            description="Tekan Tambah untuk mulai mencatat portofolio emas"
            primaryCta={{ label: 'Tambah Emas', onClick: () => setShowAdd(true) }}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <p className={SECTION_LABEL} style={{ color:'var(--text-muted)' }}>
            Kepemilikan ({groupedEntries.length} aset / {holdings.length} entri)
          </p>
          {Object.entries(holdingsBySource).map(([src, group]) => {
            const cfg = PROVIDERS[src]
            if (!cfg) return null
            const expanded = !!expandedSources[src]
            const pnlPct = group.pnl !== null && group.cost > 0 ? (group.pnl / group.cost) * 100 : null
            const avgSourceBuy = group.costGrams > 0 ? group.cost / group.costGrams : null
            const isTopHolding = topHolding?.[0] === src
            const isBest = bestPerformer?.src === src
            return (
              <motion.div key={src} layout initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                className="glass-card overflow-hidden"
                style={{
                  borderColor: group.pnl !== null && group.pnl >= 0 ? 'rgba(34,197,94,0.18)' : 'var(--border)',
                  boxShadow: group.pnl !== null && group.pnl >= 0 ? '0 12px 30px rgba(34,197,94,0.08), 0 4px 24px rgba(0,0,0,0.24)' : undefined,
                }}>
                {/* Group header */}
                <button
                  type="button"
                  onClick={() => setExpandedSources((current) => ({ ...current, [src]: !current[src] }))}
                  className="w-full text-left flex items-start justify-between gap-3 px-4 py-3.5"
                  style={{ borderBottom: expanded ? '1px solid var(--border)' : 'none' }}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                      style={{ background:`${cfg.color}18`, boxShadow:`inset 0 0 0 1px ${cfg.color}22` }}>
                      {cfg.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-sm truncate" style={{ color:'var(--text-primary)' }}>{cfg.label}</p>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium capitalize"
                          style={{ background:`${cfg.color}18`, color:cfg.color }}>{cfg.type}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-xs font-bold" style={{ color:'#f6cc60', letterSpacing: hidden ? 1 : 'normal' }}>
                          {hidden ? MASKED : `${formatNumber(group.grams, 3)} gr`}
                        </span>
                        {isTopHolding && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background:'rgba(246,204,96,0.12)', color:'#f6cc60' }}>
                            Top holding
                          </span>
                        )}
                        {isBest && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background:'rgba(34,197,94,0.12)', color:'var(--accent)' }}>
                            Best performer
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] mt-1" style={{ color:'var(--text-muted)', letterSpacing: hidden ? 1 : 'normal' }}>
                        {hidden ? MASKED : `${group.entries.length} transaksi${avgSourceBuy ? ` · avg ${formatCurrency(avgSourceBuy)}/gr` : ''}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold font-mono" style={{ color:'var(--text-primary)', letterSpacing: hidden ? 1 : 'normal' }}>
                      {hidden ? MASKED : formatCurrency(group.value)}
                    </p>
                    {group.pnl !== null && (
                      <div className="flex justify-end mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{
                            background: group.pnl >= 0 ? 'rgba(34,197,94,0.10)' : 'rgba(248,113,113,0.12)',
                            color: group.pnl >= 0 ? 'var(--accent)' : 'var(--red)',
                          }}>
                          {hidden ? MASKED : `${signedCurrency(group.pnl)}${pnlPct !== null ? ` (${signedPercent(pnlPct)})` : ''}`}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-end mt-2">
                      <ChevronDown
                        size={16}
                        className="transition-transform"
                        style={{ color:'var(--text-muted)', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      />
                    </div>
                  </div>
                </button>

                {/* Individual entries */}
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      initial={{ height:0, opacity:0 }}
                      animate={{ height:'auto', opacity:1 }}
                      exit={{ height:0, opacity:0 }}
                      transition={{ duration:0.22, ease:[0.16,1,0.3,1] }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-3 gap-2 px-4 py-3" style={{ borderBottom:'1px solid var(--border)', background:'rgba(255,255,255,0.018)' }}>
                        <div className="rounded-xl p-2" style={{ background:'rgba(255,255,255,0.035)', border:'1px solid var(--border)' }}>
                          <p className="text-[9px]" style={{ color:'var(--text-muted)' }}>Market</p>
                          <p className="text-[11px] font-bold font-mono" style={{ color:'var(--text-primary)' }}>{hidden ? MASKED : formatCurrency(group.value)}</p>
                        </div>
                        <div className="rounded-xl p-2" style={{ background:'rgba(255,255,255,0.035)', border:'1px solid var(--border)' }}>
                          <p className="text-[9px]" style={{ color:'var(--text-muted)' }}>Avg beli</p>
                          <p className="text-[11px] font-bold font-mono" style={{ color:'var(--text-primary)' }}>{hidden ? MASKED : avgSourceBuy ? formatCurrency(avgSourceBuy) : '-'}</p>
                        </div>
                        <div className="rounded-xl p-2" style={{ background:'rgba(255,255,255,0.035)', border:'1px solid var(--border)' }}>
                          <p className="text-[9px]" style={{ color:'var(--text-muted)' }}>P&L %</p>
                          <p className="text-[11px] font-bold" style={{ color:(group.pnl || 0) >= 0 ? 'var(--accent)' : 'var(--red)' }}>{hidden ? MASKED : pnlPct !== null ? signedPercent(pnlPct) : '-'}</p>
                        </div>
                      </div>
                {group.entries.map((h, i) => (
                  <div key={h.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                    style={{
                      borderBottom: i < group.entries.length - 1 ? '1px solid var(--border)' : 'none',
                      background: 'rgba(255,255,255,0.015)',
                    }}>
                    <div className="min-w-0">
                      <p className="text-xs font-mono" style={{ color:'var(--text-secondary)', letterSpacing: hidden ? 1 : 'normal' }}>
                        {hidden
                          ? MASKED
                          : <>{formatNumber(h.grams, 3)} gr{h.buyPrice ? ` · beli ${formatCurrency(h.buyPrice)}/gr` : ''}</>}
                      </p>
                      {h.buyDate && (
                        <p className="text-[10px]" style={{ color:'var(--text-muted)' }}>
                          {formatDate(h.buyDate)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => setSellTarget(h)}
                        className="h-8 px-2.5 rounded-xl flex items-center gap-1 text-xs font-bold flex-shrink-0"
                        style={{ background:'rgba(34,197,94,0.10)', color:'var(--accent)', border:'1px solid rgba(34,197,94,0.16)' }}>
                        <DollarSign size={12}/> Jual
                      </button>
                      {entryActionsOpen[h.id] ? (
                        <>
                          <button onClick={() => openEditEmas(h)}
                            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background:'rgba(246,204,96,0.08)', color:'#d97706', border:'1px solid rgba(246,204,96,0.18)' }}>
                            <Pencil size={12}/>
                          </button>
                          <button onClick={() => handleDelete(h.id)}
                            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background:'rgba(248,113,113,0.07)', color:'var(--red)', border:'1px solid rgba(248,113,113,0.12)' }}>
                            <Trash2 size={12}/>
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setEntryActionsOpen((current) => ({ ...current, [h.id]: true }))}
                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background:'var(--surface-btn)', color:'var(--text-muted)', border:'1px solid var(--border)' }}>
                          <MoreHorizontal size={13}/>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                    </motion.div>
                  )}
                </AnimatePresence>
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
              style={{ background:'var(--surface-modal)', border:'1px solid var(--border)', maxHeight:'92dvh', overflowY:'auto' }}
              onClick={(e) => e.stopPropagation()}>

              <div className="drag-indicator mt-3 sm:hidden"/>

              <div className="flex items-center justify-between px-5 py-4">
                <h2 className="font-display font-bold text-lg" style={{ color:'var(--text-primary)' }}>
                  Tambah Emas
                </h2>
                <button onClick={() => setShowAdd(false)}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background:'var(--surface-close)', color:'var(--text-secondary)' }}>
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
                          background: form.goldType === t.value ? 'rgba(246,204,96,0.14)' : 'var(--surface-btn)',
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
                          background: form.source === src ? `${cfg.color}16` : 'var(--surface-btn)',
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
              style={{ background: 'var(--surface-sheet)', border: '1px solid var(--border)', maxHeight: '92dvh', overflowY: 'auto' }}
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
