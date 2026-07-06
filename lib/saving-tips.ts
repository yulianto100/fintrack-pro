/**
 * lib/saving-tips.ts
 * Personalized saving tips engine.
 * Generates contextual, actionable tips based on user's actual spending patterns.
 */

import type { Transaction, BudgetStatus, Insight } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { isExpenseForSummary } from '@/lib/transaction-rules'

// ── Types ────────────────────────────────────────────────────────────────────

export interface SavingTip {
  id: string
  icon: string
  title: string
  message: string
  potentialSaving: number
  category?: string
  actionLabel?: string
  actionHref?: string
  priority: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function ym(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getLastNMonths(n: number): string[] {
  const months: string[] = []
  for (let i = 0; i < n; i++) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    months.push(ym(d))
  }
  return months
}

function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr).getDay() // 0=Sun, 6=Sat
}

// ── Tip generators ───────────────────────────────────────────────────────────

/**
 * Tip: Weekend spending is significantly higher than weekday.
 */
function weekendSpendingTip(transactions: Transaction[]): SavingTip | null {
  const thisMonth = ym()
  const expenses = transactions.filter(
    (t) => isExpenseForSummary(t) && t.date.startsWith(thisMonth)
  )

  if (expenses.length < 10) return null

  let weekdayTotal = 0, weekdayDays = 0
  let weekendTotal = 0, weekendDays = 0

  const dayTotals: Record<string, { amount: number; isWeekend: boolean }> = {}
  for (const tx of expenses) {
    const day = tx.date.split('T')[0]
    if (!dayTotals[day]) {
      const dow = getDayOfWeek(day)
      dayTotals[day] = { amount: 0, isWeekend: dow === 0 || dow === 6 }
    }
    dayTotals[day].amount += tx.amount
  }

  for (const { amount, isWeekend } of Object.values(dayTotals)) {
    if (isWeekend) { weekendTotal += amount; weekendDays++ }
    else { weekdayTotal += amount; weekdayDays++ }
  }

  if (weekdayDays === 0 || weekendDays === 0) return null

  const avgWeekday = weekdayTotal / weekdayDays
  const avgWeekend = weekendTotal / weekendDays
  const ratio = avgWeekend / avgWeekday

  if (ratio >= 1.8 && avgWeekend >= 100_000) {
    const potentialSaving = Math.round((avgWeekend - avgWeekday) * 4) // 4 weekends/month approx
    return {
      id: 'weekend-spending',
      icon: '🎉',
      title: 'Pengeluaran weekend tinggi',
      message: `Rata-rata ${formatCurrency(avgWeekend)}/hari di weekend vs ${formatCurrency(avgWeekday)}/hari di weekday. Kurangi sedikit bisa hemat ~${formatCurrency(potentialSaving)}/bulan.`,
      potentialSaving,
      priority: 65,
      actionLabel: 'Lihat transaksi',
      actionHref: '/transactions',
    }
  }

  return null
}

/**
 * Tip: Frequent small purchases (latte factor).
 */
function latteFactor(transactions: Transaction[]): SavingTip | null {
  const thisMonth = ym()
  const expenses = transactions.filter(
    (t) => isExpenseForSummary(t) && t.date.startsWith(thisMonth)
  )

  // Find categories with many small transactions
  const catStats: Record<string, { count: number; total: number; avgAmount: number }> = {}

  for (const tx of expenses) {
    const cat = tx.categoryName || 'Lainnya'
    if (!catStats[cat]) catStats[cat] = { count: 0, total: 0, avgAmount: 0 }
    catStats[cat].count++
    catStats[cat].total += tx.amount
  }

  for (const stat of Object.values(catStats)) {
    stat.avgAmount = stat.total / stat.count
  }

  // Find category with high frequency + low avg amount
  const latteCategory = Object.entries(catStats)
    .filter(([, stat]) => stat.count >= 8 && stat.avgAmount <= 75_000 && stat.total >= 200_000)
    .sort((a, b) => b[1].total - a[1].total)[0]

  if (latteCategory) {
    const [catName, stat] = latteCategory
    const reducedAmount = Math.round(stat.total * 0.3) // suggest 30% reduction
    return {
      id: 'latte-factor',
      icon: '☕',
      title: `${catName}: ${stat.count}x transaksi kecil`,
      message: `Total ${formatCurrency(stat.total)} bulan ini dari ${stat.count} transaksi (avg ${formatCurrency(stat.avgAmount)}). Kurangi 30% bisa hemat ~${formatCurrency(reducedAmount)}/bulan.`,
      potentialSaving: reducedAmount,
      category: catName,
      priority: 60,
      actionLabel: 'Lihat kategori',
      actionHref: '/transactions',
    }
  }

  return null
}

