'use client'

import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useApiList } from '@/hooks/useApiData'
import { useGoldPrices, useStockPrices } from '@/hooks/usePrices'
import { useBalanceVisibility } from '@/hooks/useBalanceVisibility'
import { useCountUp } from '@/hooks/useCountUp'
import { getCurrentMonth } from '@/lib/utils'
import { isExpenseForSummary, isExpenseForWalletBalance } from '@/lib/transaction-rules'
import type {
  Transaction, GoldHolding, StockHolding,
  Deposit, BudgetStatus, SBNHolding, ReksadanaHolding,
} from '@/types'
import { QuickAddFAB } from '@/components/transactions/QuickAddFAB'
import { ChatInput } from '@/components/transactions/ChatInput'
import { CreditCardDashboardSection } from '@/components/credit-card/CreditCardDashboardSection'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'
import { SmartInsights } from '@/components/dashboard/SmartInsights'
import { StreakBanner } from '@/components/dashboard/StreakBanner'
import { WeeklySummary } from '@/components/dashboard/WeeklySummary'
import { NetWorthChart } from '@/components/charts/NetWorthChart'
import { DashboardSectionHeader } from '@/components/dashboard/DashboardSectionHeader'
import { MonthlyCashflowCard } from '@/components/dashboard/MonthlyCashflowCard'
import { NetWorthCard } from '@/components/dashboard/NetWorthCard'
import { WalletSection } from '@/components/dashboard/WalletSection'

export default function DashboardPage() {
  const { data: session } = useSession()
  const { hidden, toggle, mounted } = useBalanceVisibility()

  const { data: transactions } = useApiList<Transaction>('/api/transactions?limit=7&sort=createdAt', { refreshMs: 8000 })
  const { data: allTx, refetch: refetchAllTx } = useApiList<Transaction>('/api/transactions?limit=500', { refreshMs: 15000 })
  const { data: goldHoldings } = useApiList<GoldHolding>('/api/portfolio/gold', { refreshMs: 30000 })
  const { data: stocks } = useApiList<StockHolding>('/api/portfolio/stocks', { refreshMs: 30000 })
  const { data: deposits } = useApiList<Deposit>('/api/portfolio/deposits?status=all', { refreshMs: 30000 })
  const { data: sbnList } = useApiList<SBNHolding>('/api/portfolio/sbn', { refreshMs: 60000 })
  const { data: reksadanaList } = useApiList<ReksadanaHolding>('/api/portfolio/reksadana', { refreshMs: 60000 })
  const { data: budgets } = useApiList<BudgetStatus>('/api/budget', { refreshMs: 30000 })

  const stockSymbols = useMemo(() => (stocks || []).map((s) => s.symbol), [stocks])
  const { prices: stockPrices } = useStockPrices(stockSymbols)
  const { prices: goldPrices } = useGoldPrices()

  const monthStats = useMemo(() => {
    const currentMonth = getCurrentMonth()
    const income = allTx
      .filter((t) => t.type === 'income' && t.date.startsWith(currentMonth))
      .reduce((sum, t) => sum + t.amount, 0)
    const expense = allTx
      .filter((t) => isExpenseForSummary(t) && t.date.startsWith(currentMonth))
      .reduce((sum, t) => sum + t.amount, 0)

    return { income, expense, balance: income - expense }
  }, [allTx])

  const walletBalances = useMemo(() => {
    const balances = { cash: 0, bank: 0, ewallet: 0 }

    allTx.forEach((t) => {
      if (t.type === 'income' && t.wallet) {
        balances[t.wallet as keyof typeof balances] += t.amount
      } else if (isExpenseForWalletBalance(t) && t.wallet) {
        balances[t.wallet as keyof typeof balances] -= t.amount
      } else if (t.type === 'transfer' && t.wallet) {
        balances[t.wallet as keyof typeof balances] -= t.amount
        if (t.toWallet) balances[t.toWallet as keyof typeof balances] += t.amount
      }
    })

    return balances
  }, [allTx])

  const goldValue = useMemo(
    () => goldHoldings.reduce((sum, h) => sum + h.grams * (goldPrices?.[h.source]?.sellPrice || 0), 0),
    [goldHoldings, goldPrices],
  )

  const depositValue = useMemo(
    () => deposits.filter((d) => d.status === 'active').reduce((sum, d) => sum + d.nominal, 0),
    [deposits],
  )

  const stockValue = useMemo(
    () => (stocks || []).reduce((sum, h) => sum + h.lots * 100 * (stockPrices?.[h.symbol]?.currentPrice || 0), 0),
    [stocks, stockPrices],
  )

  const walletTotal = walletBalances.cash + walletBalances.bank + walletBalances.ewallet
  const sbnValue = useMemo(
    () => sbnList.filter((h) => h.status === 'active').reduce((sum, h) => sum + h.nominal, 0),
    [sbnList],
  )
  const reksadanaValue = useMemo(
    () => reksadanaList.reduce((sum, h) => sum + h.unit * h.currentNAV, 0),
    [reksadanaList],
  )
  const totalWealth = walletTotal + goldValue + depositValue + stockValue + sbnValue + reksadanaValue

  const animatedWealth = useCountUp(totalWealth, 800, !hidden && mounted)

  const monthlyChange = monthStats.balance
  const prevWealthBase = Math.max(1, totalWealth - monthlyChange)
  const monthlyChangePct = (monthlyChange / prevWealthBase) * 100

  useEffect(() => {
    if (totalWealth > 0 && allTx.length > 0) {
      fetch('/api/net-worth-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: totalWealth }),
      }).catch(() => {})
    }
  }, [totalWealth, allTx.length])

  useEffect(() => {
    const handler = () => refetchAllTx()
    window.addEventListener('fintrack:wallet-updated', handler)
    return () => window.removeEventListener('fintrack:wallet-updated', handler)
  }, [refetchAllTx])

  const firstName = session?.user?.name?.split(' ')[0] || 'User'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Selamat pagi' : hour < 17 ? 'Selamat siang' : 'Selamat malam'
  const recentTransactions = useMemo(() => transactions.slice(0, 4), [transactions])

  return (
    <div className="mx-auto max-w-2xl px-4 pb-8 pt-6">
      <div className="space-y-7">
        <motion.section initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-sm leading-snug" style={{ color: 'var(--text-muted)' }}>
            {greeting},
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold leading-tight" style={{ color: 'var(--text-primary)', letterSpacing: 0 }}>
            {firstName}
          </h1>
        </motion.section>

        <NetWorthCard
          totalWealth={totalWealth}
          animatedWealth={animatedWealth}
          monthlyChange={monthlyChange}
          monthlyChangePct={monthlyChangePct}
          hidden={hidden}
          mounted={mounted}
          onToggleHidden={toggle}
        />

        <MonthlyCashflowCard
          income={monthStats.income}
          expense={monthStats.expense}
          balance={monthStats.balance}
          hidden={hidden}
        />

        <StreakBanner />

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <WalletSection walletBalances={walletBalances} hidden={hidden} />
        </motion.div>

        <NetWorthChart
          transactions={allTx}
          goldValue={goldValue}
          stockValue={stockValue}
          depositValue={depositValue}
        />

        <WeeklySummary transactions={allTx} hidden={hidden} />

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

        <CreditCardDashboardSection hidden={hidden} />

        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className="space-y-3">
          <DashboardSectionHeader title="Transaksi Terbaru" actionLabel="Lihat semua" actionHref="/transactions" />
          <RecentTransactions transactions={recentTransactions} hidden={hidden} />
        </motion.section>
      </div>

      <QuickAddFAB />
      <ChatInput />
    </div>
  )
}
