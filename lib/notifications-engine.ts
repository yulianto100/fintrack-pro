/**
 * lib/notifications-engine.ts
 * Smart notification engine — in-app alerts for budget, spending spikes, activity gaps.
 * Returns a list of in-app notification objects for the client to display.
 */
import type { Transaction, BudgetStatus } from '@/types'
import { formatCurrency } from './utils'

export interface AppNotification {
  id: string
  type: 'budget_warning' | 'budget_exceeded' | 'spending_spike' | 'no_activity' | 'savings_milestone'
  title: string
  message: string
  icon: string
  color: string
  priority: 'high' | 'medium' | 'low'
  createdAt: string
}

function ym(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function prevYM(): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  return ym(d)
}

const NOTIFICATION_STORAGE_KEY = 'fintrack_notifications'
const DISMISSED_STORAGE_KEY    = 'fintrack_notifications_dismissed'

export function loadNotifications(): AppNotification[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(NOTIFICATION_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveNotifications(notifications: AppNotification[]): void {
  if (typeof window === 'undefined') return
  try {
    // Keep only last 20 notifications
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications.slice(0, 20)))
  } catch { /* noop */ }
}

export function dismissNotification(id: string): void {
  if (typeof window === 'undefined') return
  try {
    const dismissed = getDismissed()
    dismissed.add(id)
    localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify([...dismissed]))
  } catch { /* noop */ }
}

export function getDismissed(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(DISMISSED_STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch { return new Set() }
}

export function clearAllNotifications(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(NOTIFICATION_STORAGE_KEY)
  localStorage.removeItem(DISMISSED_STORAGE_KEY)
}

/**
 * Generate smart notifications based on current data.
 * Returns NEW notifications that should be shown/stored.
 */
export function generateNotifications(
  transactions: Transaction[],
  budgets: BudgetStatus[]
): AppNotification[] {
  const notifications: AppNotification[] = []
  const thisM = ym()
  const lastM = prevYM()
  const now   = new Date()

  // ── 1. Budget warnings ──────────────────────────────────────────────────────
  for (const b of budgets) {
    if (b.percent >= 100) {
      notifications.push({
        id: `budget_exceeded_${b.categoryId}_${thisM}`,
        type: 'budget_exceeded',
        title: `Budget ${b.categoryName || 'Kategori'} Habis!`,
        message: `Pengeluaran sudah melebihi limit ${formatCurrency(b.limitAmount)} sebesar ${formatCurrency(-b.remaining)}.`,
        icon: '🔴',
        color: 'var(--red)',
        priority: 'high',
        createdAt: now.toISOString(),
      })
    } else if (b.percent >= 80) {
      notifications.push({
        id: `budget_warning_${b.categoryId}_${thisM}`,
        type: 'budget_warning',
        title: `Budget ${b.categoryName || 'Kategori'} ${b.percent.toFixed(0)}% Terpakai`,
        message: `Sisa ${formatCurrency(b.remaining)} dari limit ${formatCurrency(b.limitAmount)}. Hati-hati!`,
        icon: '⚠️',
        color: 'var(--gold)',
        priority: 'medium',
        createdAt: now.toISOString(),
      })
    }
  }

  // ── 2. Spending spike detection ─────────────────────────────────────────────
  const thisExpense = transactions
    .filter((t) => t.type === 'expense' && t.date.startsWith(thisM))
    .reduce((s, t) => s + t.amount, 0)
  const lastExpense = transactions
    .filter((t) => t.type === 'expense' && t.date.startsWith(lastM))
    .reduce((s, t) => s + t.amount, 0)

  if (lastExpense > 0 && thisExpense > lastExpense * 1.35 && thisExpense > 500_000) {
    const pct = (((thisExpense - lastExpense) / lastExpense) * 100).toFixed(0)
    notifications.push({
      id: `spending_spike_${thisM}`,
      type: 'spending_spike',
      title: `Pengeluaran Melonjak ${pct}%!`,
      message: `Bulan ini sudah ${formatCurrency(thisExpense)} vs ${formatCurrency(lastExpense)} bulan lalu. Waspada!`,
      icon: '📈',
      color: 'var(--red)',
      priority: 'high',
      createdAt: now.toISOString(),
    })
  }

  // ── 3. No activity today ────────────────────────────────────────────────────
  const today = now.toISOString().split('T')[0]
  const dayOfMonth = now.getDate()
  const hasTodayTx = transactions.some((t) => t.date === today)

  if (!hasTodayTx && dayOfMonth > 1 && now.getHours() >= 18) {
    notifications.push({
      id: `no_activity_${today}`,
      type: 'no_activity',
      title: 'Belum Ada Transaksi Hari Ini',
      message: 'Jangan lupa catat pengeluaran harian untuk analisis yang akurat.',
      icon: '📝',
      color: 'var(--blue)',
      priority: 'low',
      createdAt: now.toISOString(),
    })
  }

  // ── 4. Savings milestone ────────────────────────────────────────────────────
  const thisIncome = transactions
    .filter((t) => t.type === 'income' && t.date.startsWith(thisM))
    .reduce((s, t) => s + t.amount, 0)

  if (thisIncome > 0 && thisExpense > 0) {
    const savingsRate = ((thisIncome - thisExpense) / thisIncome) * 100
    if (savingsRate >= 30 && dayOfMonth >= 15) {
      notifications.push({
        id: `savings_milestone_${thisM}`,
        type: 'savings_milestone',
        title: `Tabungan ${savingsRate.toFixed(0)}% Bulan Ini! 🎉`,
        message: `Kamu berhasil menabung ${formatCurrency(thisIncome - thisExpense)} dari total pemasukan. Luar biasa!`,
        icon: '🌟',
        color: 'var(--accent)',
        priority: 'low',
        createdAt: now.toISOString(),
      })
    }
  }

  return notifications
}
