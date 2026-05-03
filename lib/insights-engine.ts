/**
 * lib/insights-engine.ts
 * Smart Finance Coach — standalone utility functions.
 * These pure functions can be called anywhere; UI lives in SmartInsights.tsx.
 *
 * Exported:
 *  getSpendingTrend()       — compare this vs last month
 *  getTopCategories()       — rank categories by spend
 *  getSavingsRate()         — savings % this month
 *  predictBalanceDepletion() — days until cash runs out
 */
import type { Transaction, BudgetStatus } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { isExpenseForSummary } from '@/lib/transaction-rules'

// ── Internal helpers ─────────────────────────────────────────────────────────

function ym(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function prevYM(): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  return ym(d)
}

function sumBy(txs: Transaction[], type: string, month?: string): number {
  return txs
    .filter((t) => (type === 'expense' ? isExpenseForSummary(t) : t.type === type) && (!month || t.date.startsWith(month)))
    .reduce((s, t) => s + t.amount, 0)
}

// ── Public utility functions ─────────────────────────────────────────────────

/**
 * Returns the spending trend compared to last month.
 * Positive diff = spending increased. Negative = decreased.
 */
export interface SpendingTrend {
  thisMonth: number
  lastMonth: number
  diffAmount: number
  diffPercent: number
  direction: 'up' | 'down' | 'same'
  label: string
}

export function getSpendingTrend(transactions: Transaction[]): SpendingTrend {
  const thisM = ym()
  const lastM = prevYM()
  const thisMonth = sumBy(transactions, 'expense', thisM)
  const lastMonth = sumBy(transactions, 'expense', lastM)
  const diffAmount  = thisMonth - lastMonth
  const diffPercent = lastMonth > 0 ? (diffAmount / lastMonth) * 100 : 0
  const direction   = diffAmount > 0 ? 'up' : diffAmount < 0 ? 'down' : 'same'

  const label =
    direction === 'up'
      ? `Pengeluaran naik ${Math.abs(diffPercent).toFixed(0)}% (${formatCurrency(Math.abs(diffAmount))}) dari bulan lalu`
      : direction === 'down'
      ? `Pengeluaran turun ${Math.abs(diffPercent).toFixed(0)}% (${formatCurrency(Math.abs(diffAmount))}) dari bulan lalu`
      : 'Pengeluaran sama dengan bulan lalu'

  return { thisMonth, lastMonth, diffAmount, diffPercent, direction, label }
}

/**
 * Returns top expense categories this month, sorted by spend descending.
 */
export interface CategoryStat {
  categoryName: string
  categoryIcon: string
  amount: number
  percent: number
  transactionCount: number
  lastMonthAmount: number
  trend: 'up' | 'down' | 'same'
  trendPercent: number
}

export function getTopCategories(
  transactions: Transaction[],
  limit = 5
): CategoryStat[] {
  const thisM = ym()
  const lastM = prevYM()

  const thisExpenses = transactions.filter((t) => isExpenseForSummary(t) && t.date.startsWith(thisM))
  const lastExpenses = transactions.filter((t) => isExpenseForSummary(t) && t.date.startsWith(lastM))

  const thisTotal = thisExpenses.reduce((s, t) => s + t.amount, 0)

  // Build this month map
  const thisMap: Record<string, { amount: number; count: number; icon: string }> = {}
  for (const t of thisExpenses) {
    const k = t.categoryName || 'Lainnya'
    if (!thisMap[k]) thisMap[k] = { amount: 0, count: 0, icon: t.categoryIcon || '📋' }
    thisMap[k].amount += t.amount
    thisMap[k].count++
  }

  // Build last month map
  const lastMap: Record<string, number> = {}
  for (const t of lastExpenses) {
    const k = t.categoryName || 'Lainnya'
    lastMap[k] = (lastMap[k] || 0) + t.amount
  }

  return Object.entries(thisMap)
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, limit)
    .map(([name, data]) => {
      const lastMonthAmount = lastMap[name] || 0
      const diff            = data.amount - lastMonthAmount
      const trendPercent    = lastMonthAmount > 0 ? (diff / lastMonthAmount) * 100 : 0
      const trend           = diff > 0 ? 'up' : diff < 0 ? 'down' : 'same'
      return {
        categoryName:     name,
        categoryIcon:     data.icon,
        amount:           data.amount,
        percent:          thisTotal > 0 ? (data.amount / thisTotal) * 100 : 0,
        transactionCount: data.count,
        lastMonthAmount,
        trend,
        trendPercent,
      }
    })
}

