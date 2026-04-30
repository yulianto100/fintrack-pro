/**
 * lib/goals-finance.ts
 * Unified Goals & Budget financial planning logic.
 *
 * Exports:
 *  calculateGoalProgress()   — progress %, remaining, estimated completion
 *  calculateBudgetUsage()    — status (safe/warning/over), colors, label
 *  generateInsights()        — rule-based smart insights across Goals + Budget
 *  getMonthlyNetSavings()    — helper: net savings from transactions
 */

import type { Goal, BudgetStatus, Transaction } from '@/types'
import { formatCurrency } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export type InsightType = 'danger' | 'warning' | 'success' | 'info'

export interface FinanceInsight {
  id: string
  type: InsightType
  icon: string
  title: string
  message: string
  /** Which domain this insight belongs to — used for filtering */
  category: 'goal' | 'budget' | 'cross' | 'trend'
}

export interface GoalProgress {
  /** 0–100 */
  percentage: number
  remaining: number
  isCompleted: boolean
  /** null when no monthly contribution data is available */
  estimatedMonths: number | null
  estimatedLabel: string
}

export interface BudgetUsage {
  status: 'safe' | 'warning' | 'over'
  /** CSS color string */
  color: string
  bgColor: string
  percentage: number
  remainingLabel: string
}

// ─────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────

function ym(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function prevYm(): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  return ym(d)
}

function sumTx(
  txs: Transaction[],
  type: 'income' | 'expense',
  month?: string
): number {
  return txs
    .filter((t) => t.type === type && (!month || t.date.startsWith(month)))
    .reduce((s, t) => s + t.amount, 0)
}

// ─────────────────────────────────────────────────────────────
// PUBLIC: MONTHLY NET SAVINGS
// ─────────────────────────────────────────────────────────────

/**
 * Returns net savings (income − expense) for the current month.
 * Returns 0 if transactions are not yet loaded.
 */
export function getMonthlyNetSavings(transactions: Transaction[]): number {
  const m = ym()
  const income  = sumTx(transactions, 'income',  m)
  const expense = sumTx(transactions, 'expense', m)
  return Math.max(0, income - expense)
}

/** Same as getMonthlyNetSavings but for the previous month. */
export function getPrevMonthNetSavings(transactions: Transaction[]): number {
  const m = prevYm()
  const income  = sumTx(transactions, 'income',  m)
  const expense = sumTx(transactions, 'expense', m)
  return Math.max(0, income - expense)
}

// ─────────────────────────────────────────────────────────────
// PUBLIC: CALCULATE GOAL PROGRESS
// ─────────────────────────────────────────────────────────────

/**
 * Derives all UI-facing progress fields for a single goal.
 *
 * @param goal                The goal record.
 * @param monthlyContribution Optional. If provided, calculates an ETA.
 */
export function calculateGoalProgress(
  goal: Goal,
  monthlyContribution?: number
): GoalProgress {
  const percentage = goal.targetAmount > 0
    ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
    : 0

  const remaining   = Math.max(0, goal.targetAmount - goal.currentAmount)
  const isCompleted = goal.currentAmount >= goal.targetAmount

  let estimatedMonths: number | null = null
  let estimatedLabel = ''

  if (!isCompleted && monthlyContribution && monthlyContribution > 0 && remaining > 0) {
    estimatedMonths = Math.ceil(remaining / monthlyContribution)

    if (estimatedMonths <= 1) {
      estimatedLabel = 'Kurang dari 1 bulan lagi!'
    } else if (estimatedMonths <= 12) {
      estimatedLabel = `≈ ${estimatedMonths} bulan lagi`
    } else {
      const years  = Math.floor(estimatedMonths / 12)
      const months = estimatedMonths % 12
      estimatedLabel = months > 0
        ? `≈ ${years} thn ${months} bln lagi`
        : `≈ ${years} tahun lagi`
    }
  }

  return { percentage, remaining, isCompleted, estimatedMonths, estimatedLabel }
}

// ─────────────────────────────────────────────────────────────
// PUBLIC: CALCULATE BUDGET USAGE
// ─────────────────────────────────────────────────────────────

