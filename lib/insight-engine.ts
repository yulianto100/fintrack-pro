/**
 * lib/insight-engine.ts
 * Enhanced insight generation — all logic lives here, UI stays in SmartInsights.tsx
 */
import type { Transaction, GoldHolding, StockHolding, Deposit, Insight, BudgetStatus } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { isExpenseForSummary } from '@/lib/transaction-rules'

function ym(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function prevYM(): string {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return ym(d)
}

// ── helpers ──────────────────────────────────────────────────────────────────
function sumByType(txs: Transaction[], type: string, month?: string): number {
  return txs
    .filter((t) => (type === 'expense' ? isExpenseForSummary(t) : t.type === type) && (!month || t.date.startsWith(month)))
    .reduce((s, t) => s + t.amount, 0)
}

function catMap(txs: Transaction[], month: string): Record<string, number> {
  const m: Record<string, number> = {}
  txs.filter((t) => isExpenseForSummary(t) && t.date.startsWith(month)).forEach((t) => {
    const k = t.categoryName || 'Lainnya'
    m[k] = (m[k] || 0) + t.amount
  })
  return m
}

// ── main export ───────────────────────────────────────────────────────────────
export interface InsightEngineProps {
  transactions: Transaction[]
  goldHoldings: GoldHolding[]
  stocks:       StockHolding[]
  deposits:     Deposit[]
  totalWealth:  number
  goldValue:    number
  stockValue?:  number
  walletTotal?: number
  budgets?:     BudgetStatus[]
}

export function generateAllInsights(props: InsightEngineProps): Insight[] {
  const {
    transactions, goldHoldings, stocks, deposits,
    totalWealth, goldValue, stockValue = 0, walletTotal = 0, budgets = [],
  } = props

  const insights: Insight[] = []
  const thisM = ym()
  const lastM = prevYM()
  const now   = new Date()
  const dayOfMonth = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

  const thisExpense = sumByType(transactions, 'expense', thisM)
  const lastExpense = sumByType(transactions, 'expense', lastM)
  const thisIncome  = sumByType(transactions, 'income',  thisM)
  const lastIncome  = sumByType(transactions, 'income',  lastM)

  // ── 1. Month-over-month expense comparison ──
  if (lastExpense > 0 && thisExpense > 0) {
    const diff = ((thisExpense - lastExpense) / lastExpense) * 100
    if (diff > 20) {
      insights.push({ type: 'warning', icon: '📈',
        title: `Pengeluaran naik ${diff.toFixed(0)}% dari bulan lalu`,
        message: `Lebih tinggi ${formatCurrency(thisExpense - lastExpense)} dari ${formatCurrency(lastExpense)} bulan lalu. Tinjau anggaran kamu.` })
    } else if (diff < -15) {
      insights.push({ type: 'success', icon: '🎉',
        title: `Hemat ${Math.abs(diff).toFixed(0)}% dibanding bulan lalu!`,
        message: `Kamu berhasil menghemat ${formatCurrency(lastExpense - thisExpense)} dari bulan sebelumnya.` })
    }
  }

  // ── 2. Month-over-month income comparison ──
  if (lastIncome > 0 && thisIncome > lastIncome * 1.2) {
    insights.push({ type: 'success', icon: '💰',
      title: `Pemasukan naik ${(((thisIncome - lastIncome) / lastIncome) * 100).toFixed(0)}% bulan ini`,
      message: `Dari ${formatCurrency(lastIncome)} menjadi ${formatCurrency(thisIncome)}. Kerja bagus!` })
  }

  // ── 3. Anomaly Detection — category spike ──
  const thisMap = catMap(transactions, thisM)
  const lastMap = catMap(transactions, lastM)

  for (const [cat, spent] of Object.entries(thisMap)) {
    const prev = lastMap[cat] || 0
    if (prev > 0 && spent > prev * 1.5 && spent > 200_000) {
      insights.push({ type: 'warning', icon: '🔍',
        title: `Anomali: ${cat} naik ${(((spent - prev) / prev) * 100).toFixed(0)}%`,
        message: `Pengeluaran ${cat} bulan ini ${formatCurrency(spent)} vs ${formatCurrency(prev)} bulan lalu. Cek kembali.` })
    }
  }

  // ── 4. Top category share ──
  const topCat = Object.entries(thisMap).sort((a, b) => b[1] - a[1])[0]
  if (topCat && thisExpense > 0) {
    const pct = Math.round((topCat[1] / thisExpense) * 100)
    if (pct >= 40) {
      insights.push({ type: 'info', icon: '🔎',
        title: `${topCat[0]} menyerap ${pct}% pengeluaran`,
        message: `Total ${formatCurrency(topCat[1])} bulan ini. Pertimbangkan alokasi lebih merata.` })
    }
  }

  // ── 5. Savings rate ──
  if (thisIncome > 0 && thisExpense > 0) {
    const rate = ((thisIncome - thisExpense) / thisIncome) * 100
    if (rate >= 30) {
      insights.push({ type: 'success', icon: '💪',
        title: `Tabungan rate ${rate.toFixed(0)}% — luar biasa!`,
        message: `Kamu menyimpan ${formatCurrency(thisIncome - thisExpense)} dari pemasukan bulan ini.` })
    } else if (rate < 0) {
      insights.push({ type: 'warning', icon: '🚨',
        title: 'Pengeluaran melebihi pemasukan!',
        message: `Defisit ${formatCurrency(thisExpense - thisIncome)} bulan ini. Segera evaluasi budget.` })
    }
  }

  // ── 6. Savings suggestion ──
  if (thisExpense > 0 && dayOfMonth >= 7) {
    const dailyRate   = thisExpense / dayOfMonth
    const projected   = dailyRate * daysInMonth
    const potentialSave = projected - thisExpense
    if (potentialSave > 100_000 && potentialSave < thisExpense * 0.3) {
      insights.push({ type: 'info', icon: '💡',
        title: `Kamu bisa hemat ~${formatCurrency(Math.round(potentialSave / 50_000) * 50_000)} bulan ini`,
        message: `Proyeksi pengeluaran ${formatCurrency(projected)}. Kurangi sedikit setiap hari untuk mencapainya.` })
    }
  }

  // ── 7. Monthly prediction ──
  if (dayOfMonth >= 7 && thisExpense > 0) {
    const projected = (thisExpense / dayOfMonth) * daysInMonth
    if (projected > thisIncome && thisIncome > 0) {
      insights.push({ type: 'warning', icon: '📊',
        title: `Proyeksi pengeluaran ${formatCurrency(Math.round(projected / 10000) * 10000)}`,
        message: `Dengan tren saat ini, pengeluaran bulan ini bisa melebihi pemasukan ${formatCurrency(thisIncome)}.` })
    }
  }

  // ── 8. Cash runway ──
  if (thisExpense > 0 && walletTotal > 0) {
    const months = walletTotal / thisExpense
    if (months < 3) {
      insights.push({ type: 'warning', icon: '⚠️',
        title: `Kas hanya cukup ${months.toFixed(1)} bulan`,
        message: `Berdasarkan pengeluaran bulan ini. Idealnya 3–6 bulan untuk dana darurat.` })
    }
  }

  // ── 9. Budget alerts ──
  for (const b of budgets) {
    if (b.percent >= 80 && b.percent < 100) {
      insights.push({ type: 'warning', icon: '📋',
        title: `Budget ${b.categoryName || 'kategori'} ${b.percent.toFixed(0)}% terpakai`,
        message: `Sisa ${formatCurrency(b.remaining)} dari limit ${formatCurrency(b.limitAmount)} bulan ini.` })
    } else if (b.percent >= 100) {
      insights.push({ type: 'warning', icon: '🔴',
        title: `Budget ${b.categoryName || 'kategori'} habis!`,
        message: `Sudah melebihi limit ${formatCurrency(b.limitAmount)} sebesar ${formatCurrency(-b.remaining)}.` })
    }
  }

  // ── 10. Portfolio concentration ──
  if (totalWealth > 0) {
    const goldPct = (goldValue / totalWealth) * 100
    if (goldPct > 60) {
      insights.push({ type: 'warning', icon: '⚖️',
        title: `${goldPct.toFixed(0)}% aset terkonsentrasi di emas`,
        message: 'Diversifikasi ke saham atau deposito dapat mengurangi risiko.' })
    } else if (goldValue > 0 && stockValue > 0) {
      insights.push({ type: 'info', icon: '📊',
        title: 'Portofolio terdiversifikasi dengan baik',
        message: `Emas ${(goldValue / totalWealth * 100).toFixed(0)}% · Saham ${(stockValue / totalWealth * 100).toFixed(0)}% dari total aset.` })
    }
  }

  // ── 11. Deposit maturity ──
  const urgent = deposits.filter((d) => {
    if (d.status !== 'active') return false
    const days = Math.round((new Date(d.maturityDate).getTime() - Date.now()) / 86400000)
    return days >= 0 && days <= 7
  })
  if (urgent.length > 0) {
    insights.push({ type: 'warning', icon: '🔔',
      title: `${urgent.length} deposito jatuh tempo minggu ini`,
      message: `${urgent.map((d) => d.bankName).join(', ')} segera jatuh tempo.` })
  }

  // ── 12. Investment nudge ──
  if (goldHoldings.length === 0 && stocks.length === 0 && deposits.length === 0 && totalWealth > 5_000_000) {
    insights.push({ type: 'info', icon: '🚀',
      title: 'Mulai berinvestasi sekarang',
      message: 'Uangmu belum bekerja. Pertimbangkan emas, saham, atau deposito.' })
  }

  return insights.slice(0, 5)
}
