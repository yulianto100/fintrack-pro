'use client'

import { useMemo, useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useApiList } from '@/hooks/useApiData'
import { useGoldPrices, useStockPrices } from '@/hooks/usePrices'
import { formatCurrency, formatNumber, formatPercent, parseLotValue, calcProfitLoss } from '@/lib/utils'
import { useBalanceVisibility } from '@/hooks/useBalanceVisibility'
import type { GoldHolding, StockHolding, Deposit, WalletAccount, SBNHolding, ReksadanaHolding, Goal } from '@/types'
import { ArrowRight, RefreshCw, Wifi, WifiOff, Landmark, Wallet, X,
         TrendingUp, TrendingDown, Lightbulb, AlertTriangle, CheckCircle2,
         PlusCircle, Target } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { InvestasiModal } from '@/components/investment/InvestasiModal'

// ─────────────────────────────────────────────────────────────────────────────
// 1. INSIGHT LOGIC
// ─────────────────────────────────────────────────────────────────────────────

type InsightType = 'success' | 'warning' | 'info'

interface Insight {
  id:      string
  type:    InsightType
  icon:    string
  message: string
  sub?:    string
}

interface PortfolioSummaries {
  gold:      { pct: number; value: number }
  stock:     { pct: number; pnlPct: number; value: number }
  deposito:  { pct: number; value: number }
  sbn:       { pct: number; value: number }
  reksadana: { pct: number; pnl: number; value: number }
  total:     number
}