/**
 * Returns the savings rate for the current month.
 */
export interface SavingsRate {
  income: number
  expense: number
  saved: number
  rate: number        // percentage
  label: string
  status: 'excellent' | 'good' | 'low' | 'negative'
}

export function getSavingsRate(transactions: Transaction[]): SavingsRate {
  const thisM   = ym()
  const income  = sumBy(transactions, 'income',  thisM)
  const expense = sumBy(transactions, 'expense', thisM)
  const saved   = income - expense
  const rate    = income > 0 ? (saved / income) * 100 : 0

  const status: SavingsRate['status'] =
    rate >= 30 ? 'excellent' :
    rate >= 10 ? 'good'      :
    rate >= 0  ? 'low'       : 'negative'

  const label =
    status === 'excellent' ? `Luar biasa! Kamu menabung ${rate.toFixed(0)}% dari pemasukan.` :
    status === 'good'      ? `Bagus! Tabungan ${rate.toFixed(0)}% dari pemasukan bulan ini.`  :
    status === 'low'       ? `Tabungan hanya ${rate.toFixed(0)}%. Coba kurangi pengeluaran.`  :
                             `Pengeluaran melebihi pemasukan sebesar ${formatCurrency(Math.abs(saved))}.`

  return { income, expense, saved, rate, label, status }
}

/**
 * Predicts how many days until cash balance runs out at current spending rate.
 * Returns null if spending is 0 or balance is already 0.
 */
export interface BalancePrediction {
  daysRemaining: number | null
  dailySpend: number
  walletTotal: number
  willRunOut: boolean
  estimatedDate: string | null
  label: string
}

export function predictBalanceDepletion(
  transactions: Transaction[],
  walletTotal: number
): BalancePrediction {
  const thisM      = ym()
  const now        = new Date()
  const dayOfMonth = now.getDate()

  const thisExpense = sumBy(transactions, 'expense', thisM)
  const dailySpend  = dayOfMonth > 0 ? thisExpense / dayOfMonth : 0

  if (dailySpend <= 0 || walletTotal <= 0) {
    return {
      daysRemaining: null, dailySpend, walletTotal,
      willRunOut: false, estimatedDate: null,
      label: 'Tidak cukup data untuk prediksi.',
    }
  }

  const daysRemaining = Math.floor(walletTotal / dailySpend)
  const estimatedDate = new Date(now)
  estimatedDate.setDate(now.getDate() + daysRemaining)
  const dateStr = estimatedDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

  const willRunOut = daysRemaining < 30

  const label =
    daysRemaining < 7
      ? `⚠️ Saldo habis dalam ${daysRemaining} hari (sekitar ${dateStr})! Kurangi pengeluaran segera.`
      : daysRemaining < 30
      ? `Dengan pengeluaran saat ini, saldo habis dalam ~${daysRemaining} hari (${dateStr}).`
      : `Saldo cukup untuk ~${daysRemaining} hari ke depan. Dana darurat aman.`

  return { daysRemaining, dailySpend, walletTotal, willRunOut, estimatedDate: dateStr, label }
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-export generateAllInsights from insight-engine so both paths work
// ─────────────────────────────────────────────────────────────────────────────
export { generateAllInsights, type InsightEngineProps } from '@/lib/insight-engine'
