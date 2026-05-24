/**
 * lib/anomaly-detection.ts
 * Advanced anomaly detection for spending patterns.
 * Uses statistical methods (z-score, moving average) to detect unusual transactions.
 */

import type { Transaction, Insight } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { isExpenseForSummary } from '@/lib/transaction-rules'

// ── Types ────────────────────────────────────────────────────────────────────

export interface SpendingAnomaly {
  type: 'single_large' | 'category_spike' | 'frequency_spike' | 'unusual_time' | 'new_merchant'
  severity: 'low' | 'medium' | 'high'
  transaction?: Transaction
  category?: string
  message: string
  detail: string
  amount?: number
  zScore?: number
}

// ── Statistical helpers ──────────────────────────────────────────────────────

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((s, v) => s + v, 0) / values.length
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0
  const avg = mean(values)
  const squaredDiffs = values.map((v) => (v - avg) ** 2)
  return Math.sqrt(squaredDiffs.reduce((s, v) => s + v, 0) / (values.length - 1))
}

function zScore(value: number, avg: number, sd: number): number {
  if (sd === 0) return 0
  return (value - avg) / sd
}

// ── Core detection functions ─────────────────────────────────────────────────

/**
 * Detect single transactions that are unusually large compared to user's history.
 */
function detectLargeTransactions(transactions: Transaction[]): SpendingAnomaly[] {
  const anomalies: SpendingAnomaly[] = []
  const expenses = transactions.filter(isExpenseForSummary)

  if (expenses.length < 10) return [] // Need enough history

  const amounts = expenses.map((t) => t.amount)
  const avg = mean(amounts)
  const sd = stdDev(amounts)

  // Check recent transactions (last 7 days)
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const recentExpenses = expenses.filter((t) => new Date(t.date) >= weekAgo)

  for (const tx of recentExpenses) {
    const z = zScore(tx.amount, avg, sd)
    if (z >= 2.5) {
      const severity = z >= 3.5 ? 'high' : z >= 3 ? 'medium' : 'low'
      anomalies.push({
        type: 'single_large',
        severity,
        transaction: tx,
        amount: tx.amount,
        zScore: z,
        message: `Transaksi besar: ${tx.description || tx.categoryName}`,
        detail: `${formatCurrency(tx.amount)} — ${(z).toFixed(1)}x di atas rata-rata pengeluaranmu (${formatCurrency(avg)})`,
      })
    }
  }

  return anomalies.slice(0, 3) // Max 3
}

/**
 * Detect categories with unusual spending spikes this week vs historical weekly average.
 */
function detectCategorySpikes(transactions: Transaction[]): SpendingAnomaly[] {
  const anomalies: SpendingAnomaly[] = []
  const expenses = transactions.filter(isExpenseForSummary)

  if (expenses.length < 20) return []

  // Group by category and week
  const now = new Date()
  const thisWeekStart = new Date(now)
  thisWeekStart.setDate(now.getDate() - now.getDay())
  thisWeekStart.setHours(0, 0, 0, 0)

  // Get weekly spending per category for last 8 weeks
  const categoryWeekly: Record<string, number[]> = {}
  const categoryThisWeek: Record<string, number> = {}

  for (const tx of expenses) {
    const cat = tx.categoryName || 'Lainnya'
    const txDate = new Date(tx.date)

    if (txDate >= thisWeekStart) {
      categoryThisWeek[cat] = (categoryThisWeek[cat] || 0) + tx.amount
    } else {
      // Calculate which week this belongs to (0-7 weeks ago)
      const weeksAgo = Math.floor((thisWeekStart.getTime() - txDate.getTime()) / (7 * 86400000))
      if (weeksAgo >= 0 && weeksAgo < 8) {
        if (!categoryWeekly[cat]) categoryWeekly[cat] = Array(8).fill(0)
        categoryWeekly[cat][weeksAgo] += tx.amount
      }
    }
  }

  // Compare this week vs historical average
  for (const [cat, thisWeekAmount] of Object.entries(categoryThisWeek)) {
    const history = categoryWeekly[cat]
    if (!history || history.filter((v) => v > 0).length < 3) continue // Need at least 3 weeks of data

    const avg = mean(history.filter((v) => v > 0))
    const sd = stdDev(history.filter((v) => v > 0))

    if (avg === 0) continue

    const z = zScore(thisWeekAmount, avg, sd)
    const percentIncrease = ((thisWeekAmount - avg) / avg) * 100

    if (z >= 2 && percentIncrease >= 80 && thisWeekAmount >= 100_000) {
      anomalies.push({
        type: 'category_spike',
        severity: z >= 3 ? 'high' : 'medium',
        category: cat,
        amount: thisWeekAmount,
        zScore: z,
        message: `${cat} melonjak ${percentIncrease.toFixed(0)}% minggu ini`,
        detail: `${formatCurrency(thisWeekAmount)} vs rata-rata ${formatCurrency(avg)}/minggu. Cek apakah ada pengeluaran yang bisa dikurangi.`,
      })
    }
  }

  return anomalies.sort((a, b) => (b.zScore || 0) - (a.zScore || 0)).slice(0, 3)
}

