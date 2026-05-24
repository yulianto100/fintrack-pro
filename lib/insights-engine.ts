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
import type { Transaction, GoldHolding, StockHolding, Deposit, Insight, BudgetStatus } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { isExpenseForSummary } from '@/lib/transaction-rules'
import { detectAnomalies, anomaliesToInsights } from '@/lib/anomaly-detection'
import { generateSavingTips, savingTipsToInsights } from '@/lib/saving-tips'

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
// Main smart insight engine
// ─────────────────────────────────────────────────────────────────────────────
function catMap(txs: Transaction[], month: string): Record<string, number> {
  const map: Record<string, number> = {}
  txs
    .filter((t) => isExpenseForSummary(t) && t.date.startsWith(month))
    .forEach((t) => {
      const key = t.categoryName || 'Lainnya'
      map[key] = (map[key] || 0) + t.amount
    })
  return map
}

function detectCategorySpike(transactions: Transaction[]): Insight | null {
  const now = Date.now()
  const last30 = transactions.filter((t) => new Date(t.date).getTime() > now - 30 * 86400000)
  const prev3Months = transactions.filter((t) => {
    const days = (now - new Date(t.date).getTime()) / 86400000
    return days > 30 && days <= 120
  })
  const byCat30 = new Map<string, number>()
  const byCatPrev = new Map<string, number>()

  for (const tx of last30) {
    if (isExpenseForSummary(tx)) byCat30.set(tx.categoryId, (byCat30.get(tx.categoryId) || 0) + tx.amount)
  }
  for (const tx of prev3Months) {
    if (isExpenseForSummary(tx)) byCatPrev.set(tx.categoryId, (byCatPrev.get(tx.categoryId) || 0) + tx.amount)
  }

  for (const [catId, current] of byCat30) {
    const prev = byCatPrev.get(catId) || 0
    const prevAvgMonth = prev / 3
    if (prevAvgMonth > 100_000 && current > prevAvgMonth * 1.3) {
      const tx = last30.find((item) => item.categoryId === catId)
      const catName = tx?.categoryName || 'kategori'
      const pct = Math.round(((current - prevAvgMonth) / prevAvgMonth) * 100)
      return {
        type: 'warning',
        icon: 'trend-up',
        title: `Pengeluaran ${catName} naik ${pct}%`,
        message: `Bulan ini ${formatCurrency(current)}, biasanya rata-rata ${formatCurrency(Math.round(prevAvgMonth))}. Set budget untuk kontrol?`,
        actionLabel: 'Set budget',
        actionHref: `/goals?tab=budget&prefillCategory=${catId}`,
        priority: 88,
      }
    }
  }
  return null
}

function getMonthlyExpenseAverage(transactions: Transaction[]): number {
  const totals: number[] = []
  const now = new Date()

  for (let i = 0; i < 3; i++) {
    const cursor = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const month = ym(cursor)
    const total = sumBy(transactions, 'expense', month)
    if (total > 0) totals.push(total)
  }

  if (totals.length === 0) return 0
  return totals.reduce((sum, value) => sum + value, 0) / totals.length
}

function detectExtraSavings(walletTotal: number, monthlyExpenseAvg: number): Insight | null {
  if (walletTotal > monthlyExpenseAvg * 4 && monthlyExpenseAvg > 100_000) {
    const idle = walletTotal - monthlyExpenseAvg * 3
    return {
      type: 'info',
      icon: 'lightbulb',
      title: 'Saldo idle cukup besar',
      message: `${formatCurrency(idle)} bisa dialokasikan ke deposito.`,
      actionLabel: 'Buka deposito',
      actionHref: `/portfolio/deposito?prefillNominal=${Math.round(idle)}`,
      priority: 66,
    }
  }
  return null
}

