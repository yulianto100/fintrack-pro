import type { Transaction, GoldHolding, StockHolding, Deposit, Insight, BudgetStatus } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { isExpenseForSummary } from '@/lib/transaction-rules'
import { detectAnomalies, anomaliesToInsights } from '@/lib/anomaly-detection'
import { generateSavingTips, savingTipsToInsights } from '@/lib/saving-tips'

function ym(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function prevYM(): string {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return ym(d)
}

function sumByType(txs: Transaction[], type: string, month?: string): number {
  return txs
    .filter((t) => (type === 'expense' ? isExpenseForSummary(t) : t.type === type) && (!month || t.date.startsWith(month)))
    .reduce((sum, t) => sum + t.amount, 0)
}

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

  const thisExpense = sumByType(transactions, 'expense', thisM)
  const lastExpense = sumByType(transactions, 'expense', lastM)
  const thisIncome = sumByType(transactions, 'income', thisM)
  const lastIncome = sumByType(transactions, 'income', lastM)

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

  // ── Advanced Anomaly Detection ──────────────────────────────────────────────
  const anomalies = detectAnomalies(transactions)
  const anomalyInsights = anomaliesToInsights(anomalies)
  insights.push(...anomalyInsights)

  // ── Personalized Saving Tips ────────────────────────────────────────────────
  const tips = generateSavingTips(transactions, budgets)
  const tipInsights = savingTipsToInsights(tips.slice(0, 2)) // Max 2 tips
  insights.push(...tipInsights)

  return insights
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
    .slice(0, 10)
}