/**
 * Derives all UI-facing usage fields for a single budget entry.
 * Color thresholds: <70% green, 70–99% orange, ≥100% red.
 */
export function calculateBudgetUsage(budget: BudgetStatus): BudgetUsage {
  const percentage = budget.limitAmount > 0
    ? Math.min(100, (budget.spent / budget.limitAmount) * 100)
    : 0

  let status: BudgetUsage['status']
  let color: string
  let bgColor: string

  if (percentage >= 100) {
    status  = 'over'
    color   = 'var(--red)'
    bgColor = 'rgba(239,68,68,0.08)'
  } else if (percentage >= 70) {
    status  = 'warning'
    color   = '#f97316'
    bgColor = 'rgba(249,115,22,0.08)'
  } else {
    status  = 'safe'
    color   = 'var(--accent)'
    bgColor = 'var(--accent-dim)'
  }

  const remainingLabel = budget.remaining >= 0
    ? `Sisa ${formatCurrency(budget.remaining)}`
    : `Lebih ${formatCurrency(-budget.remaining)}`

  return { status, color, bgColor, percentage, remainingLabel }
}

// ─────────────────────────────────────────────────────────────
// PUBLIC: GENERATE INSIGHTS
// ─────────────────────────────────────────────────────────────

/**
 * Generates a list of smart financial insights from Goals, Budgets,
 * and Transactions using rule-based logic only — no external AI API.
 *
 * Rules implemented:
 *   1. Budget over limit           → danger
 *   2. Budget near limit (70-99%)  → warning
 *   3. Many safe budgets           → success
 *   4. Goal completed              → success
 *   5. Goal near completion (≥80%) → info
 *   6. Cross-connection insight:
 *      "Reduce X budget → reach Y goal faster" → info
 *   7. Savings trend up vs prev month  → success
 *   8. Savings trend down vs prev month → warning
 *   9. No goals yet                → info prompt
 */
