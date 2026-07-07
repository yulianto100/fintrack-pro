/**
 * lib/budget-pace.ts
 * Daily-spend pace guard for monthly budgets.
 * Pure functions; UI lives in components/dashboard/BudgetPaceGuard.tsx.
 *
 * Exported:
 *  getBudgetPace() — projects month-end spend per budget and flags over-pace items.
 */
import type { Transaction, BudgetStatus } from '@/types'
import { isExpenseForSummary } from '@/lib/transaction-rules'

export type PaceStatus = 'on_track' | 'warn' | 'over_pace' | 'critical' | 'no_data'

export interface BudgetPace {
  budgetId: string
  categoryId: string
  categoryName: string
  categoryIcon: string
  categoryColor: string
  limitAmount: number
  spent: number
  daysElapsed: number
  daysRemaining: number
  dailyBudget: number
  projectedSpend: number
  projectedOver: number
  status: PaceStatus
  message: string
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function ymFromBudget(month: string): { y: number; m: number } {
  const [y, m] = month.split('-').map(Number)
  return { y, m: m - 1 }
}

export function getBudgetPace(budgets: BudgetStatus[], transactions: Transaction[], now: Date = new Date()): BudgetPace[] {
  if (budgets.length === 0) return []

  const todayYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const dayOfMonth = now.getDate()
  const currentMonthBudgets = budgets.filter((b) => !b.month || b.month === todayYM)
  if (currentMonthBudgets.length === 0) return []

  const paces: BudgetPace[] = currentMonthBudgets.map((b) => {
    const { y, m } = ymFromBudget(b.month || todayYM)
    const total = daysInMonth(y, m)
    const elapsed   = Math.min(dayOfMonth, total)
    const remaining = Math.max(total - elapsed, 0)
    const dailyBudget = remaining > 0 ? Math.max((b.limitAmount - b.spent) / remaining, 0) : 0

    let projectedSpend = 0
    if (elapsed > 0) {
      const matched = transactions.filter(
        (t) => t.categoryId === b.categoryId && isExpenseForSummary(t) && t.date.startsWith(todayYM)
      )
      const realSpent = matched.reduce((s, t) => s + t.amount, 0)
      const dailyReal = realSpent / elapsed
      projectedSpend = Math.round(dailyReal * total)
    }

    const projectedOver = projectedSpend - b.limitAmount
    const overshoot = b.limitAmount > 0 ? projectedSpend / b.limitAmount : 0

    let status: PaceStatus
    if (b.limitAmount <= 0 || elapsed < 2) status = 'no_data'
    else if (overshoot >= 1.20) status = 'critical'
    else if (overshoot >= 1.00) status = 'over_pace'
    else if (overshoot >= 0.85) status = 'warn'
    else status = 'on_track'

    const message =
      status === 'on_track'
        ? `On-track. Sisa ${formatShort(b.limitAmount - b.spent)}`
        : status === 'warn'
        ? `Risiko lewat. Proyeksi lewat ${formatShort(Math.max(projectedOver, 0))}`
        : status === 'over_pace'
        ? `Pace terlalu cepat. Akan lewat ${formatShort(projectedOver)}`
        : status === 'critical'
        ? `🚨 Akan lewat ${formatShort(projectedOver)} di akhir bulan`
        : `Belum cukup data`

    return {
      budgetId: b.id,
      categoryId: b.categoryId,
      categoryName: b.categoryName || 'Kategori',
      categoryIcon: b.categoryIcon || '📋',
      categoryColor: b.categoryColor || '#22C55E',
      limitAmount: b.limitAmount,
      spent: b.spent,
      daysElapsed: elapsed,
      daysRemaining: remaining,
      dailyBudget,
      projectedSpend,
      projectedOver,
      status,
      message,
    }
  })

  return paces.sort((a, b) => {
    const order: Record<PaceStatus, number> = { critical: 0, over_pace: 1, warn: 2, on_track: 3, no_data: 4 }
    return order[a.status] - order[b.status]
  })
}

function formatShort(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${Math.round(value / 100_000) / 10}jt`
  if (abs >= 1_000) return `${Math.round(value / 100) / 10}rb`
  return String(value)
}