/**
 * Tip: Category growing month over month.
 */
function growingCategoryTip(transactions: Transaction[]): SavingTip | null {
  const months = getLastNMonths(3)
  if (months.length < 3) return null

  const catByMonth: Record<string, number[]> = {}

  for (let i = 0; i < months.length; i++) {
    const monthExpenses = transactions.filter(
      (t) => isExpenseForSummary(t) && t.date.startsWith(months[i])
    )
    for (const tx of monthExpenses) {
      const cat = tx.categoryName || 'Lainnya'
      if (!catByMonth[cat]) catByMonth[cat] = Array(months.length).fill(0)
      catByMonth[cat][i] += tx.amount
    }
  }

  // Find category that's been growing for 3 consecutive months
  for (const [cat, amounts] of Object.entries(catByMonth)) {
    const [thisM, lastM, twoMAgo] = amounts
    if (thisM > lastM && lastM > twoMAgo && twoMAgo > 0 && thisM >= 200_000) {
      const growthRate = ((thisM - twoMAgo) / twoMAgo) * 100
      if (growthRate >= 40) {
        const potentialSaving = Math.round(thisM - twoMAgo)
        return {
          id: `growing-${cat.toLowerCase().replace(/\s/g, '-')}`,
          icon: '📈',
          title: `${cat} terus naik 3 bulan berturut`,
          message: `Dari ${formatCurrency(twoMAgo)} → ${formatCurrency(lastM)} → ${formatCurrency(thisM)}. Tren naik ${growthRate.toFixed(0)}%. Evaluasi kebutuhan di kategori ini.`,
          potentialSaving,
          category: cat,
          priority: 72,
          actionLabel: 'Lihat tren',
          actionHref: '/transactions',
        }
      }
    }
  }

  return null
}

/**
 * Tip: Suggest 50/30/20 rule if not followed.
 */
function budgetRuleTip(transactions: Transaction[]): SavingTip | null {
  const thisMonth = ym()
  const income = transactions
    .filter((t) => t.type === 'income' && t.date.startsWith(thisMonth))
    .reduce((s, t) => s + t.amount, 0)

  const expense = transactions
    .filter((t) => isExpenseForSummary(t) && t.date.startsWith(thisMonth))
    .reduce((s, t) => s + t.amount, 0)

  if (income === 0) return null

  const expenseRatio = expense / income
  const savingsRatio = 1 - expenseRatio

  // If spending > 80% of income
  if (expenseRatio > 0.8 && expense >= 1_000_000) {
    const idealExpense = income * 0.7 // 70% for needs+wants
    const potentialSaving = Math.round(expense - idealExpense)
    return {
      id: 'budget-rule',
      icon: '🎯',
      title: 'Pengeluaran melebihi 80% pemasukan',
      message: `Kamu menghabiskan ${(expenseRatio * 100).toFixed(0)}% dari pemasukan. Idealnya max 70-80% untuk kebutuhan, sisanya ditabung. Target hemat: ${formatCurrency(potentialSaving)}/bulan.`,
      potentialSaving: potentialSaving > 0 ? potentialSaving : 0,
      priority: 78,
      actionLabel: 'Atur budget',
      actionHref: '/goals?tab=budget',
    }
  }

  // If savings rate is good, encourage
  if (savingsRatio >= 0.3) {
    return {
      id: 'savings-great',
      icon: '🏆',
      title: `Tabungan ${(savingsRatio * 100).toFixed(0)}% — luar biasa!`,
      message: `Kamu menabung ${formatCurrency(income - expense)} bulan ini. Pertahankan dan pertimbangkan investasi untuk uang yang menganggur.`,
      potentialSaving: 0,
      priority: 30,
      actionLabel: 'Lihat investasi',
      actionHref: '/portfolio',
    }
  }

  return null
}

