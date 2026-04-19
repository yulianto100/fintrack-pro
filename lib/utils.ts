import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, differenceInDays, addMonths } from 'date-fns'
import { id } from 'date-fns/locale'
import type { Deposit, DepositWithCountdown } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ---- FORMATTING ----
export function formatCurrency(amount: number, currency = 'IDR'): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(num: number, decimals = 2): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(num)
}

export function formatPercent(num: number): string {
  const sign = num >= 0 ? '+' : ''
  return `${sign}${num.toFixed(2)}%`
}

export function formatDate(dateString: string, fmt = 'dd MMM yyyy'): string {
  try {
    return format(parseISO(dateString), fmt, { locale: id })
  } catch {
    return dateString
  }
}

export function formatMonth(dateString: string): string {
  try {
    return format(parseISO(dateString + '-01'), 'MMMM yyyy', { locale: id })
  } catch {
    return dateString
  }
}

// ---- DEPOSIT CALCULATIONS ----
export function calculateDepositMaturity(
  nominal: number,
  interestRate: number,
  tenorMonths: number,
  startDate: string
): { maturityDate: string; finalValue: number; totalInterest: number } {
  const start = parseISO(startDate)
  const maturity = addMonths(start, tenorMonths)
  const maturityDate = maturity.toISOString().split('T')[0]
  
  // Simple interest: P × r × t
  // where r = annual rate / 12 per month, t = tenorMonths
  const monthlyRate = interestRate / 100 / 12
  const totalInterest = nominal * monthlyRate * tenorMonths
  const finalValue = nominal + totalInterest
  
  return { maturityDate, finalValue, totalInterest }
}

export function enrichDeposit(deposit: Deposit): DepositWithCountdown {
  const today = new Date()
  const maturity = parseISO(deposit.maturityDate)
  const start = parseISO(deposit.startDate)
  
  const daysRemaining = differenceInDays(maturity, today)
  const totalDays = differenceInDays(maturity, start)
  const elapsedDays = differenceInDays(today, start)
  const percentComplete = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100))
  
  // Accrued interest so far
  const dailyRate = deposit.interestRate / 100 / 365
  const daysElapsed = Math.max(0, elapsedDays)
  const accruedInterest = deposit.nominal * dailyRate * daysElapsed
  const currentValue = deposit.nominal + accruedInterest
  
  return {
    ...deposit,
    daysRemaining,
    percentComplete,
    currentValue,
  }
}

// ---- ID GENERATION ----
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// ---- MONTH HELPERS ----
export function getCurrentMonth(): string {
  return format(new Date(), 'yyyy-MM')
}

export function getMonthOptions(count = 12): Array<{ value: string; label: string }> {
  const options = []
  for (let i = 0; i < count; i++) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const value = format(date, 'yyyy-MM')
    const label = format(date, 'MMMM yyyy', { locale: id })
    options.push({ value, label })
  }
  return options
}

// ---- STOCK HELPERS ----
export function parseLotValue(lots: number, pricePerShare: number): number {
  return lots * 100 * pricePerShare
}

export function calcProfitLoss(currentValue: number, costBasis: number) {
  const profitLoss = currentValue - costBasis
  const profitLossPercent = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0
  return { profitLoss, profitLossPercent }
}

// ---- LOCAL STORAGE (client-side caching) ----
export function setCache(key: string, data: unknown, ttlSeconds = 30): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify({
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  }))
}

export function getCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  const item = localStorage.getItem(key)
  if (!item) return null
  const { data, expiresAt } = JSON.parse(item)
  if (Date.now() > expiresAt) {
    localStorage.removeItem(key)
    return null
  }
  return data as T
}

// ---- COLOR HELPERS ----
export function getProfitColor(value: number): string {
  if (value > 0) return 'text-green-400'
  if (value < 0) return 'text-red-400'
  return 'text-gray-400'
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'text-green-400 bg-green-400/10',
    matured: 'text-yellow-400 bg-yellow-400/10',
    withdrawn: 'text-gray-400 bg-gray-400/10',
  }
  return colors[status] || 'text-gray-400 bg-gray-400/10'
}

// ---- DEBOUNCE ----
export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timer: NodeJS.Timeout
  return ((...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }) as T
}
