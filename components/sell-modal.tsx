'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { calcStockSellProfit, calcGoldSellProfit } from '@/lib/investment-calculator'
import toast from 'react-hot-toast'

// ─── SAHAM SELL MODAL ─────────────────────────────────────────────────────────

interface SahamSellModalProps {
  holding: { id: string; symbol: string; lots: number; avgPrice: number }
  currentPrice: number
  onClose: () => void
  onSuccess: () => void
}

export function SahamSellModal({ holding, currentPrice, onClose, onSuccess }: SahamSellModalProps) {
  const [sellLots,  setSellLots ] = useState('')
  const [sellPrice, setSellPrice] = useState(String(currentPrice || ''))
  const [saving,    setSaving   ] = useState(false)

  const preview = useMemo(() => {
    const lots  = parseInt(sellLots  || '0')
    const price = parseFloat(sellPrice || '0')
    if (!lots || !price || lots > holding.lots) return null
    const { sharesSold, realizedProfit } = calcStockSellProfit(lots, price, holding.avgPrice)
    return { sharesSold, realizedProfit, totalProceeds: sharesSold * price }
  }, [sellLots, sellPrice, holding])

  const handleSell = async () => {
    const lots  = parseInt(sellLots)
    const price = parseFloat(sellPrice)
    if (!lots || lots <= 0)        { toast.error('Masukkan jumlah lot');         return }
    if (lots > holding.lots)       { toast.error('Lot melebihi kepemilikan');    return }
    if (!price || price <= 0)      { toast.error('Masukkan harga jual');         return }

    setSaving(true)
    try {
      const res  = await fetch('/api/portfolio/stocks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: holding.id, action: 'sell', sellLots: lots, sellPrice: price }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      const profit = json.realizedProfit
      if (json.deleted) {
        toast.success(`✓ ${holding.symbol} terjual semua. P&L: ${profit >= 0 ? '+' : ''}${formatCurrency(profit)}`)
      } else {
        toast.success(`✓ Jual ${lots} lot ${holding.symbol}. Realized P&L: ${profit >= 0 ? '+' : ''}${formatCurrency(profit)}`)
      }
      onSuccess()
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menjual saham')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalWrapper onClose={onClose} title={`Jual ${holding.symbol}`}>
      <div className="space-y-4">
        {/* Info baris */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Kepemilikan', value: `${holding.lots} lot (${holding.lots * 100} lembar)` },
            { label: 'Avg Beli',    value: formatCurrency(holding.avgPrice) },
          ].map((r) => (
            <div key={r.label} className="p-3 rounded-xl" style={{ background: 'var(--surface-3)' }}>
              <p className="text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>{r.label}</p>
              <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{r.value}</p>
            </div>
          ))}
        </div>

        <div>
          <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>
            Jumlah Lot Dijual <span style={{ color: 'var(--accent)' }}>*</span>
          </label>
          <input
            type="number" min="1" max={holding.lots} className="input-glass"
            placeholder={`Maks ${holding.lots} lot`}
            value={sellLots} onChange={(e) => setSellLots(e.target.value)}
          />
          {parseInt(sellLots || '0') > holding.lots && (
            <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--red)' }}>
              <AlertCircle size={11}/> Melebihi kepemilikan
            </p>
          )}
        </div>

        <div>
          <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>
            Harga Jual / Lembar <span style={{ color: 'var(--accent)' }}>*</span>
          </label>
          <input
            type="number" className="input-glass" placeholder="Rp"
            value={sellPrice} onChange={(e) => setSellPrice(e.target.value)}
          />
        </div>

        {/* Preview */}
        {preview && (
          <div className="p-3.5 rounded-xl space-y-2"
            style={{ background: preview.realizedProfit >= 0 ? 'rgba(52,211,110,0.08)' : 'rgba(252,129,129,0.08)',
                     border: `1px solid ${preview.realizedProfit >= 0 ? 'rgba(52,211,110,0.2)' : 'rgba(252,129,129,0.2)'}` }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Preview Penjualan</p>
            <PreviewRow label="Lembar terjual"    value={`${formatNumber(preview.sharesSold)} lembar`} />
            <PreviewRow label="Total Hasil Jual"  value={formatCurrency(preview.totalProceeds)} />
            <div className="h-px" style={{ background: 'var(--border)' }} />
            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Realized P&L</p>
              <div className="flex items-center gap-1.5">
                {preview.realizedProfit >= 0
                  ? <TrendingUp size={12} color="var(--accent)"/>
                  : <TrendingDown size={12} color="var(--red)"/>}
                <p className="text-sm font-bold"
                  style={{ color: preview.realizedProfit >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                  {preview.realizedProfit >= 0 ? '+' : ''}{formatCurrency(preview.realizedProfit)}
                </p>
              </div>
            </div>
          </div>
        )}

        <SellButton saving={saving} onSell={handleSell} />
      </div>
    </ModalWrapper>
  )
}

// ─── EMAS SELL MODAL ──────────────────────────────────────────────────────────

interface EmasSellModalProps {
  holding: { id: string; source: string; grams: number; buyPrice?: number }
  currentSellPrice: number
  sourceLabel: string
  onClose: () => void
  onSuccess: () => void
}

export function EmasSellModal({ holding, currentSellPrice, sourceLabel, onClose, onSuccess }: EmasSellModalProps) {
  const [sellGrams, setSellGrams] = useState('')
  const [sellPrice, setSellPrice] = useState(String(currentSellPrice || ''))
  const [saving,    setSaving   ] = useState(false)

  const preview = useMemo(() => {
    const grams = parseFloat(sellGrams || '0')
    const price = parseFloat(sellPrice || '0')
    if (!grams || !price || grams > holding.grams) return null
    const { realizedProfit } = calcGoldSellProfit(grams, price, holding.buyPrice || 0)
    const totalProceeds = grams * price
    return { realizedProfit, totalProceeds }
  }, [sellGrams, sellPrice, holding])

  const handleSell = async () => {
    const grams = parseFloat(sellGrams)
    const price = parseFloat(sellPrice)
    if (!grams || grams <= 0)      { toast.error('Masukkan jumlah gram');      return }
    if (grams > holding.grams)     { toast.error('Gram melebihi kepemilikan'); return }
    if (!price || price <= 0)      { toast.error('Masukkan harga jual');       return }

    setSaving(true)
    try {
      const res  = await fetch('/api/portfolio/gold', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: holding.id, action: 'sell', sellGrams: grams, sellPrice: price }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      const profit = json.realizedProfit
      if (json.deleted) {
        toast.success(`✓ Emas ${sourceLabel} terjual semua. P&L: ${profit >= 0 ? '+' : ''}${formatCurrency(profit)}`)
      } else {
        toast.success(`✓ Jual ${grams}gr ${sourceLabel}. Realized P&L: ${profit >= 0 ? '+' : ''}${formatCurrency(profit)}`)
      }
      onSuccess()
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menjual emas')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalWrapper onClose={onClose} title={`Jual Emas ${sourceLabel}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Kepemilikan', value: `${formatNumber(holding.grams, 3)} gr` },
            { label: 'Harga Beli',  value: holding.buyPrice ? formatCurrency(holding.buyPrice) + '/gr' : '—' },
          ].map((r) => (
            <div key={r.label} className="p-3 rounded-xl" style={{ background: 'var(--surface-3)' }}>
              <p className="text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>{r.label}</p>
              <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{r.value}</p>
            </div>
          ))}
        </div>

        <div>
          <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>
            Gram Dijual <span style={{ color: 'var(--accent)' }}>*</span>
          </label>
          <input
            type="number" step="0.001" min="0.001" className="input-glass"
            placeholder={`Maks ${formatNumber(holding.grams, 3)} gr`}
            value={sellGrams} onChange={(e) => setSellGrams(e.target.value)}
          />
          {parseFloat(sellGrams || '0') > holding.grams && (
            <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--red)' }}>
              <AlertCircle size={11}/> Melebihi kepemilikan
            </p>
          )}
        </div>

        <div>
          <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>
            Harga Jual / Gram <span style={{ color: 'var(--accent)' }}>*</span>
          </label>
          <input
            type="number" className="input-glass" placeholder="Rp"
            value={sellPrice} onChange={(e) => setSellPrice(e.target.value)}
          />
        </div>

        {preview && (
          <div className="p-3.5 rounded-xl space-y-2"
            style={{ background: preview.realizedProfit >= 0 ? 'rgba(52,211,110,0.08)' : 'rgba(252,129,129,0.08)',
                     border: `1px solid ${preview.realizedProfit >= 0 ? 'rgba(52,211,110,0.2)' : 'rgba(252,129,129,0.2)'}` }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Preview Penjualan</p>
            <PreviewRow label="Total Hasil Jual" value={formatCurrency(preview.totalProceeds)} />
            <div className="h-px" style={{ background: 'var(--border)' }} />
            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Realized P&L</p>
              <div className="flex items-center gap-1.5">
                {preview.realizedProfit >= 0
                  ? <TrendingUp size={12} color="var(--accent)"/>
                  : <TrendingDown size={12} color="var(--red)"/>}
                <p className="text-sm font-bold"
                  style={{ color: preview.realizedProfit >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                  {preview.realizedProfit >= 0 ? '+' : ''}{formatCurrency(preview.realizedProfit)}
                </p>
              </div>
            </div>
          </div>
        )}

        <SellButton saving={saving} onSell={handleSell} />
      </div>
    </ModalWrapper>
  )
}

// ─── SHARED SUB-COMPONENTS ────────────────────────────────────────────────────

function ModalWrapper({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          onClick={onClose} />
        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          className="relative w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', maxHeight: '90dvh', overflowY: 'auto' }}
          onClick={(e) => e.stopPropagation()}>
          <div className="drag-indicator mt-3 sm:hidden" />
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{title}</h2>
            <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)' }}>
              <X size={18} />
            </button>
          </div>
          <div className="px-5 pb-7">{children}</div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-xs font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  )
}

function SellButton({ saving, onSell }: { saving: boolean; onSell: () => void }) {
  return (
    <button onClick={onSell} disabled={saving} className="btn-primary w-full py-3.5"
      style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }}>
      {saving
        ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
        : '💸 Konfirmasi Jual'
      }
    </button>
  )
}
