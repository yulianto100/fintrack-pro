'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useFirebaseList } from '@/hooks/useFirebaseRealtime'
import { useGoldPrices, useStockPrices } from '@/hooks/usePrices'
import { formatCurrency, formatNumber, formatPercent, parseLotValue, calcProfitLoss, enrichDeposit } from '@/lib/utils'
import type { GoldHolding, StockHolding, Deposit } from '@/types'
import { ArrowRight, RefreshCw } from 'lucide-react'

export default function PortfolioPage() {
  const { data: goldHoldings } = useFirebaseList<GoldHolding>('portfolio/gold')
  const { data: stocks } = useFirebaseList<StockHolding>('portfolio/stocks')
  const { data: deposits } = useFirebaseList<Deposit>('portfolio/deposits')
  const { prices: goldPrices, lastUpdated, refetch } = useGoldPrices()

  const symbols = useMemo(() => (stocks || []).map((s) => s.symbol), [stocks])
  const { prices: stockPrices } = useStockPrices(symbols)

  // Gold summary
  const goldSummary = useMemo(() => {
    if (!goldHoldings || !goldPrices) return { totalGrams: 0, totalValue: 0 }
    const totalGrams = goldHoldings.reduce((s, h) => s + h.grams, 0)
    const totalValue = goldHoldings.reduce((s, h) => {
      const price = goldPrices[h.source]?.sellPrice || 0
      return s + h.grams * price
    }, 0)
    return { totalGrams, totalValue }
  }, [goldHoldings, goldPrices])

  // Stocks summary
  const stockSummary = useMemo(() => {
    if (!stocks) return { totalValue: 0, totalCost: 0, profitLoss: 0, profitLossPct: 0 }
    let totalValue = 0, totalCost = 0
    stocks.forEach((s) => {
      const price = stockPrices[s.symbol]?.currentPrice || 0
      totalValue += parseLotValue(s.lots, price)
      totalCost += parseLotValue(s.lots, s.avgPrice)
    })
    const { profitLoss, profitLossPercent } = calcProfitLoss(totalValue, totalCost)
    return { totalValue, totalCost, profitLoss, profitLossPercent }
  }, [stocks, stockPrices])

  // Deposits summary
  const depositSummary = useMemo(() => {
    if (!deposits) return { totalNominal: 0, totalFinalValue: 0, count: 0 }
    const active = deposits.filter((d) => d.status === 'active')
    return {
      totalNominal: active.reduce((s, d) => s + d.nominal, 0),
      totalFinalValue: active.reduce((s, d) => s + d.finalValue, 0),
      count: active.length,
    }
  }, [deposits])

  const totalPortfolio = goldSummary.totalValue + stockSummary.totalValue + depositSummary.totalNominal

  const sections = [
    {
      href: '/portfolio/emas',
      icon: '🥇',
      title: 'Emas',
      subtitle: `${formatNumber(goldSummary.totalGrams, 3)} gram`,
      value: goldSummary.totalValue,
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.1)',
      meta: goldPrices?.antam
        ? `Antam: ${formatCurrency(goldPrices.antam.sellPrice)}/gr`
        : 'Memuat harga...',
      pct: totalPortfolio > 0 ? (goldSummary.totalValue / totalPortfolio) * 100 : 0,
    },
    {
      href: '/portfolio/saham',
      icon: '📈',
      title: 'Saham',
      subtitle: `${(stocks || []).length} emiten`,
      value: stockSummary.totalValue,
      color: '#3b82f6',
      bg: 'rgba(59,130,246,0.1)',
      meta: stockSummary.totalCost > 0
        ? `${formatPercent(stockSummary.profitLossPercent)} (${formatCurrency(stockSummary.profitLoss)})`
        : 'Belum ada saham',
      metaColor: stockSummary.profitLoss >= 0 ? 'var(--accent)' : 'var(--red)',
      pct: totalPortfolio > 0 ? (stockSummary.totalValue / totalPortfolio) * 100 : 0,
    },
    {
      href: '/portfolio/deposito',
      icon: '🏦',
      title: 'Deposito',
      subtitle: `${depositSummary.count} aktif`,
      value: depositSummary.totalNominal,
      color: '#a855f7',
      bg: 'rgba(168,85,247,0.1)',
      meta: depositSummary.totalFinalValue > 0
        ? `Nilai akhir: ${formatCurrency(depositSummary.totalFinalValue)}`
        : 'Belum ada deposito',
      pct: totalPortfolio > 0 ? (depositSummary.totalNominal / totalPortfolio) * 100 : 0,
    },
  ]

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>
            Portofolio
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Total aset investasi Anda
          </p>
        </div>
        <button
          onClick={refetch}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Total portfolio hero */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="glass-card p-6 mb-6 relative overflow-hidden"
        style={{ borderColor: 'rgba(245,158,11,0.2)' }}
      >
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl"
          style={{ background: 'rgba(245,158,11,0.08)' }} />
        <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Total Portofolio</p>
        <p className="text-3xl font-display font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          {formatCurrency(totalPortfolio)}
        </p>

        {/* Allocation bar */}
        {totalPortfolio > 0 && (
          <div>
            <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-2">
              {sections.map((s) => (
                s.pct > 0 && (
                  <div
                    key={s.title}
                    className="rounded-full transition-all duration-700"
                    style={{ width: `${s.pct}%`, background: s.color, minWidth: 4 }}
                  />
                )
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
          </div>
        )}

        {lastUpdated && (
          <p className="text-[10px] mt-3" style={{ color: 'var(--text-muted)' }}>
            Update: {lastUpdated.toLocaleTimeString('id-ID')}
          </p>
        )}
      </motion.div>

      {/* Portfolio sections */}
      <div className="space-y-3">
        {sections.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
          >
            <Link href={s.href}>
              <div
                className="glass-card p-4 flex items-center gap-4 transition-all duration-200 active:scale-[0.99]"
                style={{ cursor: 'pointer' }}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: s.bg }}>
                  {s.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-display font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {s.title}
                    </p>
                    <p className="text-base font-bold font-mono" style={{ color: s.color }}>
                      {formatCurrency(s.value)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.subtitle}</p>
                    <p className="text-xs font-medium" style={{ color: s.metaColor || 'var(--text-muted)' }}>
                      {s.meta}
                    </p>
                  </div>
                  {/* Allocation bar */}
                  <div className="progress-bar mt-2">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${s.pct}%`, background: s.color }}
                    />
                  </div>
                </div>
                <ArrowRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
