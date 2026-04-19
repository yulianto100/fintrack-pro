'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useFirebaseList } from '@/hooks/useFirebaseRealtime'
import { useGoldPrices } from '@/hooks/usePrices'
import { formatCurrency, formatDate, getCurrentMonth, getProfitColor } from '@/lib/utils'
import type { Transaction, GoldHolding, StockHolding, Deposit } from '@/types'
import { TrendingUp, TrendingDown, Wallet, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { WalletCard } from '@/components/dashboard/WalletCard'
import { QuickAddFAB } from '@/components/transactions/QuickAddFAB'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'
import { PortfolioSummaryCard } from '@/components/dashboard/PortfolioSummaryCard'

export default function DashboardPage() {
  const { data: session } = useSession()
  const currentMonth = getCurrentMonth()

  const { data: transactions } = useFirebaseList<Transaction>('transactions')
  const { data: goldHoldings } = useFirebaseList<GoldHolding>('portfolio/gold')
  const { data: stocks } = useFirebaseList<StockHolding>('portfolio/stocks')
  const { data: deposits } = useFirebaseList<Deposit>('portfolio/deposits')
  const { prices: goldPrices } = useGoldPrices()

  // Monthly stats
  const monthStats = useMemo(() => {
    if (!transactions) return { income: 0, expense: 0, balance: 0 }
    const filtered = transactions.filter((t) => t.date.startsWith(currentMonth))
    const income = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { income, expense, balance: income - expense }
  }, [transactions, currentMonth])

  // Wallet balances
  const walletBalances = useMemo(() => {
    if (!transactions) return { cash: 0, bank: 0, ewallet: 0 }
    const balances = { cash: 0, bank: 0, ewallet: 0 }
    transactions.forEach((t) => {
      const sign = t.type === 'income' ? 1 : t.type === 'expense' ? -1 : 0
      if (t.type !== 'transfer') {
        balances[t.wallet as keyof typeof balances] += t.amount * sign
      } else {
        balances[t.wallet as keyof typeof balances] -= t.amount
        if (t.toWallet) balances[t.toWallet as keyof typeof balances] += t.amount
      }
    })
    return balances
  }, [transactions])

  // Total gold value
  const goldValue = useMemo(() => {
    if (!goldHoldings || !goldPrices) return 0
    return goldHoldings.reduce((sum, h) => {
      const price = goldPrices[h.source]?.sellPrice || 0
      return sum + h.grams * price
    }, 0)
  }, [goldHoldings, goldPrices])

  // Total deposit value
  const depositValue = useMemo(() => {
    if (!deposits) return 0
    return deposits.filter((d) => d.status === 'active').reduce((s, d) => s + d.nominal, 0)
  }, [deposits])

  const totalWealth =
    walletBalances.cash + walletBalances.bank + walletBalances.ewallet + goldValue + depositValue

  const firstName = session?.user?.name?.split(' ')[0] || 'User'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Selamat pagi' : hour < 17 ? 'Selamat siang' : 'Selamat malam'

  return (
    <div className="px-4 py-6 space-y-6 max-w-2xl mx-auto">
      {/* Header greeting */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{greeting},</p>
        <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>
          {firstName} 👋
        </h1>
      </motion.div>

      {/* Total wealth hero card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="glass-card p-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(16,163,74,0.05) 100%)',
          borderColor: 'rgba(34,197,94,0.2)',
        }}
      >
        {/* Glow effect */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'rgba(34,197,94,0.1)' }} />
        
        <p className="text-sm font-medium mb-1" style={{ color: 'rgba(34,197,94,0.8)' }}>
          Total Kekayaan Bersih
        </p>
        <p className="text-3xl font-display font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          {formatCurrency(totalWealth)}
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--accent-dim)' }}>
              <TrendingUp size={13} color="var(--accent)" />
            </div>
            <div>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Pemasukan</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                {formatCurrency(monthStats.income)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--red-dim)' }}>
              <TrendingDown size={13} color="var(--red)" />
            </div>
            <div>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Pengeluaran</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--red)' }}>
                {formatCurrency(monthStats.expense)}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Wallet cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            Dompet
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <WalletCard type="cash" balance={walletBalances.cash} />
          <WalletCard type="bank" balance={walletBalances.bank} />
          <WalletCard type="ewallet" balance={walletBalances.ewallet} />
        </div>
      </motion.div>

      {/* Portfolio summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            Portofolio
          </h2>
          <Link href="/portfolio" className="flex items-center gap-1 text-xs"
            style={{ color: 'var(--accent)' }}>
            Lihat semua <ArrowRight size={12} />
          </Link>
        </div>
        <PortfolioSummaryCard
          goldValue={goldValue}
          goldGrams={goldHoldings?.reduce((s, h) => s + h.grams, 0) || 0}
          stockCount={stocks?.length || 0}
          depositValue={depositValue}
          depositCount={deposits?.filter((d) => d.status === 'active').length || 0}
        />
      </motion.div>

      {/* Recent transactions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            Transaksi Terbaru
          </h2>
          <Link href="/transactions" className="flex items-center gap-1 text-xs"
            style={{ color: 'var(--accent)' }}>
            Lihat semua <ArrowRight size={12} />
          </Link>
        </div>
        <RecentTransactions transactions={(transactions || []).slice(0, 5)} />
      </motion.div>

      {/* Spacer for FAB */}
      <div className="h-6" />
      <QuickAddFAB />
    </div>
  )
}