function getTransactionTimestamp(tx: Transaction): number {
  const raw = tx.createdAt || tx.date
  const parsed = new Date(raw.includes('T') ? raw : `${raw}T12:00:00`).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function deriveStreakContext(transactions: Transaction[]): { streak: number; lastInputISO?: string } {
  const dates = new Set<string>()
  let latestTs = 0

  for (const tx of transactions) {
    const day = (tx.date || '').split('T')[0]
    if (day) dates.add(day)
    latestTs = Math.max(latestTs, getTransactionTimestamp(tx))
  }

  if (dates.size === 0 || latestTs <= 0) return { streak: 0 }

  const start = new Date(latestTs)
  start.setHours(0, 0, 0, 0)
  let streak = 0
  const cursor = new Date(start)

  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }

  return { streak, lastInputISO: new Date(latestTs).toISOString() }
}

function detectStreakRisk(streak: number, lastInputISO?: string): Insight | null {
  if (streak < 5 || !lastInputISO) return null
  const hoursSince = (Date.now() - new Date(lastInputISO).getTime()) / 3600000
  if (hoursSince > 16 && hoursSince < 36) {
    return {
      type: 'warning',
      icon: 'bell',
      title: `Streak ${streak} hari berisiko`,
      message: 'Catat transaksi hari ini biar streak tetap aman.',
      actionLabel: 'Catat sekarang',
      actionHref: '/?action=add',
      priority: 90,
    }
  }
  return null
}

export interface InsightEngineProps {
  transactions: Transaction[]
  goldHoldings: GoldHolding[]
  stocks: StockHolding[]
  deposits: Deposit[]
  totalWealth: number
  goldValue: number
  stockValue?: number
  walletTotal?: number
  budgets?: BudgetStatus[]
}