function generatePortfolioInsights(data: PortfolioSummaries): Insight[] {
  const insights: Insight[] = []

  if (data.total === 0) return []

  // Dominance warning
  const dominantEntry = [
    { name: 'Emas',     pct: data.gold.pct     },
    { name: 'Saham',    pct: data.stock.pct    },
    { name: 'Deposito', pct: data.deposito.pct },
    { name: 'SBN',      pct: data.sbn.pct      },
    { name: 'Reksadana',pct: data.reksadana.pct},
  ].find(e => e.pct > 50)

  if (dominantEntry) {
    insights.push({
      id:      'dominant',
      type:    'warning',
      icon:    '⚠️',
      message: `${dominantEntry.name} mendominasi ${dominantEntry.pct.toFixed(0)}% portofolio`,
      sub:     'Pertimbangkan diversifikasi ke aset lain untuk mengurangi risiko',
    })
  }

  // Reksadana too small
  if (data.reksadana.pct < 5 && data.total > 10_000_000) {
    insights.push({
      id:      'reksadana-small',
      type:    'info',
      icon:    '💡',
      message: 'Reksadana masih kecil (<5%)',
      sub:     'Bisa ditingkatkan untuk diversifikasi dengan risiko moderat',
    })
  }

  // Deposito too large
  if (data.deposito.pct > 35) {
    insights.push({
      id:      'deposito-large',
      type:    'warning',
      icon:    '⚠️',
      message: `Deposito terlalu besar (${data.deposito.pct.toFixed(0)}%)`,
      sub:     'Return bisa kurang optimal dibanding instrumen lain',
    })
  }

  // Stock outperforming
  if (data.stock.pct > 0 && data.stock.pnlPct >= 10) {
    insights.push({
      id:      'stock-up',
      type:    'success',
      icon:    '📈',
      message: `Saham kamu outperform +${data.stock.pnlPct.toFixed(1)}%`,
      sub:     'Performa saham sedang bagus — pertahankan strategi',
    })
  }

  // Stock underperforming
  if (data.stock.pct > 0 && data.stock.pnlPct < -5) {
    insights.push({
      id:      'stock-down',
      type:    'warning',
      icon:    '📉',
      message: `Saham turun ${data.stock.pnlPct.toFixed(1)}%`,
      sub:     'Evaluasi ulang posisi saham yang merugi',
    })
  }

  // Good diversification
  const activeTypes = [data.gold, data.stock, data.deposito, data.sbn, data.reksadana]
    .filter(a => a.pct > 3).length
  if (activeTypes >= 4 && !dominantEntry) {
    insights.push({
      id:      'diverse',
      type:    'success',
      icon:    '✅',
      message: 'Diversifikasi portofolio kamu sudah baik',
      sub:     `${activeTypes} jenis aset aktif — risiko tersebar dengan baik`,
    })
  }

  // Smart suggestion: shift deposito → saham
  if (data.deposito.pct > 30 && data.stock.pct < 20 && data.total > 50_000_000) {
    insights.push({
      id:      'suggest-rebalance',
      type:    'info',
      icon:    '🧠',
      message: 'Pertimbangkan rebalancing',
      sub:     'Memindahkan 10% dari Deposito ke Saham bisa meningkatkan potensi return ~2% per tahun',
    })
  }

  return insights
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. INSIGHT CARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function InsightCard({ insight, onDismiss }: { insight: Insight; onDismiss: (id: string) => void }) {
  const colors: Record<InsightType, { bg: string; border: string; badge: string; text: string }> = {
    success: { bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.20)',  badge: 'rgba(34,197,94,0.15)',  text: 'var(--accent)' },
    warning: { bg: 'rgba(239,68,68,0.07)',  border: 'rgba(239,68,68,0.18)',  badge: 'rgba(239,68,68,0.14)',  text: 'var(--red)'    },
    info:    { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.18)', badge: 'rgba(59,130,246,0.14)', text: '#60a5fa'       },
  }
  const c = colors[insight.type]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-start gap-3 p-3.5 rounded-2xl"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}
    >
      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
        style={{ background: c.badge }}>
        {insight.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
          {insight.message}
        </p>
        {insight.sub && (
          <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {insight.sub}
          </p>
        )}
      </div>
      <button onClick={() => onDismiss(insight.id)}
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 hover:opacity-70 transition-opacity"
        style={{ color: 'var(--text-muted)' }}>
        <X size={12} />
      </button>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PERFORMANCE SUMMARY COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface PerfProps {
  totalPnL:     number
  totalPnLPct:  number
  hidden:       boolean
}

function PerformanceSummary({ totalPnL, totalPnLPct, hidden }: PerfProps) {
  if (totalPnL === 0) return null
  const isUp = totalPnL >= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="flex items-center gap-2 px-1 mb-2"
    >
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
        style={{
          background: isUp ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
          color:      isUp ? 'var(--accent)'        : 'var(--red)',
          border:     `1px solid ${isUp ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
        }}>
        {isUp
          ? <TrendingUp  size={11} strokeWidth={2.5} />
          : <TrendingDown size={11} strokeWidth={2.5} />
        }
        {hidden ? '••••' : `${isUp ? '+' : ''}${formatCurrency(Math.abs(totalPnL))}`}
        <span className="opacity-70">
          ({isUp ? '+' : ''}{totalPnLPct.toFixed(1)}%)
        </span>
      </div>
      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>total unrealized P&L</span>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ALLOCATION HEALTH COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function AllocationHealth({ sections }: { sections: { title: string; pct: number }[] }) {
  const dominant = sections.find(s => s.pct > 50)
  const isHealthy = !dominant

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="flex items-center gap-2 mt-3 pt-3"
      style={{ borderTop: '1px solid var(--border)' }}
    >
      {isHealthy
        ? <CheckCircle2 size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        : <AlertTriangle size={14} style={{ color: 'var(--red)', flexShrink: 0 }} />
      }
      <p className="text-xs font-semibold"
        style={{ color: isHealthy ? 'var(--accent)' : 'var(--red)' }}>
        {isHealthy
          ? 'Diversifikasi: Baik'
          : `⚠️ Terlalu berat di ${dominant!.title} (${dominant!.pct.toFixed(0)}%)`
        }
      </p>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. COUNT-UP NUMBER COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function CountUpNumber({ value, hidden, hiddenText = '••••••', formatter = formatCurrency }:
  { value: number; hidden: boolean; hiddenText?: string; formatter?: (v: number) => string }) {
  const [display, setDisplay] = useState(0)
  const rafRef    = useRef<number>()
  const startRef  = useRef<number>()
  const fromRef   = useRef(0)
  const hasRun    = useRef(false)

  useEffect(() => {
    if (value === 0 || hasRun.current) return
    hasRun.current = true

    const duration = 900 // ms
    const from     = 0
    const to       = value
    fromRef.current = from

    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts
      const elapsed = ts - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (to - from) * eased))
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value])

  if (hidden) return <span>{hiddenText}</span>
  return <span>{formatter(display)}</span>
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. GOAL PROGRESS BADGE
// ─────────────────────────────────────────────────────────────────────────────

function GoalProgressBadge({ goal, currentValue }: { goal: Goal; currentValue: number }) {
  const pct = Math.min((currentValue / goal.targetAmount) * 100, 100)
  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <Target size={10} style={{ color: goal.color || 'var(--accent)', flexShrink: 0 }} />
        <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
          Target: {formatCurrency(goal.targetAmount)}
        </p>
      </div>
      <p className="text-[10px] font-bold flex-shrink-0"
        style={{ color: goal.color || 'var(--accent)' }}>
        {pct.toFixed(0)}%
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. MAIN PORTFOLIO CONTENT
// ─────────────────────────────────────────────────────────────────────────────

function PortfolioContent() {
  const searchParams = useSearchParams()
  const filterType   = searchParams.get('type')
  const { hidden }   = useBalanceVisibility()
  const HIDDEN_TEXT  = '••••••'

  // ── Existing data fetching (UNCHANGED) ──────────────────────────────────
  const { data: goldHoldings }  = useApiList<GoldHolding>('/api/portfolio/gold',           { refreshMs: 30000 })
  const { data: stocks }        = useApiList<StockHolding>('/api/portfolio/stocks',         { refreshMs: 30000 })
  const { data: deposits }      = useApiList<Deposit>('/api/portfolio/deposits?status=all', { refreshMs: 30000 })
  const { data: sbnList }       = useApiList<SBNHolding>('/api/portfolio/sbn',              { refreshMs: 60000 })
  const { data: reksadanaList } = useApiList<ReksadanaHolding>('/api/portfolio/reksadana', { refreshMs: 60000 })

  const [walletAccounts, setWalletAccounts] = useState<WalletAccount[]>([])

  const { prices: goldPrices, lastUpdated, isLive, refetch } = useGoldPrices()
  const symbols = useMemo(() => stocks.map((s) => s.symbol), [stocks])
  const { prices: stockPrices } = useStockPrices(symbols)

  useEffect(() => {
    fetch('/api/wallet-accounts').then((r) => r.json()).then((j) => {
      if (j.success) setWalletAccounts(j.data || [])
    })
  }, [])

  // ── New: Goals & wallet balances ─────────────────────────────────────────
  const [goals, setGoals] = useState<Goal[]>([])
  const [walletBalances, setWalletBalances] = useState({ cash: 0, bank: 0, ewallet: 0 })
  const [investOpen, setInvestOpen] = useState(false)
  const [dismissedInsights, setDismissedInsights] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/goals').then(r => r.json()).then(j => {
      if (j.success) setGoals(j.data || [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/wallet-balances').then(r => r.json()).then(j => {
      if (j.data || j.cash !== undefined) {
        const d = j.data || j
        setWalletBalances({ cash: d.cash || 0, bank: d.bank || 0, ewallet: d.ewallet || 0 })
      }
    }).catch(() => {})
  }, [])

  const handleInvestSuccess = useCallback(() => {
    refetch()
    setInvestOpen(false)
  }, [refetch])

  // ── Existing summaries (UNCHANGED) ──────────────────────────────────────
  const bankAccounts    = walletAccounts.filter((a) => a.type === 'bank')
  const ewalletAccounts = walletAccounts.filter((a) => a.type === 'ewallet')

  const goldSummary = useMemo(() => ({
    totalGrams: goldHoldings.reduce((s, h) => s + h.grams, 0),
    totalValue: goldHoldings.reduce((s, h) => s + h.grams * (goldPrices?.[h.source]?.sellPrice || 0), 0),
    totalCost:  goldHoldings.reduce((s, h) => s + h.grams * (h.buyPrice || 0), 0),
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
      totalNominal:    active.reduce((s, d) => s + d.nominal, 0),
      totalFinalValue: active.reduce((s, d) => s + d.finalValue, 0),
      count: active.length,
    }
  }, [deposits])

  const sbnSummary = useMemo(() => {
    const active = sbnList.filter((h) => h.status === 'active')
    return {
      totalNominal:   active.reduce((s, h) => s + (h.nominal || 0), 0),
      totalNetReturn: active.reduce((s, h) => s + (h.netReturn || 0), 0),
      count: active.length,
    }
  }, [sbnList])

  const reksadanaSummary = useMemo(() => {
    let totalValue = 0, totalCost = 0
    reksadanaList.forEach((h) => {
      totalValue += (h.unit || 0) * (h.currentNAV || 0)
      totalCost  += (h.unit || 0) * (h.buyNAV || 0)
    })
    return { totalValue, totalCost, pnl: totalValue - totalCost, count: reksadanaList.length }
  }, [reksadanaList])

  const totalPortfolio = goldSummary.totalValue + stockSummary.totalValue +
    depositSummary.totalNominal + sbnSummary.totalNominal + reksadanaSummary.totalValue

  // ── New: P&L aggregation ────────────────────────────────────────────────
  const totalPnL = useMemo(() => {
    const goldPnL    = goldSummary.totalValue - goldSummary.totalCost
    const stockPnL   = stockSummary.profitLoss
    const depositPnL = depositSummary.totalFinalValue - depositSummary.totalNominal
    const sbnPnL     = sbnSummary.totalNetReturn
    const rdPnL      = reksadanaSummary.pnl
    return goldPnL + stockPnL + depositPnL + sbnPnL + rdPnL
  }, [goldSummary, stockSummary, depositSummary, sbnSummary, reksadanaSummary])

  const totalCost = useMemo(() =>
    goldSummary.totalCost + stockSummary.totalCost + depositSummary.totalNominal +
    sbnSummary.totalNominal + reksadanaSummary.totalCost,
  [goldSummary, stockSummary, depositSummary, sbnSummary, reksadanaSummary])

  const totalPnLPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0

  // ── New: Wallet total ───────────────────────────────────────────────────
  const totalWalletBalance = useMemo(() => {
    const bankTotal    = bankAccounts.reduce((s, a) => s + (a.balance || 0), 0)
    const ewalletTotal = ewalletAccounts.reduce((s, a) => s + (a.balance || 0), 0)
    const cashTotal    = walletBalances.cash
    return bankTotal + ewalletTotal + cashTotal
  }, [bankAccounts, ewalletAccounts, walletBalances])

  // ── Existing investmentSections (UNCHANGED) ─────────────────────────────
  const investmentSections = [
    { href: '/portfolio/emas',     icon: '🥇', title: 'Emas',      color: '#f6cc60',
      subtitle: `${formatNumber(goldSummary.totalGrams, 3)} gram`,  value: goldSummary.totalValue,
      meta: goldPrices?.antam ? `Antam: ${formatCurrency(goldPrices.antam.sellPrice)}/gr` : 'Memuat...',
      pct: totalPortfolio > 0 ? (goldSummary.totalValue / totalPortfolio) * 100 : 0,
      pnl: goldSummary.totalValue - goldSummary.totalCost },
    { href: '/portfolio/saham',    icon: '📈', title: 'Saham',     color: '#63b3ed',
      subtitle: `${stocks.length} emiten`, value: stockSummary.totalValue,
      meta: stockSummary.totalCost > 0 ? `${formatPercent(stockSummary.profitLossPercent)} P&L` : 'Belum ada saham',
      metaColor: stockSummary.profitLoss >= 0 ? 'var(--accent)' : 'var(--red)',
      pct: totalPortfolio > 0 ? (stockSummary.totalValue / totalPortfolio) * 100 : 0,
      pnl: stockSummary.profitLoss },
    { href: '/portfolio/deposito', icon: '🏦', title: 'Deposito',  color: '#d6aaff',
      subtitle: `${depositSummary.count} aktif`, value: depositSummary.totalNominal,
      meta: depositSummary.totalFinalValue > 0 ? `Nilai akhir: ${formatCurrency(depositSummary.totalFinalValue)}` : 'Belum ada deposito',
      pct: totalPortfolio > 0 ? (depositSummary.totalNominal / totalPortfolio) * 100 : 0,
      pnl: depositSummary.totalFinalValue - depositSummary.totalNominal },
    { href: '/portfolio/sbn',       icon: '🏛️', title: 'SBN',       color: '#c084fc',
      subtitle: `${sbnSummary.count} aktif`, value: sbnSummary.totalNominal,
      meta: sbnSummary.totalNetReturn > 0 ? `Bunga bersih: +${formatCurrency(sbnSummary.totalNetReturn)}` : 'Belum ada SBN',
      pct: totalPortfolio > 0 ? (sbnSummary.totalNominal / totalPortfolio) * 100 : 0,
      pnl: sbnSummary.totalNetReturn },
    { href: '/portfolio/reksadana', icon: '📦', title: 'Reksadana', color: '#38bdf8',
      subtitle: `${reksadanaSummary.count} produk`, value: reksadanaSummary.totalValue,
      meta: reksadanaSummary.totalCost > 0 ? `${reksadanaSummary.pnl >= 0 ? '+' : ''}${formatCurrency(reksadanaSummary.pnl)} P&L` : 'Belum ada reksadana',
      metaColor: reksadanaSummary.pnl >= 0 ? 'var(--accent)' : 'var(--red)',
      pct: totalPortfolio > 0 ? (reksadanaSummary.totalValue / totalPortfolio) * 100 : 0,
      pnl: reksadanaSummary.pnl },
  ]

  const pieData = investmentSections.filter((s) => s.pct > 0)
    .map((s) => ({ name: s.title, value: s.pct, amount: s.value, color: s.color }))

  // ── New: Insights ───────────────────────────────────────────────────────
  const allInsights = useMemo(() => generatePortfolioInsights({
    gold:      { pct: investmentSections[0].pct, value: goldSummary.totalValue },
    stock:     { pct: investmentSections[1].pct, pnlPct: stockSummary.profitLossPercent, value: stockSummary.totalValue },
    deposito:  { pct: investmentSections[2].pct, value: depositSummary.totalNominal },
    sbn:       { pct: investmentSections[3].pct, value: sbnSummary.totalNominal },
    reksadana: { pct: investmentSections[4].pct, pnl: reksadanaSummary.pnl, value: reksadanaSummary.totalValue },
    total:     totalPortfolio,
  }), [investmentSections, goldSummary, stockSummary, depositSummary, sbnSummary, reksadanaSummary, totalPortfolio])

  const visibleInsights = allInsights.filter(i => !dismissedInsights.includes(i.id))

  // ── Goals matched to asset type ──────────────────────────────────────────
  const goalsByAsset = useMemo(() => {
    const map: Record<string, Goal> = {}
    for (const g of goals) {
      const title = g.title?.toLowerCase() || ''
      if (title.includes('emas') || title.includes('gold'))           map['Emas']     = g
      if (title.includes('saham') || title.includes('stock'))        map['Saham']    = g
      if (title.includes('deposito'))                                map['Deposito'] = g
      if (title.includes('sbn') || title.includes('obligasi'))       map['SBN']      = g
      if (title.includes('reksadana') || title.includes('reksa'))    map['Reksadana']= g
    }
    return map
  }, [goals])

  // ── Tooltip (UNCHANGED) ─────────────────────────────────────────────────
  function CustomPortfolioTooltip({ active, payload }: { active?: boolean; payload?: { payload: { name: string; value: number; amount: number; color: string } }[] }) {
    if (!active || !payload?.length) return null
    const { name, amount, color } = payload[0].payload
    const pctVal = payload[0].payload.value
    return (
      <div className="px-3 py-2 rounded-xl text-xs font-medium"
        style={{ background: 'rgba(10,26,15,0.95)', border: '1px solid rgba(34,197,94,0.25)', color: 'var(--text-primary)', pointerEvents: 'none' }}>
        <p style={{ color: 'var(--text-muted)' }}>{name}</p>
        <p className="font-bold" style={{ color }}>{formatCurrency(amount)}</p>
        <p style={{ color: 'var(--text-muted)' }}>{pctVal.toFixed(1)}%</p>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FILTER VIEW (UNCHANGED)
  // ─────────────────────────────────────────────────────────────────────────
  if (filterType === 'bank' || filterType === 'ewallet') {
    const isBankView = filterType === 'bank'
    const accounts   = isBankView ? bankAccounts : ewalletAccounts
    const color      = isBankView ? '#3b82f6'   : '#a855f7'
    const title      = isBankView ? '🏦 Rekening Bank' : '📱 E-Wallet'
    const emptyHint  = isBankView ? 'Tambah rekening di Pengaturan' : 'Tambah e-wallet di Pengaturan'

    return (
      <div className="px-4 py-5 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <Link href="/portfolio"
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            ←
          </Link>
          <h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h1>
        </div>

        {accounts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">{isBankView ? '🏦' : '📱'}</p>
            <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Belum ada akun</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{emptyHint}</p>
            <Link href="/settings"
              className="inline-block mt-4 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--accent)', color: '#000' }}>
              Pengaturan
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((acc, i) => (
              <motion.div key={acc.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="glass-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ background: `${color}18`, color }}>
                  {acc.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{acc.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{isBankView ? 'Bank' : 'E-Wallet'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold font-mono text-sm" style={{ color }}>
                    {hidden ? HIDDEN_TEXT : formatCurrency(acc.balance || 0)}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Saldo</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN PORTFOLIO VIEW
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="px-4 py-5 max-w-2xl mx-auto pb-32">

      {/* ── Header (UNCHANGED + Tambah Investasi button) ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>Portofolio</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            {isLive ? <Wifi size={11} color="var(--accent)" /> : <WifiOff size={11} color="var(--text-muted)" />}
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {isLive ? 'Harga live' : 'Harga estimasi'} · {lastUpdated?.toLocaleTimeString('id-ID') || '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Quick action — Tambah Investasi */}
          <motion.button
            whileTap={{ scale: 0.94 }}
            whileHover={{ scale: 1.04 }}
            onClick={() => setInvestOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{
              background: 'var(--accent)',
              color:      '#000',
              boxShadow:  '0 4px 14px rgba(34,197,94,0.30)',
            }}>
            <PlusCircle size={13} strokeWidth={2.5} />
            Investasi
          </motion.button>
          <button onClick={refetch}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* ── Performance P&L summary ── */}
      <PerformanceSummary totalPnL={totalPnL} totalPnLPct={totalPnLPct} hidden={hidden} />

      {/* ── Hero + Pie (UNCHANGED + AllocationHealth + CountUp) ── */}
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
        className="glass-hero p-5 mb-4">
        <div className="flex items-center gap-4">
          {/* Pie chart (UNCHANGED) */}
          <div className="flex-shrink-0" style={{ width: 100, height: 100 }}>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={28} outerRadius={46}
                    dataKey="value" strokeWidth={2} stroke="transparent">
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} opacity={0.9} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPortfolioTooltip />} wrapperStyle={{ zIndex: 100, outline: 'none' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center rounded-full"
                style={{ border: '2px dashed var(--border)' }}>
                <span className="text-2xl">📊</span>
              </div>
            )}
          </div>

          {/* Total + legend (UNCHANGED labels, CountUp on number) */}
          <div className="flex-1 min-w-0">
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Total Portofolio Investasi</p>
            <p className="text-2xl font-display font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
              <CountUpNumber value={totalPortfolio} hidden={hidden} hiddenText={HIDDEN_TEXT} />
            </p>
            <div className="flex flex-wrap gap-2">
              {investmentSections.filter((s) => s.pct > 0).map((s) => (
                <div key={s.title} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {s.title} {s.pct.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Allocation health — below chart */}
        {totalPortfolio > 0 && (
          <AllocationHealth sections={investmentSections.map(s => ({ title: s.title, pct: s.pct }))} />
        )}
      </motion.div>

      {/* ── Portfolio Insights ── */}
      {visibleInsights.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2.5 px-1">
            <Lightbulb size={12} style={{ color: 'var(--accent)' }} />
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Insight Portofolio
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <AnimatePresence mode="popLayout">
              {visibleInsights.map(insight => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  onDismiss={id => setDismissedInsights(prev => [...prev, id])}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ── Wallet section (UNCHANGED + combined total) ── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>AKUN DOMPET</p>
          {totalWalletBalance > 0 && (
            <p className="text-xs font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
              {hidden ? '••••' : formatCurrency(totalWalletBalance)}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/portfolio?type=bank">
            <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}
              className="glass-card p-4 flex items-center gap-3 cursor-pointer"
              style={{ borderColor: 'rgba(59,130,246,0.2)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(59,130,246,0.12)' }}>
                <Landmark size={18} color="#3b82f6"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Bank</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{bankAccounts.length} rekening</p>
              </div>
              <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
            </motion.div>
          </Link>
          <Link href="/portfolio?type=ewallet">
            <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}
              className="glass-card p-4 flex items-center gap-3 cursor-pointer"
              style={{ borderColor: 'rgba(168,85,247,0.2)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(168,85,247,0.12)' }}>
                <Wallet size={18} color="#a855f7"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>E-Wallet</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{ewalletAccounts.length} akun</p>
              </div>
              <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
            </motion.div>
          </Link>
        </div>
      </div>

      {/* ── Investment sections (UNCHANGED structure + hover + P&L + Goals) ── */}
      <p className="text-xs font-semibold mb-3 px-1" style={{ color: 'var(--text-muted)' }}>INVESTASI</p>
      <div className="space-y-3">
        {investmentSections.map((s, i) => {
          const matchedGoal = goalsByAsset[s.title]
          const hasPnL      = s.pnl !== undefined && s.value > 0
          const pnlPos      = (s.pnl || 0) >= 0

          return (
            <motion.div key={s.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ scale: 1.01, y: -1, boxShadow: `0 8px 28px ${s.color}18` }}
              whileTap={{ scale: 0.97 }}
              style={{ borderRadius: 16 }}
            >
              <Link href={s.href}>
                <div className="glass-card p-4 flex items-center gap-4 cursor-pointer">
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: `${s.color}18` }}>
                    {s.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="font-display font-semibold" style={{ color: 'var(--text-primary)' }}>{s.title}</p>
                      <p className="font-bold font-mono" style={{ color: s.color }}>
                        {hidden ? HIDDEN_TEXT : formatCurrency(s.value)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs" style={{ color: 'var(--text-muted)', letterSpacing: hidden ? 1.5 : 'normal' }}>
                        {hidden ? '••••' : s.subtitle}
                      </p>
                      <p className="text-xs font-medium" style={{ color: (s as { metaColor?: string }).metaColor || 'var(--text-muted)' }}>
                        {hidden ? '••••' : s.meta}
                      </p>
                    </div>

                    {/* Progress bar (UNCHANGED) */}
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width: `${s.pct}%`, background: s.color }} />
                    </div>

                    {/* P&L badge (NEW) */}
                    {hasPnL && !hidden && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className="text-[10px] font-semibold"
                          style={{ color: pnlPos ? 'var(--accent)' : 'var(--red)' }}>
                          {pnlPos ? '▲' : '▼'} {pnlPos ? '+' : ''}{formatCurrency(s.pnl || 0)}
                        </span>
                        <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>unrealized P&L</span>
                      </div>
                    )}

                    {/* Goal progress (NEW) */}
                    {matchedGoal && !hidden && (
                      <GoalProgressBadge goal={matchedGoal} currentValue={s.value} />
                    )}
                  </div>

                  <ArrowRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>

      {/* ── InvestasiModal ── */}
      <AnimatePresence>
        {investOpen && (
          <InvestasiModal
            walletBalances={walletBalances}
            onClose={() => setInvestOpen(false)}
            onSuccess={handleInvestSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT (UNCHANGED)
// ─────────────────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  return (
    <Suspense fallback={
      <div className="px-4 py-5 max-w-2xl mx-auto space-y-4">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="skeleton h-32 rounded-2xl" />
        <div className="skeleton h-24 rounded-2xl" />
      </div>
    }>
      <PortfolioContent />
    </Suspense>
  )
}
