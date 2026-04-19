'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useApiList } from '@/hooks/useApiData'
import { useGoldPrices, useStockPrices } from '@/hooks/usePrices'
import { formatCurrency, formatNumber, formatPercent, parseLotValue, calcProfitLoss, enrichDeposit } from '@/lib/utils'
import type { GoldHolding, StockHolding, Deposit } from '@/types'
import { ArrowRight, RefreshCw } from 'lucide-react'

export default function PortfolioPage() {
  const { data: goldHoldings } = useApiList<GoldHolding>('/api/portfolio/gold',          { refreshMs: 30000 })
  const { data: stocks }       = useApiList<StockHolding>('/api/portfolio/stocks',        { refreshMs: 30000 })
  const { data: deposits }     = useApiList<Deposit>('/api/portfolio/deposits?status=all',{ refreshMs: 30000 })

  const { prices: goldPrices, lastUpdated, refetch } = useGoldPrices()
  const symbols = useMemo(() => stocks.map((s) => s.symbol), [stocks])
  const { prices: stockPrices } = useStockPrices(symbols)

  const goldSummary = useMemo(() => ({
    totalGrams: goldHoldings.reduce((s, h) => s + h.grams, 0),
    totalValue: goldHoldings.reduce((s, h) => s + h.grams * (goldPrices?.[h.source]?.sellPrice || 0), 0),
  }), [goldHoldings, goldPrices])

  const stockSummary = useMemo(() => {
    let totalValue = 0, totalCost = 0
    stocks.forEach((s) => {
      totalValue += parseLotValue(s.lots, stockPrices[s.symbol]?.currentPrice || 0)
      totalCost  += parseLotValue(s.lots, s.avgPrice)
    })
    const { profitLoss, profitLossPercent } = calcProfitLoss(totalValue, totalCost)
    return { totalValue, totalCost, profitLoss, profitLossPercent }
  }, [stocks, stockPrices])

  const depositSummary = useMemo(() => {
    const active = deposits.filter((d) => d.status === 'active')
    return {
      totalNominal:    active.reduce((s, d) => s + d.nominal,    0),
      totalFinalValue: active.reduce((s, d) => s + d.finalValue, 0),
      count: active.length,
    }
  }, [deposits])

  const totalPortfolio = goldSummary.totalValue + stockSummary.totalValue + depositSummary.totalNominal

  const sections = [
    {
      href: '/portfolio/emas',  icon: '🥇', title: 'Emas',     color: '#fbbf24',
      subtitle: `${formatNumber(goldSummary.totalGrams, 3)} gram`,
      value:    goldSummary.totalValue,
      meta:     goldPrices?.antam ? `Antam: ${formatCurrency(goldPrices.antam.sellPrice)}/gr` : 'Memuat...',
      pct:      totalPortfolio > 0 ? (goldSummary.totalValue  / totalPortfolio) * 100 : 0,
    },
    {
      href: '/portfolio/saham',    icon: '📈', title: 'Saham',    color: '#60a5fa',
      subtitle: `${stocks.length} emiten`,
      value:    stockSummary.totalValue,
      meta:     stockSummary.totalCost > 0 ? `${formatPercent(stockSummary.profitLossPercent)} (${formatCurrency(stockSummary.profitLoss)})` : 'Belum ada saham',
      metaColor: stockSummary.profitLoss >= 0 ? 'var(--accent)' : 'var(--red)',
      pct:      totalPortfolio > 0 ? (stockSummary.totalValue / totalPortfolio) * 100 : 0,
    },
    {
      href: '/portfolio/deposito', icon: '🏦', title: 'Deposito', color: '#c084fc',
      subtitle: `${depositSummary.count} aktif`,
      value:    depositSummary.totalNominal,
      meta:     depositSummary.totalFinalValue > 0 ? `Nilai akhir: ${formatCurrency(depositSummary.totalFinalValue)}` : 'Belum ada deposito',
      pct:      totalPortfolio > 0 ? (depositSummary.totalNominal / totalPortfolio) * 100 : 0,
    },
  ]

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>Portofolio</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total aset investasi Anda</p>
        </div>
        <button onClick={refetch} className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          <RefreshCw size={15}/>
        </button>
      </div>

      {/* Hero */}
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-6 mb-5" style={{ borderColor: 'rgba(251,191,36,0.2)' }}>
        <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Total Portofolio</p>
        <p className="text-3xl font-display font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          {formatCurrency(totalPortfolio)}
        </p>
        {totalPortfolio > 0 && (
          <>
            <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-2">
              {sections.map((s) => s.pct > 0 && (
                <div key={s.title} className="rounded-full transition-all duration-700"
                  style={{ width: `${s.pct}%`, background: s.color, minWidth: 4 }} />
              ))}
            </div>
            <div className="flex gap-4">
              {sections.map((s) => (
                <div key={s.title} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {s.title} {s.pct.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
        {lastUpdated && (
          <p className="text-[10px] mt-3" style={{ color: 'var(--text-muted)' }}>
            Harga emas: {lastUpdated.toLocaleTimeString('id-ID')}
          </p>
        )}
      </motion.div>

      {/* Cards */}
      <div className="space-y-3">
        {sections.map((s, i) => (
          <motion.div key={s.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}>
            <Link href={s.href}>
              <div className="glass-card p-4 flex items-center gap-4 active:scale-[0.99] transition-transform">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: `${s.color}18` }}>{s.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="font-display font-semibold" style={{ color: 'var(--text-primary)' }}>{s.title}</p>
                    <p className="font-bold font-mono" style={{ color: s.color }}>{formatCurrency(s.value)}</p>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.subtitle}</p>
                    <p className="text-xs font-medium" style={{ color: (s as {metaColor?: string}).metaColor || 'var(--text-muted)' }}>{s.meta}</p>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${s.pct}%`, background: s.color }} />
                  </div>
                </div>
                <ArrowRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }}/>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