export function generateAllInsights(props: InsightEngineProps): Insight[] {
  const {
    transactions,
    goldHoldings,
    stocks,
    deposits,
    totalWealth,
    goldValue,
    stockValue = 0,
    walletTotal = 0,
    budgets = [],
  } = props

  const insights: Insight[] = []
  const thisM = ym()
  const lastM = prevYM()
  const now = new Date()
  const dayOfMonth = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

  const thisExpense = sumBy(transactions, 'expense', thisM)
  const lastExpense = sumBy(transactions, 'expense', lastM)
  const thisIncome = sumBy(transactions, 'income', thisM)
  const lastIncome = sumBy(transactions, 'income', lastM)

  if (lastExpense > 0 && thisExpense > 0) {
    const diff = ((thisExpense - lastExpense) / lastExpense) * 100
    if (diff > 20) {
      insights.push({
        type: 'warning',
        icon: 'trend-up',
        title: `Pengeluaran naik ${diff.toFixed(0)}% dari bulan lalu`,
        message: `Lebih tinggi ${formatCurrency(thisExpense - lastExpense)} dari ${formatCurrency(lastExpense)} bulan lalu. Tinjau anggaran kamu.`,
        actionLabel: 'Lihat laporan',
        actionHref: '/transactions',
        priority: 72,
      })
    } else if (diff < -15) {
      insights.push({
        type: 'success',
        icon: 'sparkles',
        title: `Hemat ${Math.abs(diff).toFixed(0)}% dibanding bulan lalu!`,
        message: `Kamu berhasil menghemat ${formatCurrency(lastExpense - thisExpense)} dari bulan sebelumnya.`,
        actionLabel: 'Lihat laporan',
        actionHref: '/transactions',
        priority: 36,
      })
    }
  }

  if (lastIncome > 0 && thisIncome > lastIncome * 1.2) {
    insights.push({
      type: 'success',
      icon: 'wallet',
      title: `Pemasukan naik ${(((thisIncome - lastIncome) / lastIncome) * 100).toFixed(0)}% bulan ini`,
      message: `Dari ${formatCurrency(lastIncome)} menjadi ${formatCurrency(thisIncome)}. Kerja bagus!`,
      actionLabel: 'Lihat laporan',
      actionHref: '/transactions',
      priority: 34,
    })
  }

  const thisMap = catMap(transactions, thisM)
  const lastMap = catMap(transactions, lastM)

  const categorySpike = detectCategorySpike(transactions)
  if (categorySpike) insights.push(categorySpike)

  for (const [category, spent] of Object.entries(thisMap)) {
    const prev = lastMap[category] || 0
    if (prev > 0 && spent > prev * 1.5 && spent > 200_000) {
      insights.push({
        type: 'warning',
        icon: 'search',
        title: `Anomali: ${category} naik ${(((spent - prev) / prev) * 100).toFixed(0)}%`,
        message: `Pengeluaran ${category} bulan ini ${formatCurrency(spent)} vs ${formatCurrency(prev)} bulan lalu. Cek kembali.`,
        actionLabel: 'Lihat kategori',
        actionHref: '/transactions',
        priority: 78,
      })
    }
  }

  const topCat = Object.entries(thisMap).sort((a, b) => b[1] - a[1])[0]
  if (topCat && thisExpense > 0) {
    const pct = Math.round((topCat[1] / thisExpense) * 100)
    if (pct >= 40) {
      insights.push({
        type: 'info',
        icon: 'pie-chart',
        title: `${topCat[0]} menyerap ${pct}% pengeluaran`,
        message: `Total ${formatCurrency(topCat[1])} bulan ini. Pertimbangkan alokasi lebih merata.`,
        actionLabel: 'Lihat kategori',
        actionHref: '/transactions',
        priority: 48,
      })
    }
  }

  if (thisIncome > 0 && thisExpense > 0) {
    const rate = ((thisIncome - thisExpense) / thisIncome) * 100
    if (rate >= 30) {
      insights.push({
        type: 'success',
        icon: 'badge-check',
        title: `Tabungan rate ${rate.toFixed(0)}% - luar biasa!`,
        message: `Kamu menyimpan ${formatCurrency(thisIncome - thisExpense)} dari pemasukan bulan ini.`,
        actionLabel: 'Lihat laporan',
        actionHref: '/transactions',
        priority: 38,
      })
    } else if (rate < 0) {
      insights.push({
        type: 'critical',
        icon: 'alert-triangle',
        title: 'Pengeluaran melebihi pemasukan!',
        message: `Defisit ${formatCurrency(thisExpense - thisIncome)} bulan ini. Segera evaluasi budget.`,
        actionLabel: 'Cek cashflow',
        actionHref: '/transactions',
        priority: 92,
      })
    }
  }

  if (thisExpense > 0 && dayOfMonth >= 7) {
    const dailyRate = thisExpense / dayOfMonth
    const projected = dailyRate * daysInMonth
    const potentialSave = projected - thisExpense
    if (potentialSave > 100_000 && potentialSave < thisExpense * 0.3) {
      insights.push({
        type: 'info',
        icon: 'lightbulb',
        title: `Kamu bisa hemat ~${formatCurrency(Math.round(potentialSave / 50_000) * 50_000)} bulan ini`,
        message: `Proyeksi pengeluaran ${formatCurrency(projected)}. Kurangi sedikit setiap hari untuk mencapainya.`,
        actionLabel: 'Lihat laporan',
        actionHref: '/transactions',
        priority: 44,
      })
    }
  }

  if (dayOfMonth >= 7 && thisExpense > 0) {
    const projected = (thisExpense / dayOfMonth) * daysInMonth
    if (projected > thisIncome && thisIncome > 0) {
      insights.push({
        type: 'warning',
        icon: 'bar-chart',
        title: `Proyeksi pengeluaran ${formatCurrency(Math.round(projected / 10000) * 10000)}`,
        message: `Dengan tren saat ini, pengeluaran bulan ini bisa melebihi pemasukan ${formatCurrency(thisIncome)}.`,
        actionLabel: 'Cek cashflow',
        actionHref: '/transactions',
        priority: 76,
      })
    }
  }

  if (thisExpense > 0 && walletTotal > 0) {
    const months = walletTotal / thisExpense
    if (months < 3) {
      insights.push({
        type: 'critical',
        icon: 'shield-alert',
        title: `Kas hanya cukup ${months.toFixed(1)} bulan`,
        message: `Berdasarkan pengeluaran bulan ini. Idealnya 3-6 bulan untuk dana darurat.`,
        actionLabel: 'Buat target dana darurat',
        actionHref: '/goals',
        priority: 100,
      })
    }
  }

  const extraSavings = detectExtraSavings(walletTotal, getMonthlyExpenseAverage(transactions))
  if (extraSavings) insights.push(extraSavings)

  const streakContext = deriveStreakContext(transactions)
  const streakRisk = detectStreakRisk(streakContext.streak, streakContext.lastInputISO)
  if (streakRisk) insights.push(streakRisk)

  for (const budget of budgets) {
    if (budget.percent >= 80 && budget.percent < 100) {
      insights.push({
        type: 'warning',
        icon: 'clipboard-list',
        title: `Budget ${budget.categoryName || 'kategori'} ${budget.percent.toFixed(0)}% terpakai`,
        message: `Sisa ${formatCurrency(budget.remaining)} dari limit ${formatCurrency(budget.limitAmount)} bulan ini.`,
        actionLabel: 'Kelola budget',
        actionHref: '/goals?tab=budget',
        priority: 74,
      })
    } else if (budget.percent >= 100) {
      insights.push({
        type: 'critical',
        icon: 'circle-alert',
        title: `Budget ${budget.categoryName || 'kategori'} habis!`,
        message: `Sudah melebihi limit ${formatCurrency(budget.limitAmount)} sebesar ${formatCurrency(-budget.remaining)}.`,
        actionLabel: 'Kelola budget',
        actionHref: '/goals?tab=budget',
        priority: 94,
      })
    }
  }

  if (totalWealth > 0) {
    const goldPct = (goldValue / totalWealth) * 100
    if (goldPct > 60) {
      insights.push({
        type: 'warning',
        icon: 'scale',
        title: `${goldPct.toFixed(0)}% aset terkonsentrasi di emas`,
        message: 'Diversifikasi ke saham atau deposito dapat mengurangi risiko.',
        actionLabel: 'Lihat portofolio',
        actionHref: '/portfolio',
        priority: 82,
      })
    } else if (goldValue > 0 && stockValue > 0) {
      insights.push({
        type: 'info',
        icon: 'bar-chart',
        title: 'Portofolio terdiversifikasi dengan baik',
        message: `Emas ${(goldValue / totalWealth * 100).toFixed(0)}% - Saham ${(stockValue / totalWealth * 100).toFixed(0)}% dari total aset.`,
        actionLabel: 'Lihat portofolio',
        actionHref: '/portfolio',
        priority: 32,
      })
    }
  }

  const urgentDeposits = deposits.filter((deposit) => {
    if (deposit.status !== 'active') return false
    const days = Math.round((new Date(deposit.maturityDate).getTime() - Date.now()) / 86400000)
    return days >= 0 && days <= 7
  })

  if (urgentDeposits.length > 0) {
    insights.push({
      type: 'warning',
      icon: 'bell',
      title: `${urgentDeposits.length} deposito jatuh tempo minggu ini`,
      message: `${urgentDeposits.map((deposit) => deposit.bankName).join(', ')} segera jatuh tempo.`,
      actionLabel: 'Lihat portofolio',
      actionHref: '/portfolio/deposito',
      priority: 80,
    })
  }

  if (goldHoldings.length === 0 && stocks.length === 0 && deposits.length === 0 && totalWealth > 5_000_000) {
    insights.push({
      type: 'info',
      icon: 'rocket',
      title: 'Mulai berinvestasi sekarang',
      message: 'Uangmu belum bekerja. Pertimbangkan emas, saham, atau deposito.',
      actionLabel: 'Lihat portofolio',
      actionHref: '/portfolio',
      priority: 35,
    })
  }

  const anomalies = detectAnomalies(transactions)
  insights.push(...anomaliesToInsights(anomalies))

  const tips = generateSavingTips(transactions, budgets)
  insights.push(...savingTipsToInsights(tips.slice(0, 2)))

  return insights
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
    .slice(0, 10)
}