/**
 * Detect unusual frequency of transactions (too many transactions in a short period).
 */
function detectFrequencySpikes(transactions: Transaction[]): SpendingAnomaly[] {
  const anomalies: SpendingAnomaly[] = []
  const expenses = transactions.filter(isExpenseForSummary)

  if (expenses.length < 30) return []

  // Count daily transactions for last 30 days
  const dailyCounts: Record<string, number> = {}
  const dailyAmounts: Record<string, number> = {}
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  for (const tx of expenses) {
    const txDate = new Date(tx.date)
    if (txDate < thirtyDaysAgo) continue
    const dateKey = tx.date.split('T')[0]
    dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1
    dailyAmounts[dateKey] = (dailyAmounts[dateKey] || 0) + tx.amount
  }

  const counts = Object.values(dailyCounts)
  const avgCount = mean(counts)
  const sdCount = stdDev(counts)

  // Check today and yesterday
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  for (const day of [today, yesterday]) {
    const count = dailyCounts[day] || 0
    const amount = dailyAmounts[day] || 0
    if (count === 0) continue

    const z = zScore(count, avgCount, sdCount)
    if (z >= 2 && count >= 5) {
      const isToday = day === today
      anomalies.push({
        type: 'frequency_spike',
        severity: z >= 3 ? 'high' : 'medium',
        amount,
        zScore: z,
        message: `${count} transaksi ${isToday ? 'hari ini' : 'kemarin'} — lebih banyak dari biasanya`,
        detail: `Total ${formatCurrency(amount)}. Rata-rata harianmu ${avgCount.toFixed(1)} transaksi/hari.`,
      })
    }
  }

  return anomalies
}

/**
 * Detect spending on new merchants/descriptions not seen before.
 */
function detectNewMerchants(transactions: Transaction[]): SpendingAnomaly[] {
  const anomalies: SpendingAnomaly[] = []
  const expenses = transactions.filter(isExpenseForSummary)

  if (expenses.length < 20) return []

  // Build historical description set (older than 7 days)
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const historicalDescs = new Set<string>()
  const recentLarge: Transaction[] = []

  for (const tx of expenses) {
    const txDate = new Date(tx.date)
    const descKey = (tx.description || '').toLowerCase().trim().split(' ').slice(0, 2).join(' ')

    if (txDate < weekAgo) {
      if (descKey) historicalDescs.add(descKey)
    } else if (tx.amount >= 200_000) {
      recentLarge.push(tx)
    }
  }

  // Check if recent large transactions are from new merchants
  for (const tx of recentLarge) {
    const descKey = (tx.description || '').toLowerCase().trim().split(' ').slice(0, 2).join(' ')
    if (descKey && !historicalDescs.has(descKey)) {
      anomalies.push({
        type: 'new_merchant',
        severity: 'low',
        transaction: tx,
        amount: tx.amount,
        message: `Pengeluaran baru: ${tx.description}`,
        detail: `${formatCurrency(tx.amount)} — pertama kali tercatat di riwayatmu. Pastikan ini memang benar.`,
      })
    }
  }

  return anomalies.slice(0, 2)
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Run all anomaly detection algorithms and return combined results.
 */
export function detectAnomalies(transactions: Transaction[]): SpendingAnomaly[] {
  const all: SpendingAnomaly[] = [
    ...detectLargeTransactions(transactions),
    ...detectCategorySpikes(transactions),
    ...detectFrequencySpikes(transactions),
    ...detectNewMerchants(transactions),
  ]

  // Sort by severity
  const severityOrder = { high: 0, medium: 1, low: 2 }
  return all.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
}

/**
 * Convert anomalies to Insight format for display in SmartInsights component.
 */
export function anomaliesToInsights(anomalies: SpendingAnomaly[]): Insight[] {
  return anomalies.map((anomaly) => {
    const typeMap: Record<SpendingAnomaly['severity'], Insight['type']> = {
      high: 'critical',
      medium: 'warning',
      low: 'info',
    }

    const iconMap: Record<SpendingAnomaly['type'], string> = {
      single_large: 'alert-triangle',
      category_spike: 'trend-up',
      frequency_spike: 'bar-chart',
      unusual_time: 'bell',
      new_merchant: 'search',
    }

    const priorityMap: Record<SpendingAnomaly['severity'], number> = {
      high: 88,
      medium: 70,
      low: 50,
    }

    return {
      type: typeMap[anomaly.severity],
      icon: iconMap[anomaly.type],
      title: anomaly.message,
      message: anomaly.detail,
      actionLabel: 'Lihat transaksi',
      actionHref: '/transactions',
      priority: priorityMap[anomaly.severity],
    }
  })
}
