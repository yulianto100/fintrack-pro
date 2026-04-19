'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useApiList } from '@/hooks/useApiData'
import { useGoldPrices } from '@/hooks/usePrices'
import { formatCurrency, getCurrentMonth } from '@/lib/utils'
import type { Transaction, GoldHolding, StockHolding, Deposit } from '@/types'
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { WalletCard } from '@/components/dashboard/WalletCard'
import { QuickAddFAB } from '@/components/transactions/QuickAddFAB'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'
import { PortfolioSummaryCard } from '@/components/dashboard/PortfolioSummaryCard'

export default function DashboardPage() {
  const { data: session } = useSession()
  const currentMonth = getCurrentMonth()

  // All data via API — no Firebase client dependency
  const { data: transactions } = useApiList<Transaction>(`/api/transactions?month=${currentMonth}&limit=200`, { refreshMs: 8000 })
  const { data: goldHoldings }  = useApiList<GoldHolding>('/api/portfolio/gold',          { refreshMs: 30000 })
  const { data: stocks }        = useApiList<StockHolding>('/api/portfolio/stocks',        { refreshMs: 30000 })
  const { data: deposits }      = useApiList<Deposit>('/api/portfolio/deposits?status=all',{ refreshMs: 30000 })
  const { prices: goldPrices }  = useGoldPrices()

  const monthStats = useMemo(() => {
    const income  = transactions.filter((t) => t.type === 'income') .reduce((s, t) => s + t.amount, 0)
    const expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { income, expense, balance: income - expense }
  }, [transactions])

  const walletBalances = useMemo(() => {
    const b = { cash: 0, bank: 0, ewallet: 0 }
    transactions.forEach((t) => {
      if (t.type === 'income')   b[t.wallet as keyof typeof b] += t.amount
      else if (t.type === 'expense') b[t.wallet as keyof typeof b] -= t.amount
      else { b[t.wallet as keyof typeof b] -= t.amount; if (t.toWallet) b[t.toWallet as keyof typeof b] += t.amount }
    })
    return b
  }, [transactions])

  const goldValue = useMemo(() =>
    goldHoldings.reduce((s, h) => s + h.grams * (goldPrices?.[h.source]?.sellPrice || 0), 0),
    [goldHoldings, goldPrices]
  )

  const depositValue = useMemo(() =>
    deposits.filter((d) => d.status === 'active').reduce((s, d) => s + d.nominal, 0),
    [deposits]
  )

  const totalWealth = walletBalances.cash + walletBalances.bank + walletBalances.ewallet + goldValue + depositValue
  const firstName   = session?.user?.name?.split(' ')[0] || 'User'
  const hour        = new Date().getHours()
  const greeting    = hour < 12 ? 'Selamat pagi' : hour < 17 ? 'Selamat siang' : 'Selamat malam'

  return (
    <div className="px-4 py-6 space-y-5 max-w-2xl mx-auto">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{greeting},</p>
        <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>
          {firstName} 👋
        </h1>
      </motion.div>

      {/* Total wealth hero */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6 relative overflow-hidden"
        style={{ borderColor: 'rgba(34,197,94,0.25)' }}
      >
        <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'rgba(34,197,94,0.08)' }} />
        <p className="text-xs font-medium mb-1" style={{ color: 'rgba(34,197,94,0.7)' }}>Total Kekayaan Bersih</p>
        <p className="text-3xl font-display font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          {formatCurrency(totalWealth)}
        </p>
        <div className="flex items-center gap-5">
          {[
            { label: 'Pemasukan',  value: monthStats.income,  color: 'var(--accent)', icon: <TrendingUp size={13}/> },
            { label: 'Pengeluaran',value: monthStats.expense, color: 'var(--red)',    icon: <TrendingDown size={13}/> },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: `${s.color}20`, color: s.color }}>{s.icon}</div>
              <div>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                <p className="text-sm font-bold font-mono" style={{ color: s.color }}>{formatCurrency(s.value)}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Wallets */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <p className="text-xs font-semibold mb-2 px-1" style={{ color: 'var(--text-muted)' }}>DOMPET</p>
        <div className="grid grid-cols-3 gap-3">
          <WalletCard type="cash"    balance={walletBalances.cash}    />
          <WalletCard type="bank"    balance={walletBalances.bank}    />
          <WalletCard type="ewallet" balance={walletBalances.ewallet} />
        </div>
      </motion.div>

      {/* Portfolio */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>PORTOFOLIO</p>
          <Link href="/portfolio" className="flex items-center gap-1 text-xs" style={{ color: 'var(--accent)' }}>
            Lihat semua <ArrowRight size={12}/>
          </Link>
        </div>
        <PortfolioSummaryCard
          goldValue={goldValue}
          goldGrams={goldHoldings.reduce((s, h) => s + h.grams, 0)}
          stockCount={stocks.length}
          depositValue={depositValue}
          depositCount={deposits.filter((d) => d.status === 'active').length}
        />
      </motion.div>

      {/* Recent transactions */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>TRANSAKSI TERBARU</p>
          <Link href="/transactions" className="flex items-center gap-1 text-xs" style={{ color: 'var(--accent)' }}>
            Lihat semua <ArrowRight size={12}/>
          </Link>
        </div>
        <RecentTransactions transactions={transactions.slice(0, 5)} />
      </motion.div>

      <div className="h-8" />
      <QuickAddFAB />
    </div>
  )
}
