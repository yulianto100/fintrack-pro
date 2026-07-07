/**
 * lib/recurring-guard.ts
 * Finds recurring transactions that are due, overdue, or coming up.
 * Pure functions; UI in components/dashboard/RecurringDueGuard.tsx
 */
import type { RecurringTransaction } from '@/types'

export interface RecurringDue {
  id: string
  description: string
  amount: number
  type: 'income' | 'expense'
  categoryId: string
  categoryName?: string
  categoryIcon?: string
  wallet: string
  frequency: string
  nextRunDate: string
  status: 'overdue' | 'due' | 'upcoming'
  daysLabel: string
}

export function getRecurringDue(items: RecurringTransaction[], now: Date = new Date()): RecurringDue[] {
  if (!items.length) return []

  const today = now.toISOString().split('T')[0]
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const threeDays = new Date(now)
  threeDays.setDate(threeDays.getDate() + 3)
  const threeDaysStr = threeDays.toISOString().split('T')[0]

  return items
    .filter((item) => item.isActive && item.nextRunDate <= threeDaysStr)
    .sort((a, b) => a.nextRunDate.localeCompare(b.nextRunDate))
    .map((item) => {
      const next = item.nextRunDate
      let status: 'overdue' | 'due' | 'upcoming'
      let daysLabel: string

      if (next < today) {
        status = 'overdue'
        const diff = Math.round((now.getTime() - new Date(next).getTime()) / 86400000)
        daysLabel = diff === 0 ? 'Hari ini' : diff === 1 ? 'Kemarin' : `${diff} hari lewat`
      } else if (next === today || next === tomorrowStr) {
        status = 'due'
        daysLabel = next === today ? 'Hari ini' : 'Besok'
      } else {
        status = 'upcoming'
        daysLabel = `${Math.round((new Date(next).getTime() - now.getTime()) / 86400000)} hari lagi`
      }

      return {
        id: item.id,
        description: item.description,
        amount: item.amount,
        type: item.type,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        categoryIcon: item.categoryIcon,
        wallet: item.wallet,
        frequency: item.frequency,
        nextRunDate: next,
        status,
        daysLabel,
      }
    })
}