export function generateInsights(
  goals: Goal[],
  budgets: BudgetStatus[],
  transactions: Transaction[]
): FinanceInsight[] {
  const insights: FinanceInsight[] = []

  const thisMonthSavings = getMonthlyNetSavings(transactions)
  const prevMonthSavings = getPrevMonthNetSavings(transactions)

  // ── 1 & 2: Budget status ────────────────────────────────
  const overBudgets    = budgets.filter((b) => b.percent >= 100)
  const warningBudgets = budgets.filter((b) => b.percent >= 70 && b.percent < 100)
  const safeBudgets    = budgets.filter((b) => b.percent < 50 && b.limitAmount > 0)

  overBudgets.forEach((b) => {
    insights.push({
      id:       `budget-over-${b.id}`,
      type:     'danger',
      icon:     '⚠️',
      title:    'Budget Terlampaui!',
      message:  `Budget ${b.categoryName} sudah melebihi limit ${formatCurrency(-b.remaining)}. Segera tinjau pengeluaranmu.`,
      category: 'budget',
    })
  })

  warningBudgets.slice(0, 2).forEach((b) => {
    insights.push({
      id:       `budget-warn-${b.id}`,
      type:     'warning',
      icon:     '🔥',
      title:    'Budget Hampir Habis',
      message:  `Budget ${b.categoryName} sudah ${b.percent.toFixed(0)}% terpakai. Sisa hanya ${formatCurrency(b.remaining)}.`,
      category: 'budget',
    })
  })

  // ── 3: Safe budgets ─────────────────────────────────────
  if (safeBudgets.length >= 2 && overBudgets.length === 0) {
    insights.push({
      id:       'budget-safe',
      type:     'success',
      icon:     '✅',
      title:    'Pengeluaran Terkontrol',
      message:  `${safeBudgets.length} kategori masih aman dari batas budget bulan ini. Pertahankan!`,
      category: 'budget',
    })
  }

  // ── 4: Completed goals ───────────────────────────────────
  const completedGoals = goals.filter((g) => g.currentAmount >= g.targetAmount)
  if (completedGoals.length > 0) {
    insights.push({
      id:       'goal-completed',
      type:     'success',
      icon:     '🎉',
      title:    `Goal Tercapai!`,
      message:  `${completedGoals.map((g) => `${g.icon} ${g.title}`).join(' & ')} sudah 100% tercapai. Luar biasa! 🚀`,
      category: 'goal',
    })
  }

  // ── 5: Near-complete goals ───────────────────────────────
  const nearGoals = goals.filter((g) => {
    const pct = g.targetAmount > 0 ? g.currentAmount / g.targetAmount * 100 : 0
    return pct >= 80 && pct < 100
  })
  nearGoals.slice(0, 2).forEach((g) => {
    const pct     = (g.currentAmount / g.targetAmount * 100).toFixed(0)
    const remain  = g.targetAmount - g.currentAmount
    insights.push({
      id:       `goal-near-${g.id}`,
      type:     'info',
      icon:     '📈',
      title:    'Goal Hampir Tercapai!',
      message:  `${g.icon} ${g.title} sudah ${pct}%! Kurang ${formatCurrency(remain)} lagi untuk sampai tujuan.`,
      category: 'goal',
    })
  })

  // ── 6: Cross-connection (budget ↔ goal) ──────────────────
  const activeGoals   = goals.filter((g) => g.currentAmount < g.targetAmount)
  const notOverBudgets = budgets.filter((b) => b.percent < 100 && b.limitAmount > 1_000_000)

  if (activeGoals.length > 0 && notOverBudgets.length > 0 && thisMonthSavings > 0) {
    // Find the biggest-spend budget that still has room
    const bigBudget = notOverBudgets.sort((a, b) => b.limitAmount - a.limitAmount)[0]
    const targetGoal = activeGoals[0]
    const remain     = targetGoal.targetAmount - targetGoal.currentAmount

    const reduction        = bigBudget.limitAmount * 0.2          // 20% reduction
    const currentEstimate  = Math.ceil(remain / thisMonthSavings)
    const newEstimate      = Math.ceil(remain / (thisMonthSavings + reduction))
    const monthsSaved      = Math.max(0, currentEstimate - newEstimate)

    if (monthsSaved >= 1) {
      insights.push({
        id:       'cross-budget-goal',
        type:     'info',
        icon:     '💡',
        title:    'Tips Capai Goal Lebih Cepat',
        message:  `Kurangi anggaran ${bigBudget.categoryName} 20% (${formatCurrency(reduction)}), ` +
                  `kamu bisa capai "${targetGoal.title}" ${monthsSaved} bulan lebih cepat!`,
        category: 'cross',
      })
    }
  }

  // ── 7 & 8: Savings trend ─────────────────────────────────
  if (prevMonthSavings > 0 && thisMonthSavings > 0) {
    const diff    = thisMonthSavings - prevMonthSavings
    const diffPct = Math.abs((diff / prevMonthSavings) * 100)

    if (diff > 0 && diffPct >= 10) {
      insights.push({
        id:       'trend-savings-up',
        type:     'success',
        icon:     '📈',
        title:    'Tabungan Meningkat',
        message:  `Tabungan bulan ini naik ${diffPct.toFixed(0)}% dari bulan lalu. Konsisten, kamu makin hebat! 💪`,
        category: 'trend',
      })
    } else if (diff < 0 && diffPct >= 10) {
      insights.push({
        id:       'trend-savings-down',
        type:     'warning',
        icon:     '⚠️',
        title:    'Tabungan Menurun',
        message:  `Tabungan bulan ini turun ${diffPct.toFixed(0)}% dari bulan lalu. Yuk tinjau pengeluaran kamu!`,
        category: 'trend',
      })
    }
  }

  // ── 9: No goals prompt ───────────────────────────────────
  if (goals.length === 0) {
    insights.push({
      id:       'no-goals-prompt',
      type:     'info',
      icon:     '🎯',
      title:    'Buat Goal Pertamamu',
      message:  'Rencanakan masa depan dengan menetapkan financial goal. Tujuan yang jelas = motivasi lebih kuat!',
      category: 'goal',
    })
  }

  return insights
}
