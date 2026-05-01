'use client'

import { useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useApiList } from '@/hooks/useApiData'
import { useGoldPrices, useStockPrices } from '@/hooks/usePrices'
import { useBalanceVisibility } from '@/hooks/useBalanceVisibility'
import { useCountUp } from '@/hooks/useCountUp'
import { formatCurrency, getCurrentMonth } from '@/lib/utils'
import type {
  Transaction, GoldHolding, StockHolding,
  Deposit, BudgetStatus, SBNHolding, ReksadanaHolding,
} from '@/types'
import { TrendingUp, TrendingDown, ArrowRight, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { WalletCard }           from '@/components/dashboard/WalletCard'
import { QuickAddFAB }          from '@/components/transactions/QuickAddFAB'
import { RecentTransactions }   from '@/components/dashboard/RecentTransactions'
import { SmartInsights }        from '@/components/dashboard/SmartInsights'
import { StreakBanner }         from '@/components/dashboard/StreakBanner'
import { WeeklySummary }        from '@/components/dashboard/WeeklySummary'
import { BudgetProgress }       from '@/components/dashboard/BudgetProgress'
import { NetWorthChart }        from '@/components/charts/NetWorthChart'
import { NetWorthBreakdown }    from '@/components/dashboard/NetWorthBreakdown'

export default function DashboardPage() {
  const { data: session }       = useSession()
  const { hidden, toggle, mounted } = useBalanceVisibility()

  const { data: transactions }    = useApiList<Transaction>('/api/transactions?limit=7&sort=createdAt',  { refreshMs: 8000  })
  const { data: allTx, refetch: refetchAllTx } = useApiList<Transaction>('/api/transactions?limit=500', { refreshMs: 15000 })
  const { data: goldHoldings }    = useApiList<GoldHolding>('/api/portfolio/gold',                       { refreshMs: 30000 })
  const { data: stocks }          = useApiList<StockHolding>('/api/portfolio/stocks',                    { refreshMs: 30000 })
  const { data: deposits }        = useApiList<Deposit>('/api/portfolio/deposits?status=all',            { refreshMs: 30000 })
  const { data: sbnList }         = useApiList<SBNHolding>('/api/portfolio/sbn',                         { refreshMs: 60000 })
  const { data: reksadanaList }   = useApiList<ReksadanaHolding>('/api/portfolio/reksadana',             { refreshMs: 60000 })
  const { data: budgets }         = useApiList<BudgetStatus>('/api/budget',                              { refreshMs: 30000 })

  const stockSymbols              = useMemo(() => (stocks || []).map(s => s.symbol), [stocks])
  const { prices: stockPrices }   = useStockPrices(stockSymbols)
  const { prices: goldPrices }    = useGoldPrices()

  const monthStats = useMemo(() => {
    const currentMonth = getCurrentMonth()
    const income  = allTx.filter(t => t.type === 'income'  && t.date.startsWith(currentMonth)).reduce((s, t) => s + t.amount, 0)
    const expense = allTx.filter(t => t.type === 'expense' && t.date.startsWith(currentMonth)).reduce((s, t) => s + t.amount, 0)
    return { income, expense, balance: income - expense }
  }, [allTx])

  const walletBalances = useMemo(() => {
    const b = { cash: 0, bank: 0, ewallet: 0 }
    allTx.forEach(t => {
      if      (t.type === 'income')   b[t.wallet as keyof typeof b] += t.amount
      else if (t.type === 'expense')  b[t.wallet as keyof typeof b] -= t.amount
      else {
        b[t.wallet as keyof typeof b] -= t.amount
        if (t.toWallet) b[t.toWallet as keyof typeof b] += t.amount
      }
    })
    return b
  }, [allTx])

  const goldValue     = useMemo(() =>
    goldHoldings.reduce((s, h) => s + h.grams * (goldPrices?.[h.source]?.sellPrice || 0), 0),
    [goldHoldings, goldPrices])

  const depositValue  = useMemo(() =>
    deposits.filter(d => d.status === 'active').reduce((s, d) => s + d.nominal, 0), [deposits])

  const stockValue    = useMemo(() =>
    (stocks || []).reduce((s, h) => s + h.lots * 100 * (stockPrices?.[h.symbol]?.currentPrice || 0), 0),
    [stocks, stockPrices])

  const walletTotal   = walletBalances.cash + walletBalances.bank + walletBalances.ewallet
  const sbnValue      = useMemo(() => sbnList.filter(h => h.status === 'active').reduce((s, h) => s + h.nominal, 0), [sbnList])
  const reksadanaValue= useMemo(() => reksadanaList.reduce((s, h) => s + h.unit * h.currentNAV, 0), [reksadanaList])
  const totalWealth   = walletTotal + goldValue + depositValue + stockValue + sbnValue + reksadanaValue

  // ── Count-up animation for hero balance ───────────────────────────────────
  // Only animate when the balance is visible and component is mounted
  const animatedWealth = useCountUp(totalWealth, 800, !hidden && mounted)

  // ── Monthly change indicator ───────────────────────────────────────────────
  // Net cash flow this month, expressed as % of wealth before this month's activity
  const monthlyChange    = monthStats.income - monthStats.expense
  const prevWealthBase   = Math.max(1, totalWealth - monthlyChange)
  const monthlyChangePct = (monthlyChange / prevWealthBase) * 100
  const isMonthlyUp      = monthlyChange >= 0

  // ── Net-worth history snapshot ────────────────────────────────────────────
  useEffect(() => {
    if (totalWealth > 0 && allTx.length > 0) {
      fetch('/api/net-worth-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: totalWealth }),
      }).catch(() => {})
    }
  }, [totalWealth, allTx.length])

  // ── Wallet refresh on investment events ───────────────────────────────────
  useEffect(() => {
    const handler = () => refetchAllTx()
    window.addEventListener('fintrack:wallet-updated', handler)
    return () => window.removeEventListener('fintrack:wallet-updated', handler)
  }, [refetchAllTx])

  const firstName = session?.user?.name?.split(' ')[0] || 'User'
  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Selamat pagi' : hour < 17 ? 'Selamat siang' : 'Selamat malam'

  const maskedMain   = '••••••••'
  const maskedAmount = '••••••'

  return (
    <div className="px-4 py-6 space-y-6 max-w-2xl mx-auto">

      {/* ── Greeting ─────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{greeting},</p>
            <h1
              className="text-2xl font-display font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              {firstName} 👋
            </h1>
          </div>
        </div>
      </motion.div>

      {/* ── Streak banner ────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.04 }}>
        <StreakBanner />
      </motion.div>

      {/* ── HERO CARD ────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.08 }}
        className="glass-hero p-6 relative overflow-hidden"
        style={{
          boxShadow: isMonthlyUp
            ? '0 8px 32px rgba(34,197,94,0.14), 0 0 0 1px rgba(34,197,94,0.12), inset 0 1px 0 rgba(255,255,255,0.9)'
            : undefined,
          transition: 'box-shadow 0.5s ease',
        }}
      >
        {/* Ambient glow — intensifies on positive month */}
        <div
          className="absolute -top-10 -right-10 w-48 h-48 rounded-full blur-3xl pointer-events-none transition-all duration-700"
          style={{
            background: `rgba(34,197,94,${isMonthlyUp && !hidden ? '0.14' : '0.06'})`,
          }}
        />
        <div
          className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full blur-2xl pointer-events-none"
          style={{ background: 'rgba(74,222,128,0.06)' }}
        />

        {/* Label + eye toggle */}
        <div className="flex items-center justify-between mb-1.5">
          <p
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'rgba(34,197,94,0.75)' }}
          >
            Total Kekayaan Bersih
          </p>

          {mounted && (
            <motion.button
              onClick={toggle}
              whileTap={{ scale: 0.92 }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{
                background:  hidden ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.10)',
                border:      `1px solid ${hidden ? 'rgba(34,197,94,0.35)' : 'rgba(34,197,94,0.22)'}`,
                transition:  'background 0.2s, border-color 0.2s',
              }}
            >
              {/* Eye icon with smooth swap animation */}
              <motion.span
                key={hidden ? 'off' : 'on'}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1,   opacity: 1 }}
                exit={{    scale: 0.7, opacity: 0 }}
                transition={{ duration: 0.18 }}
                style={{ display: 'flex' }}
              >
                {hidden
                  ? <EyeOff size={13} color="rgba(34,197,94,1)"    />
                  : <Eye    size={13} color="rgba(34,197,94,0.90)" />
                }
              </motion.span>
              <span
                className="text-[10px] font-semibold select-none"
                style={{ color: 'rgba(34,197,94,0.95)', transition: 'color 0.2s' }}
              >
                {hidden ? 'Tampilkan' : 'Sembunyikan'}
              </span>
            </motion.button>
          )}
        </div>

        {/* ── Main balance (count-up) ─────────────────────────────────────── */}
        <motion.p
          className="font-display font-bold mb-1"
          style={{
            fontSize:      'clamp(1.75rem, 7vw, 2.25rem)',
            lineHeight:    1.1,
            color:         hidden ? 'var(--text-muted)' : 'var(--text-primary)',
            letterSpacing: hidden ? 3 : -0.5,
            transition:    'color 0.25s, letter-spacing 0.25s, opacity 0.25s',
            opacity:       mounted ? 1 : 0,
          }}
        >
          {hidden ? maskedMain : formatCurrency(animatedWealth)}
        </motion.p>

        {/* ── Monthly change indicator ────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-4 h-5"
        >
          {!hidden && mounted && totalWealth > 0 && Math.abs(monthlyChange) > 0 && (
            <div
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{
                background: isMonthlyUp ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)',
                color:      isMonthlyUp ? 'var(--accent)' : 'var(--red)',
                border:     `1px solid ${isMonthlyUp ? 'rgba(34,197,94,0.22)' : 'rgba(239,68,68,0.22)'}`,
              }}
            >
              {isMonthlyUp
                ? <TrendingUp  size={10} strokeWidth={2.5} />
                : <TrendingDown size={10} strokeWidth={2.5} />
              }
              <span>
                {isMonthlyUp ? '+' : ''}{formatCurrency(Math.abs(monthlyChange))}
                {Math.abs(monthlyChangePct) >= 0.01 && (
                  <span style={{ opacity: 0.70 }}>
                    {' '}({isMonthlyUp ? '+' : ''}{monthlyChangePct.toFixed(1)}%)
                  </span>
                )}{' '}
                bulan ini
              </span>
            </div>
          )}
        </motion.div>

        {/* ── Income / Expense row ────────────────────────────────────────── */}
        <div className="flex items-center gap-6">
          {[
            { label: 'Pemasukan',   value: monthStats.income,  color: 'var(--accent)', Icon: TrendingUp  },
            { label: 'Pengeluaran', value: monthStats.expense, color: 'var(--red)',    Icon: TrendingDown },
          ].map(({ label, value, color, Icon }) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: `${color}18`, color }}
              >
                <Icon size={13} />
              </div>
              <div>
                <p className="text-[10px] leading-none mb-0.5" style={{ color: 'var(--text-muted)' }}>
                  {label}
                </p>
                <p
                  className="text-sm font-bold font-mono"
                  style={{ color: hidden ? 'var(--text-muted)' : color }}
                >
                  {hidden ? maskedAmount : formatCurrency(value)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── DOMPET ───────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
      >
        <p className="text-xs font-semibold mb-2 px-1" style={{ color: 'var(--text-muted)' }}>
          DOMPET
        </p>
        <div className="grid grid-cols-3 gap-3">
          <WalletCard type="cash"    balance={walletBalances.cash}    hidden={hidden} />
          <WalletCard type="bank"    balance={walletBalances.bank}    hidden={hidden} />
          <WalletCard type="ewallet" balance={walletBalances.ewallet} hidden={hidden} />
        </div>
      </motion.div>

      {/* ── Net Worth Chart ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14 }}
      >
        <NetWorthChart
          transactions={allTx}
          goldValue={goldValue}
          stockValue={stockValue}
          depositValue={depositValue}
        />
      </motion.div>

      {/* ── Weekly Summary ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
      >
        <WeeklySummary transactions={allTx} hidden={hidden} />
      </motion.div>

      {/* ── Net Worth Breakdown ──────────────────────────────────────────── */}
      <NetWorthBreakdown
        cashBalance={walletBalances.cash}
        bankBalance={walletBalances.bank}
        ewalletBalance={walletBalances.ewallet}
        goldValue={goldValue}
        stockValue={stockValue}
        depositValue={depositValue}
        sbnValue={sbnValue}
        reksadanaValue={reksadanaValue}
        hidden={hidden}
      />

      {/* ── Budget progress ──────────────────────────────────────────────── */}
      {budgets.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.20 }}
        >
          <BudgetProgress budgets={budgets} />
        </motion.div>
      )}

      {/* ── Smart insights ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
      >
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

      {/* ── Recent transactions ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.26 }}
      >
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
            TRANSAKSI TERBARU
          </p>
          <Link
            href="/transactions"
            className="flex items-center gap-1 text-xs transition-opacity hover:opacity-70"
            style={{ color: 'var(--accent)' }}
          >
            Lihat semua <ArrowRight size={12} />
          </Link>
        </div>
        <RecentTransactions transactions={transactions.slice(0, 5)} hidden={hidden} />
      </motion.div>

      <QuickAddFAB walletBalances={walletBalances} />
    </div>
  )
}