/**
 * Tip: Subscription/recurring spending awareness.
 */
function subscriptionTip(transactions: Transaction[]): SavingTip | null {
  const thisMonth = ym()
  const lastMonth = (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return ym(d) })()

  // Find transactions that appear in both months with similar amounts (likely subscriptions)
  const thisExpenses = transactions.filter(
    (t) => isExpenseForSummary(t) && t.date.startsWith(thisMonth)
  )
  const lastExpenses = transactions.filter(
    (t) => isExpenseForSummary(t) && t.date.startsWith(lastMonth)
  )

  const thisDescs = new Map<string, number>()
  const lastDescs = new Map<string, number>()

  for (const tx of thisExpenses) {
    const key = (tx.description || '').toLowerCase().trim()
    if (key.length >= 3) thisDescs.set(key, (thisDescs.get(key) || 0) + tx.amount)
  }
  for (const tx of lastExpenses) {
    const key = (tx.description || '').toLowerCase().trim()
    if (key.length >= 3) lastDescs.set(key, (lastDescs.get(key) || 0) + tx.amount)
  }

  // Find recurring items (same description, similar amount ±20%)
  let recurringTotal = 0
  let recurringCount = 0

  for (const [desc, amount] of thisDescs) {
    const lastAmount = lastDescs.get(desc)
    if (lastAmount && Math.abs(amount - lastAmount) / lastAmount <= 0.2) {
      recurringTotal += amount
      recurringCount++
    }
  }

  if (recurringCount >= 3 && recurringTotal >= 200_000) {
    return {
      id: 'subscription-awareness',
      icon: '🔄',
      title: `${recurringCount} langganan rutin: ${formatCurrency(recurringTotal)}/bulan`,
      message: `Kamu punya ${recurringCount} pengeluaran berulang setiap bulan. Review apakah semua masih dibutuhkan.`,
      potentialSaving: Math.round(recurringTotal * 0.2), // assume 20% could be cut
      priority: 55,
      actionLabel: 'Lihat recurring',
      actionHref: '/recurring',
    }
  }

  return null
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Generate personalized saving tips based on transaction history.
 */
export function generateSavingTips(
  transactions: Transaction[],
  budgets?: BudgetStatus[]
): SavingTip[] {
  const tips: (SavingTip | null)[] = [
    weekendSpendingTip(transactions),
    latteFactor(transactions),
    growingCategoryTip(transactions),
    budgetRuleTip(transactions),
    subscriptionTip(transactions),
  ]

  return tips
    .filter((tip): tip is SavingTip => tip !== null)
    .sort((a, b) => b.priority - a.priority)
}

/**
 * Convert saving tips to Insight format for SmartInsights component.
 */
export function savingTipsToInsights(tips: SavingTip[]): Insight[] {
  return tips.map((tip) => ({
    type: tip.potentialSaving > 0 ? 'info' as const : 'success' as const,
    icon: 'lightbulb',
    title: `💡 ${tip.title}`,
    message: tip.message,
    actionLabel: tip.actionLabel,
    actionHref: tip.actionHref,
    priority: tip.priority,
  }))
}
