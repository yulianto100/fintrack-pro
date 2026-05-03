/**
 * lib/prediction.ts
 * Monthly spending prediction + weekly summary generator
 */
import type { Transaction } from '@/types'
import { isExpenseForSummary } from '@/lib/transaction-rules'

function ym(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export interface MonthlyPrediction {
  projected:      number   // projected total expense for month
  dailyRate:      number   // current avg daily spend
  daysLeft:       number
  daysElapsed:    number
  daysInMonth:    number
  currentSpend:   number
  currentIncome:  number
  willExceed:     boolean
  surplus:        number   // projected income - projected expense
}

export function predictMonthlySpend(transactions: Transaction[]): MonthlyPrediction {
  const now        = new Date()
  const thisM      = ym(now)
  const dayElapsed = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeft   = daysInMonth - dayElapsed

  const monthTx = transactions.filter((t) => t.date.startsWith(thisM))
  const currentSpend  = monthTx.filter(isExpenseForSummary).reduce((s, t) => s + t.amount, 0)
  const currentIncome = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)

  const dailyRate = dayElapsed > 0 ? currentSpend / dayElapsed : 0
  const projected = dailyRate * daysInMonth

  return {
    projected:     Math.round(projected),
    dailyRate:     Math.round(dailyRate),
    daysLeft,
    daysElapsed:   dayElapsed,
    daysInMonth,
    currentSpend,
    currentIncome,
    willExceed:    projected > currentIncome && currentIncome > 0,
    surplus:       currentIncome - projected,
  }
}

export interface WeeklySummary {
  weekStart:    string   // YYYY-MM-DD
  weekEnd:      string
  income:       number
  expense:      number
  balance:      number
  txCount:      number
  topCategory:  string
  topAmount:    number
  vsLastWeek:   number   // % change in expense vs previous 7 days
}

export function generateWeeklySummary(transactions: Transaction[]): WeeklySummary {
  const now = new Date()
  now.setHours(23, 59, 59, 999)

  const weekEnd   = new Date(now)
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - 6)
  weekStart.setHours(0, 0, 0, 0)

  const prevEnd   = new Date(weekStart)
  prevEnd.setDate(prevEnd.getDate() - 1)
  const prevStart = new Date(prevEnd)
  prevStart.setDate(prevStart.getDate() - 6)
  prevStart.setHours(0, 0, 0, 0)

  const inRange = (t: Transaction, s: Date, e: Date) => {
    const d = new Date(t.date)
    return d >= s && d <= e
  }

  const thisWeekTx = transactions.filter((t) => inRange(t, weekStart, weekEnd))
  const prevWeekTx = transactions.filter((t) => inRange(t, prevStart, prevEnd))

  const income  = thisWeekTx.filter((t) => t.type === 'income') .reduce((s, t) => s + t.amount, 0)
  const expense = thisWeekTx.filter(isExpenseForSummary).reduce((s, t) => s + t.amount, 0)
  const prevExp = prevWeekTx.filter(isExpenseForSummary).reduce((s, t) => s + t.amount, 0)

  const catMap: Record<string, number> = {}
  thisWeekTx.filter(isExpenseForSummary).forEach((t) => {
    const k = t.categoryName || 'Lainnya'
    catMap[k] = (catMap[k] || 0) + t.amount
  })
  const topEntry = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]

  const fmt = (d: Date) => d.toISOString().split('T')[0]

  return {
    weekStart:   fmt(weekStart),
    weekEnd:     fmt(weekEnd),
    income,
    expense,
    balance:     income - expense,
    txCount:     thisWeekTx.length,
    topCategory: topEntry?.[0] || '—',
    topAmount:   topEntry?.[1] || 0,
    vsLastWeek:  prevExp > 0 ? ((expense - prevExp) / prevExp) * 100 : 0,
  }
}
