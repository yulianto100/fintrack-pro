'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApiList } from '@/hooks/useApiData'
import { useGoldPrices } from '@/hooks/usePrices'
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils'
import type { GoldHolding, GoldSource, GoldType } from '@/types'
import { Plus, Trash2, RefreshCw, X, Wifi, WifiOff, TrendingUp, TrendingDown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'

const PROVIDERS: Record<GoldSource, { label: string; icon: string; color: string; type: GoldType }> = {
  antam:     { label: 'Antam',     icon: '🏅', color: '#f6cc60', type: 'fisik'   },
  pegadaian: { label: 'Pegadaian', icon: '🟡', color: '#f97316', type: 'digital' },
  treasury:  { label: 'Treasury',  icon: '💛', color: '#eab308', type: 'digital' },
  ubs:       { label: 'UBS',       icon: '🥈', color: '#94a3b8', type: 'fisik'   },
  galeri24:  { label: 'Galeri24',  icon: '🔶', color: '#fb923c', type: 'fisik'   },
  emasku:    { label: 'Emasku',    icon: '💚', color: '#4ade80', type: 'digital' },
}

const GOLD_TYPES: { value: GoldType; label: string; icon: string }[] = [
  { value: 'digital', label: 'Digital', icon: '📲' },
  { value: 'fisik',   label: 'Fisik',   icon: '🪙'  },
]

export default function EmasPage() {
  const { data: holdings, loading, refetch } = useApiList<GoldHolding>('/api/portfolio/gold', { refreshMs: 10000 })
  const { prices, lastUpdated, isLive, refetch: refetchPrices } = useGoldPrices()

  const [showAdd,  setShowAdd ] = useState(false)
  const [saving,   setSaving  ] = useState(false)
  const [goldType, setGoldType] = useState<GoldType>('fisik')
  const [form,     setForm    ] = useState({
    grams: '', source: 'antam' as GoldSource, goldType: 'fisik' as GoldType,
    buyPrice: '', buyDate: new Date().toISOString().split('T')[0], notes: '',
  })

  // Filter providers by selected type
  const availableProviders = Object.entries(PROVIDERS)
    .filter(([, v]) => v.type === form.goldType) as [GoldSource, typeof PROVIDERS.antam][]

  // Totals
  const totalGrams = holdings.reduce((s, h) => s + h.grams, 0)
  const totalValue = holdings.reduce((s, h) => s + h.grams * (prices?.[h.source]?.sellPrice || 0), 0)
  const totalCost  = holdings.reduce((s, h) => s + h.grams * (h.buyPrice || 0), 0)
  const totalPnl   = totalCost > 0 ? totalValue - totalCost : null

  // Bar chart data
  const chartData = useMemo(() => {
    if (!prices) return []
    return Object.entries(PROVIDERS).map(([src, cfg]) => ({
      name:   cfg.label,
      jual:   prices[src as GoldSource]?.buyPrice  || 0,
      buyback: prices[src as GoldSource]?.sellPrice || 0,
      color:  cfg.color,
    })).filter((d) => d.jual > 0)
  }, [prices])

  const handleAdd = async () => {
    if (!form.grams || parseFloat(form.grams) <= 0) { toast.error('Masukkan jumlah gram yang valid'); return }
    setSaving(true)
    try {
      const res  = await fetch('/api/portfolio/gold', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, goldType: form.goldType }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Emas berhasil ditambahkan! ✓')
      setShowAdd(false)
      setForm({ grams:'', source:'antam', goldType:'fisik', buyPrice:'', buyDate: new Date().toISOString().split('T')[0], notes:'' })
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

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>🥇 Portofolio Emas</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            {isLive ? <Wifi size={11} color="var(--accent)"/> : <WifiOff size={11} color="var(--text-muted)"/>}
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {isLive ? 'Live' : 'Estimasi'} · {lastUpdated?.toLocaleTimeString('id-ID') || '—'} · Auto 10s
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { refetch(); refetchPrices() }}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background:'var(--surface-3)', border:'1px solid var(--border)', color:'var(--text-secondary)' }}>
            <RefreshCw size={15}/>
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary px-4 py-2 flex items-center gap-1.5 text-sm">
            <Plus size={16}/> Tambah
          </button>
        </div>
      </div>

      {/* Summary hero */}
      <div className="glass-hero p-5 mb-4" style={{ borderColor:'rgba(246,204,96,0.25)' }}>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs mb-1" style={{ color:'var(--text-muted)' }}>Total Gram</p>
            <p className="text-2xl font-display font-bold" style={{ color:'#f6cc60' }}>
              {formatNumber(totalGrams, 3)} <span className="text-base">gr</span>
            </p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color:'var(--text-muted)' }}>Nilai Pasar</p>
            <p className="text-base font-bold font-mono" style={{ color:'var(--text-primary)' }}>
              {formatCurrency(totalValue)}
            </p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color:'var(--text-muted)' }}>P&L</p>
            {totalPnl !== null ? (
              <div className="flex items-center gap-1">
                {totalPnl >= 0
                  ? <TrendingUp size={14} color="var(--accent)"/>
                  : <TrendingDown size={14} color="var(--red)"/>}
                <p className="text-sm font-bold" style={{ color: totalPnl >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                  {totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)}
                </p>
              </div>
            ) : (
              <p className="text-sm" style={{ color:'var(--text-muted)' }}>—</p>
            )}
          </div>
        </div>
      </div>

      {/* Price comparison chart */}
      {chartData.length > 0 && (
        <div className="glass-card p-4 mb-4">
          <p className="text-xs font-semibold mb-3" style={{ color:'var(--text-muted)' }}>
            PERBANDINGAN HARGA / GRAM (Rp)
          </p>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={chartData} barCategoryGap="30%">
              <XAxis dataKey="name" tick={{ fontSize:9, fill:'var(--text-muted)' }} axisLine={false} tickLine={false}/>
              <YAxis hide domain={['auto','auto']}/>
              <Tooltip
                formatter={(v: number, name: string) => [formatCurrency(v), name === 'jual' ? 'Harga Beli' : 'Buyback']}
                contentStyle={{ background:'var(--surface-3)',border:'1px solid var(--border)',borderRadius:8,fontSize:11 }}
              />
              <Bar dataKey="jual"    fill="#f6cc60" radius={[4,4,0,0]} opacity={0.9}/>
              <Bar dataKey="buyback" fill="#f6cc6060" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2">
            {[{ color:'#f6cc60', label:'Harga Beli' },{ color:'#f6cc6060', label:'Buyback' }].map((l) => (
              <div key={l.label} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background:l.color }}/>
                <span className="text-[10px]" style={{ color:'var(--text-muted)' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live prices grid */}
      {prices && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {(Object.entries(PROVIDERS) as [GoldSource, typeof PROVIDERS.antam][]).map(([src, cfg]) => {
            const p = prices[src]
            if (!p) return null
            return (
              <div key={src} className="glass-card p-3 text-center">
                <p className="text-xl mb-1">{cfg.icon}</p>
                <p className="text-[10px] font-semibold mb-0.5" style={{ color:cfg.color }}>{cfg.label}</p>
                <p className="text-[9px] mb-1.5 px-1 py-0.5 rounded-full inline-block"
                  style={{ background:`${cfg.color}18`, color:cfg.color }}>
                  {cfg.type}
                </p>
                <p className="text-[10px]" style={{ color:'var(--text-muted)' }}>Beli</p>
                <p className="text-[11px] font-bold font-mono" style={{ color:'var(--text-primary)' }}>
                  {formatCurrency(p.buyPrice)}
                </p>
                <p className="text-[10px] mt-1" style={{ color:'var(--text-muted)' }}>Buyback</p>
                <p className="text-[11px] font-mono" style={{ color:cfg.color }}>
                  {formatCurrency(p.sellPrice)}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* Holdings list */}
      {loading ? (
        <div className="space-y-3">{[...Array(2)].map((_,i) => <div key={i} className="skeleton h-24 rounded-2xl"/>)}</div>
      ) : holdings.length === 0 ? (
        <div className="text-center py-14">
          <p className="text-4xl mb-3">🥇</p>
          <p className="font-medium mb-1" style={{ color:'var(--text-primary)' }}>Belum ada emas</p>
          <p className="text-sm" style={{ color:'var(--text-muted)' }}>Tekan + Tambah untuk input kepemilikan emas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {holdings.map((h) => {
            const price = prices?.[h.source]?.sellPrice || 0
            const value = h.grams * price
            const pl    = h.buyPrice ? value - h.grams * h.buyPrice : null
            const cfg   = PROVIDERS[h.source]
            return (
              <motion.div key={h.id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                className="glass-card p-4 flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background:`${cfg.color}18` }}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="font-semibold mr-2" style={{ color:'var(--text-primary)' }}>{cfg.label}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background:`${cfg.color}18`, color:cfg.color }}>
                        {h.goldType || cfg.type}
                      </span>
                    </div>
                    <button onClick={() => handleDelete(h.id)} className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background:'var(--red-dim)', color:'var(--red)' }}>
                      <Trash2 size={13}/>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <div>
                      <p className="text-[10px]" style={{ color:'var(--text-muted)' }}>Gram</p>
                      <p className="text-sm font-bold" style={{ color:'#f6cc60' }}>{formatNumber(h.grams, 3)} gr</p>
                    </div>
                    <div>
                      <p className="text-[10px]" style={{ color:'var(--text-muted)' }}>Nilai</p>
                      <p className="text-sm font-bold font-mono" style={{ color:'var(--text-primary)' }}>{formatCurrency(value)}</p>
                    </div>
                    {pl !== null && (
                      <div>
                        <p className="text-[10px]" style={{ color:'var(--text-muted)' }}>P&L</p>
                        <p className="text-xs font-semibold" style={{ color: pl >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                          {pl >= 0 ? '+' : ''}{formatCurrency(pl)}
                        </p>
                      </div>
                    )}
                    {h.buyDate && (
                      <div>
                        <p className="text-[10px]" style={{ color:'var(--text-muted)' }}>Tgl Beli</p>
                        <p className="text-xs" style={{ color:'var(--text-secondary)' }}>{formatDate(h.buyDate)}</p>
                      </div>
                    )}
                  </div>
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
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="absolute inset-0" style={{ background:'rgba(0,0,0,0.65)', backdropFilter:'blur(6px)' }}
              onClick={() => setShowAdd(false)}/>
            <motion.div initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
              transition={{ type:'spring', damping:30, stiffness:350 }}
              className="relative w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl p-6"
              style={{ background:'var(--surface-1)', border:'1px solid var(--border)', maxHeight:'90dvh', overflowY:'auto' }}
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-bold text-lg" style={{ color:'var(--text-primary)' }}>Tambah Emas</h2>
                <button onClick={() => setShowAdd(false)} className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background:'var(--surface-3)', color:'var(--text-secondary)' }}>
                  <X size={18}/>
                </button>
              </div>

              <div className="space-y-4">
                {/* Type selector */}
                <div>
                  <label className="text-xs mb-2 block font-semibold" style={{ color:'var(--text-muted)' }}>Jenis</label>
                  <div className="grid grid-cols-2 gap-2">
                    {GOLD_TYPES.map((t) => (
                      <button key={t.value} onClick={() => {
                        setForm({ ...form, goldType: t.value, source: t.value === 'digital' ? 'pegadaian' : 'antam' })
                      }}
                        className="py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                        style={{
                          background: form.goldType === t.value ? 'rgba(246,204,96,0.15)' : 'var(--surface-3)',
                          border: `1px solid ${form.goldType === t.value ? '#f6cc6060' : 'var(--border)'}`,
                          color: form.goldType === t.value ? '#f6cc60' : 'var(--text-muted)',
                        }}>
                        <span>{t.icon}</span><span className="font-medium text-sm">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Provider selector */}
                <div>
                  <label className="text-xs mb-2 block font-semibold" style={{ color:'var(--text-muted)' }}>Provider</label>
                  <div className="grid grid-cols-3 gap-2">
                    {availableProviders.map(([src, cfg]) => (
                      <button key={src} onClick={() => setForm({ ...form, source: src })}
                        className="py-2.5 rounded-xl text-center transition-all"
                        style={{
                          background: form.source === src ? `${cfg.color}18` : 'var(--surface-3)',
                          border: `1px solid ${form.source === src ? cfg.color + '55' : 'var(--border)'}`,
                          color: form.source === src ? cfg.color : 'var(--text-muted)',
                        }}>
                        <p className="text-lg">{cfg.icon}</p>
                        <p className="text-xs mt-0.5">{cfg.label}</p>
                        {prices?.[src] && (
                          <p className="text-[9px] mt-0.5 font-mono">{formatCurrency(prices[src].buyPrice)}</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gram input */}
                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color:'var(--text-muted)' }}>Jumlah Gram</label>
                  <input type="number" step="0.001" className="input-glass" placeholder="contoh: 5.5"
                    value={form.grams} onChange={(e) => setForm({ ...form, grams: e.target.value })}/>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs mb-1.5 block font-semibold" style={{ color:'var(--text-muted)' }}>Harga Beli/gr (opsional)</label>
                    <input type="number" className="input-glass" placeholder={prices?.[form.source] ? String(prices[form.source].buyPrice) : 'Rp'}
                      value={form.buyPrice} onChange={(e) => setForm({ ...form, buyPrice: e.target.value })}/>
                  </div>
                  <div>
                    <label className="text-xs mb-1.5 block font-semibold" style={{ color:'var(--text-muted)' }}>Tanggal Beli</label>
                    <input type="date" className="input-glass"
                      value={form.buyDate} onChange={(e) => setForm({ ...form, buyDate: e.target.value })}/>
                  </div>
                </div>

                {/* Preview */}
                {prices?.[form.source] && form.grams && (
                  <div className="p-3 rounded-xl" style={{ background:'rgba(246,204,96,0.08)', border:'1px solid rgba(246,204,96,0.20)' }}>
                    <div className="flex justify-between text-xs">
                      <span style={{ color:'var(--text-muted)' }}>Nilai sekarang</span>
                      <span className="font-bold font-mono" style={{ color:'#f6cc60' }}>
                        {formatCurrency(parseFloat(form.grams || '0') * prices[form.source].sellPrice)}
                      </span>
                    </div>
                    {form.buyPrice && (
                      <div className="flex justify-between text-xs mt-1">
                        <span style={{ color:'var(--text-muted)' }}>P&L estimasi</span>
                        <span className="font-semibold" style={{ color: parseFloat(form.grams||'0') * prices[form.source].sellPrice >= parseFloat(form.grams||'0') * parseFloat(form.buyPrice||'0') ? 'var(--accent)' : 'var(--red)' }}>
                          {formatCurrency(parseFloat(form.grams||'0') * (prices[form.source].sellPrice - parseFloat(form.buyPrice||'0')))}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <button onClick={handleAdd} disabled={saving} className="btn-primary w-full py-4"
                  style={{ background:'linear-gradient(135deg,#f6cc60,#d97706)' }}>
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
