'use client'

import { useMemo, useEffect, useState, Suspense } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useApiList } from '@/hooks/useApiData'
import { useGoldPrices, useStockPrices } from '@/hooks/usePrices'
import { formatCurrency, formatNumber, formatPercent, parseLotValue, calcProfitLoss } from '@/lib/utils'
import { useBalanceVisibility } from '@/hooks/useBalanceVisibility'
import type { GoldHolding, StockHolding, Deposit, WalletAccount, SBNHolding, ReksadanaHolding } from '@/types'
import { ArrowRight, RefreshCw, Wifi, WifiOff, Landmark, Wallet } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

function PortfolioContent() {
  const searchParams = useSearchParams()
  const filterType   = searchParams.get('type') // 'bank' | 'ewallet' | null
  const { hidden }   = useBalanceVisibility()
  const HIDDEN_TEXT  = '••••••'

  const { data: goldHoldings } = useApiList<GoldHolding>('/api/portfolio/gold',           { refreshMs: 30000 })
  const { data: stocks }       = useApiList<StockHolding>('/api/portfolio/stocks',         { refreshMs: 30000 })
  const { data: deposits }     = useApiList<Deposit>('/api/portfolio/deposits?status=all', { refreshMs: 30000 })
  const { data: sbnList }      = useApiList<SBNHolding>('/api/portfolio/sbn',              { refreshMs: 60000 })
  const { data: reksadanaList }= useApiList<ReksadanaHolding>('/api/portfolio/reksadana', { refreshMs: 60000 })

  const [walletAccounts, setWalletAccounts] = useState<WalletAccount[]>([])

  const { prices: goldPrices, lastUpdated, isLive, refetch } = useGoldPrices()
  const symbols = useMemo(() => stocks.map((s) => s.symbol), [stocks])
  const { prices: stockPrices } = useStockPrices(symbols)

  useEffect(() => {
    fetch('/api/wallet-accounts').then((r) => r.json()).then((j) => {
      if (j.success) setWalletAccounts(j.data || [])
    })
  }, [])

  const bankAccounts    = walletAccounts.filter((a) => a.type === 'bank')
  const ewalletAccounts = walletAccounts.filter((a) => a.type === 'ewallet')

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
      totalNominal:    active.reduce((s, d) => s + d.nominal, 0),
      totalFinalValue: active.reduce((s, d) => s + d.finalValue, 0),
      count: active.length,
    }
  }, [deposits])

  const sbnSummary = useMemo(() => {
    const active = sbnList.filter((h) => h.status === 'active')
    return {
      totalNominal:   active.reduce((s, h) => s + h.nominal, 0),
      totalNetReturn: active.reduce((s, h) => s + h.netReturn, 0),
      count: active.length,
    }
  }, [sbnList])

  const reksadanaSummary = useMemo(() => {
    let totalValue = 0, totalCost = 0
    reksadanaList.forEach((h) => {
      totalValue += h.unit * h.currentNAV
      totalCost  += h.unit * h.buyNAV
    })
    return { totalValue, totalCost, pnl: totalValue - totalCost, count: reksadanaList.length }
  }, [reksadanaList])

  const totalPortfolio = goldSummary.totalValue + stockSummary.totalValue + depositSummary.totalNominal + sbnSummary.totalNominal + reksadanaSummary.totalValue

  const investmentSections = [
    { href: '/portfolio/emas',     icon: '🥇', title: 'Emas',     color: '#f6cc60',
      subtitle: `${formatNumber(goldSummary.totalGrams, 3)} gram`, value: goldSummary.totalValue,
      meta: goldPrices?.antam ? `Antam: ${formatCurrency(goldPrices.antam.sellPrice)}/gr` : 'Memuat...',
      pct: totalPortfolio > 0 ? (goldSummary.totalValue / totalPortfolio) * 100 : 0 },
    { href: '/portfolio/saham',    icon: '📈', title: 'Saham',    color: '#63b3ed',
      subtitle: `${stocks.length} emiten`, value: stockSummary.totalValue,
      meta: stockSummary.totalCost > 0 ? `${formatPercent(stockSummary.profitLossPercent)} P&L` : 'Belum ada saham',
      metaColor: stockSummary.profitLoss >= 0 ? 'var(--accent)' : 'var(--red)',
      pct: totalPortfolio > 0 ? (stockSummary.totalValue / totalPortfolio) * 100 : 0 },
    { href: '/portfolio/deposito', icon: '🏦', title: 'Deposito', color: '#d6aaff',
      subtitle: `${depositSummary.count} aktif`, value: depositSummary.totalNominal,
      meta: depositSummary.totalFinalValue > 0 ? `Nilai akhir: ${formatCurrency(depositSummary.totalFinalValue)}` : 'Belum ada deposito',
      pct: totalPortfolio > 0 ? (depositSummary.totalNominal / totalPortfolio) * 100 : 0 },
    { href: '/portfolio/sbn',       icon: '🏛️', title: 'SBN',       color: '#c084fc',
      subtitle: `${sbnSummary.count} aktif`, value: sbnSummary.totalNominal,
      meta: sbnSummary.totalNetReturn > 0 ? `Bunga bersih: +${formatCurrency(sbnSummary.totalNetReturn)}` : 'Belum ada SBN',
      pct: totalPortfolio > 0 ? (sbnSummary.totalNominal / totalPortfolio) * 100 : 0 },
    { href: '/portfolio/reksadana', icon: '📦', title: 'Reksadana', color: '#38bdf8',
      subtitle: `${reksadanaSummary.count} produk`, value: reksadanaSummary.totalValue,
      meta: reksadanaSummary.totalCost > 0 ? `${reksadanaSummary.pnl >= 0 ? '+' : ''}${formatCurrency(reksadanaSummary.pnl)} P&L` : 'Belum ada reksadana',
      metaColor: reksadanaSummary.pnl >= 0 ? 'var(--accent)' : 'var(--red)',
      pct: totalPortfolio > 0 ? (reksadanaSummary.totalValue / totalPortfolio) * 100 : 0 },
  ]

  const pieData = investmentSections.filter((s) => s.pct > 0).map((s) => ({ name: s.title, value: s.pct, amount: s.value, color: s.color }))

  function CustomPortfolioTooltip({ active, payload }: { active?: boolean; payload?: { payload: { name: string; value: number; amount: number; color: string } }[] }) {
    if (!active || !payload?.length) return null
    const { name, amount, pct: _pct, color } = { ...payload[0].payload, pct: payload[0].payload.value }
    return (
      <div className="px-3 py-2 rounded-xl text-xs font-medium"
        style={{ background: 'rgba(10, 26, 15, 0.95)', border: '1px solid rgba(34,197,94,0.25)', color: 'var(--text-primary)', pointerEvents: 'none' }}>
        <p style={{ color: 'var(--text-muted)' }}>{name}</p>
        <p className="font-bold" style={{ color }}>{formatCurrency(amount)}</p>
        <p style={{ color: 'var(--text-muted)' }}>{_pct.toFixed(1)}%</p>
      </div>
    )
  }

  // Filter mode: if coming from dashboard wallet card
  if (filterType === 'bank' || filterType === 'ewallet') {
    const isBankView   = filterType === 'bank'
    const accounts     = isBankView ? bankAccounts : ewalletAccounts
    const color        = isBankView ? '#3b82f6' : '#a855f7'
    const bg           = isBankView ? 'rgba(59,130,246,0.12)' : 'rgba(168,85,247,0.12)'
    const title        = isBankView ? '🏦 Rekening Bank' : '📱 E-Wallet'
    const emptyHint    = isBankView ? 'Tambah rekening di Pengaturan' : 'Tambah e-wallet di Pengaturan'

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
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
              Kelola {isBankView ? 'Rekening Bank' : 'E-Wallet'}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((account, i) => (
              <motion.div key={account.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}>
                <div className="glass-card p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold flex-shrink-0"
                    style={{ background: bg, color }}>
                    {account.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold" style={{ color: 'var(--text-primary)' }}>{account.name}</p>
                    <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{account.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold font-mono text-sm" style={{ color }}>
                      {hidden ? HIDDEN_TEXT : formatCurrency(account.balance)}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Saldo</p>
                  </div>
                </div>
              </motion.div>
            ))}
            <div className="pt-2">
              <Link href="/settings"
                className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-medium"
                style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
                + Tambah Akun
              </Link>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Full portfolio view ──
  return (
    <div className="px-4 py-5 max-w-2xl mx-auto">
      {/* Header */}
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
        <button onClick={refetch} className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Hero + Pie */}
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
        className="glass-hero p-5 mb-5">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0" style={{ width: 100, height: 100 }}>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={28} outerRadius={46}
                    dataKey="value" strokeWidth={2} stroke="transparent"
                    isAnimationActive={false}>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} opacity={0.9} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<CustomPortfolioTooltip />}
                    wrapperStyle={{ zIndex: 100, outline: 'none' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center rounded-full"
                style={{ border: '2px dashed var(--border)' }}>
                <span className="text-2xl">📊</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Total Portofolio Investasi</p>
            <p className="text-2xl font-display font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
              {hidden ? HIDDEN_TEXT : formatCurrency(totalPortfolio)}
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
      </motion.div>

      {/* ── Bank & E-Wallet section ── */}
      <div className="mb-4">
        <p className="text-xs font-semibold mb-3 px-1" style={{ color: 'var(--text-muted)' }}>AKUN DOMPET</p>
        <div className="grid grid-cols-2 gap-3">
          {/* Bank */}
          <Link href="/portfolio?type=bank">
            <div className="glass-card p-4 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
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
            </div>
          </Link>

          {/* E-Wallet */}
          <Link href="/portfolio?type=ewallet">
            <div className="glass-card p-4 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
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
            </div>
          </Link>
        </div>
      </div>

      {/* ── Investments ── */}
      <p className="text-xs font-semibold mb-3 px-1" style={{ color: 'var(--text-muted)' }}>INVESTASI</p>
      <div className="space-y-3">
        {investmentSections.map((s, i) => (
          <motion.div key={s.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}>
            <Link href={s.href}>
              <div className="glass-card p-4 flex items-center gap-4 active:scale-[0.99] transition-transform cursor-pointer">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: `${s.color}18` }}>{s.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="font-display font-semibold" style={{ color: 'var(--text-primary)' }}>{s.title}</p>
                    <p className="font-bold font-mono" style={{ color: s.color }}>{hidden ? HIDDEN_TEXT : formatCurrency(s.value)}</p>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.subtitle}</p>
                    <p className="text-xs font-medium" style={{ color: (s as {metaColor?:string}).metaColor || 'var(--text-muted)' }}>
                      {hidden ? '••••' : s.meta}
                    </p>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${s.pct}%`, background: s.color }} />
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
