'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useApiList } from './useApiData'
import type { Transaction, TransactionFilters } from '@/types'
import toast from 'react-hot-toast'
import { isExpenseForSummary } from '@/lib/transaction-rules'
import { haptics } from '@/lib/haptics'

export type TransactionSortBy = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'

function getInitialSort(): TransactionSortBy {
  if (typeof window === 'undefined') return 'date_desc'
  const saved = window.localStorage.getItem('finuvo:tx-sort')
  if (saved === 'date_asc' || saved === 'amount_desc' || saved === 'amount_asc') return saved
  return 'date_desc'
}

export function useTransactions() {
  // Fix #1: default = NO filter (was: { month: getCurrentMonth() })
  const [filters, setFilters] = useState<TransactionFilters>({})

  const url = useMemo(() => {
    const p = new URLSearchParams()
    if (filters.month)      p.set('month',      filters.month)
    if (filters.categoryId) p.set('categoryId', filters.categoryId)
    if (filters.type)       p.set('type',        filters.type)
    if (filters.wallet)     p.set('wallet',      filters.wallet)
    filters.tags?.forEach((tag) => p.append('tag', tag))
    p.set('limit', '500')
    return `/api/transactions?${p.toString()}`
  }, [filters])

  const { data: transactions, loading, error, refetch } = useApiList<Transaction>(url, { refreshMs: 30000 })

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<TransactionSortBy>(getInitialSort)

  useEffect(() => {
    window.localStorage.setItem('finuvo:tx-sort', sortBy)
  }, [sortBy])

  const filteredTransactions = useMemo(() => {
    let list = [...transactions]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (t) => t.description?.toLowerCase().includes(q) || t.categoryName?.toLowerCase().includes(q)
      )
    }
    if (filters.date) {
      list = list.filter((t) => (t.date || '').split('T')[0] === filters.date)
    }

    switch (sortBy) {
      case 'date_asc':
        list.sort((a, b) =>
          new Date(a.createdAt || a.date || '').getTime() - new Date(b.createdAt || b.date || '').getTime()
        )
        break
      case 'amount_desc':
        list.sort((a, b) => b.amount - a.amount)
        break
      case 'amount_asc':
        list.sort((a, b) => a.amount - b.amount)
        break
      case 'date_desc':
      default:
        list.sort((a, b) =>
          new Date(b.createdAt || b.date || '').getTime() - new Date(a.createdAt || a.date || '').getTime()
        )
    }

    return list
  }, [transactions, searchQuery, sortBy, filters.date])

  const stats = useMemo(() => {
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0)

    const expense = transactions
      .filter(isExpenseForSummary)
        // regular expense — but EXCLUDE CC bill payments (transfer type) and legacy CC payment expenses
      .reduce((s, t) => s + t.amount, 0)

    return { income, expense, balance: income - expense }
  }, [transactions])

  // Helper: true when any filter is active
  const hasActiveFilter = useMemo(() =>
    !!(filters.month || filters.categoryId || filters.type || filters.wallet || filters.date || (filters.tags && filters.tags.length > 0)),
    [filters]
  )

  const clearFilters = useCallback(() => setFilters({}), [])

  const syncWalletBalances = useCallback(async () => {
    try { await fetch('/api/wallet-accounts/sync', { method: 'POST' }) } catch { /* silent */ }
  }, [])

  const addTransaction = useCallback(async (data: Partial<Transaction>) => {
    try {
      const res  = await fetch('/api/transactions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      haptics.success()
      toast.success('Transaksi berhasil ditambahkan! ✓')
      refetch()
      syncWalletBalances()
      return json.data
    } catch (err) {
      haptics.error()
      const message = err instanceof Error && err.message ? err.message : 'Gagal menambahkan transaksi'
      toast.error(message)
      throw err
    }
  }, [refetch, syncWalletBalances])

  const deleteTransaction = useCallback(async (id: string) => {
    try {
      const res  = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Transaksi dihapus')
      refetch()
      syncWalletBalances()
    } catch { toast.error('Gagal menghapus transaksi') }
  }, [refetch, syncWalletBalances])

  const updateTransaction = useCallback(async (id: string, data: Partial<Transaction>) => {
    try {
      const res  = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      haptics.success()
      toast.success('Transaksi diperbarui! ✓')
      refetch()
      syncWalletBalances()
      return json.data
    } catch {
      haptics.error()
      toast.error('Gagal memperbarui transaksi')
    }
  }, [refetch, syncWalletBalances])

  return {
    transactions: filteredTransactions,
    allTransactions: transactions,
    loading,
    error,
    filters,
    setFilters,
    clearFilters,
    hasActiveFilter,
    stats,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    refetch,
  }
}
