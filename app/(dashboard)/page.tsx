'use client'

import { useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useApiList } from '@/hooks/useApiData'
import { useGoldPrices, useStockPrices } from '@/hooks/usePrices'
import { formatCurrency, getCurrentMonth } from '@/lib/utils'
import type { Transaction, GoldHolding, StockHolding, Deposit, BudgetStatus } from '@/types'
import { TrendingUp, TrendingDown, ArrowRight, Upload } from 'lucide-react'
import Link from 'next/link'
import { WalletCard } from '@/components/dashboard/WalletCard'
import { QuickAddFAB } from '@/components/transactions/QuickAddFAB'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'
import { PortfolioSummaryCard } from '@/components/dashboard/PortfolioSummaryCard'
import { SmartInsights } from '@/components/dashboard/SmartInsights'
import { StreakBanner } from '@/components/dashboard/StreakBanner'
import { WeeklySummary } from '@/components/dashboard/WeeklySummary'
import { BudgetProgress } from '@/components/dashboard/BudgetProgress'
import { NetWorthChart } from '@/components/charts/NetWorthChart'

export default function DashboardPage() {
  const { data: session } = useSession()

  const { data: transactions } = useApiList<Transaction>('/api/transactions?limit=7&sort=createdAt',  { refreshMs: 8000 })
  const { data: allTx }        = useApiList<Transaction>('/api/transactions?limit=500',               { refreshMs: 15000 })
  const { data: goldHoldings } = useApiList<GoldHolding>('/api/portfolio/gold',                       { refreshMs: 30000 })
  const { data: stocks }       = useApiList<StockHolding>('/api/portfolio/stocks',                    { refreshMs: 30000 })
  const { data: deposits }     = useApiList<Deposit>('/api/portfolio/deposits?status=all',            { refreshMs: 30000 })
  const { data: budgets }      = useApiList<BudgetStatus>('/api/budget',                              { refreshMs: 30000 })

  const stockSymbols = useMemo(() => (stocks || []).map((s) => s.symbol), [stocks])
  const { prices: stockPrices } = useStockPrices(stockSymbols)
  const { prices: goldPrices }  = useGoldPrices()

  const monthStats = useMemo(() => {
    const currentMonth = getCurrentMonth()
    const income  = allTx.filter((t) => t.type === 'income'  && t.date.startsWith(currentMonth)).reduce((s, t) => s + t.amount, 0)
    const expense = allTx.filter((t) => t.type === 'expense' && t.date.startsWith(currentMonth)).reduce((s, t) => s + t.amount, 0)
    return { income, expense, balance: income - expense }
  }, [allTx])

  const walletBalances = useMemo(() => {
    const b = { cash: 0, bank: 0, ewallet: 0 }
    allTx.forEach((t) => {
      if      (t.type === 'income')   b[t.wallet as keyof typeof b] += t.amount
      else if (t.type === 'expense')  b[t.wallet as keyof typeof b] -= t.amount
      else {
        b[t.wallet as keyof typeof b] -= t.amount
        if (t.toWallet) b[t.toWallet as keyof typeof b] += t.amount
      }
    })
    return b
  }, [allTx])

  const goldValue = useMemo(() =>
    goldHoldings.reduce((s, h) => s + h.grams * (goldPrices?.[h.source]?.sellPrice || 0), 0),
    [goldHoldings, goldPrices]
  )
  const depositValue = useMemo(() =>
    deposits.filter((d) => d.status === 'active').reduce((s, d) => s + d.nominal, 0), [deposits])
  const stockValue = useMemo(() =>
    (stocks || []).reduce((s, h) => s + h.lots * 100 * (stockPrices?.[h.symbol]?.currentPrice || 0), 0),
    [stocks, stockPrices]
  )

  const walletTotal  = walletBalances.cash + walletBalances.bank + walletBalances.ewallet
  const totalWealth  = walletTotal + goldValue + depositValue + stockValue

  // Save net worth snapshot whenever total wealth is computed and non-zero
  useEffect(() => {
    if (totalWealth > 0 && allTx.length > 0) {
      fetch('/api/net-worth-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: totalWealth }),
      }).catch(() => {})
    }
  }, [totalWealth, allTx.length])

  const firstName = session?.user?.name?.split(' ')[0] || 'User'
  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Selamat pagi' : hour < 17 ? 'Selamat siang' : 'Selamat malam'

  return (
    <div className="px-4 py-5 space-y-5 max-w-2xl mx-auto">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{greeting},</p>
            <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>
              {firstName} 👋
            </h1>
          </div>
          {/* Import shortcut */}
          <Link href="/import"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium"
            style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            <Upload size={13}/> Import CSV
          </Link>
        </div>
      </motion.div>

      {/* Streak / reminder banner */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.04 }}>
        <StreakBanner />
      </motion.div>

      {/* Hero card */}
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.08 }} className="glass-hero p-6 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'rgba(52,211,110,0.07)' }} />
        <p className="text-xs font-medium mb-1" style={{ color: 'rgba(52,211,110,0.75)' }}>Total Kekayaan Bersih</p>
        <p className="text-3xl font-display font-bold mb-5" style={{ color: 'var(--text-primary)' }}>
          {formatCurrency(totalWealth)}
        </p>
        <div className="flex items-center gap-6">
          {[
            { label: 'Pemasukan',   value: monthStats.income,  color: 'var(--accent)', Icon: TrendingUp },
            { label: 'Pengeluaran', value: monthStats.expense, color: 'var(--red)',    Icon: TrendingDown },
          ].map(({ label, value, color, Icon }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: `${color}18`, color }}>
                <Icon size={13} />
              </div>
              <div>
                <p className="text-[10px] leading-none mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
                <p className="text-sm font-bold font-mono" style={{ color }}>{formatCurrency(value)}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Wallets */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <p className="text-xs font-semibold mb-2 px-1" style={{ color: 'var(--text-muted)' }}>DOMPET</p>
        <div className="grid grid-cols-3 gap-3">
          <WalletCard type="cash"    balance={walletBalances.cash}    />
          <WalletCard type="bank"    balance={walletBalances.bank}    />
          <WalletCard type="ewallet" balance={walletBalances.ewallet} />
        </div>
      </motion.div>

      {/* Net Worth Chart */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
        <NetWorthChart
          transactions={allTx}
          goldValue={goldValue}
          stockValue={stockValue}
          depositValue={depositValue}
        />
      </motion.div>

      {/* Weekly Summary */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
        <WeeklySummary transactions={allTx} />
      </motion.div>

      {/* Portfolio summary */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>PORTOFOLIO</p>
          <Link href="/portfolio" className="flex items-center gap-1 text-xs" style={{ color: 'var(--accent)' }}>
            Lihat semua <ArrowRight size={12} />
          </Link>
        </div>
        <PortfolioSummaryCard
          goldValue={goldValue}
          goldGrams={goldHoldings.reduce((s, h) => s + h.grams, 0)}
          stockCount={stocks.length}
          stockValue={stockValue}
          depositValue={depositValue}
          depositCount={deposits.filter((d) => d.status === 'active').length}
        />
      </motion.div>

      {/* Budget progress */}
      {budgets.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.20 }}>
          <BudgetProgress budgets={budgets} />
        </motion.div>
      )}

      {/* Smart insights */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
        <SmartInsights
          transactions={allTx}
          goldHoldings={goldHoldings}
          stocks={stocks}
          deposits={deposits}
          totalWealth={totalWealth}
          goldValue={goldValue}
          stockValue={stockValue}
          walletTotal={walletTotal}
          budgets={budgets}
        />
      </motion.div>

      {/* Recent transactions */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>TRANSAKSI TERBARU</p>
          <Link href="/transactions" className="flex items-center gap-1 text-xs" style={{ color: 'var(--accent)' }}>
            Lihat semua <ArrowRight size={12} />
          </Link>
        </div>
        <RecentTransactions transactions={transactions.slice(0, 5)} />
      </motion.div>

      <QuickAddFAB />
    </div>
  )
}
