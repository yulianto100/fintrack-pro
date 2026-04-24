'use client'

import { useState, useCallback, useMemo } from 'react'
import { useApiList } from './useApiData'
import type { Transaction, TransactionFilters } from '@/types'
import toast from 'react-hot-toast'

export function useTransactions() {
  // Fix #1: default = NO filter (was: { month: getCurrentMonth() })
  const [filters, setFilters] = useState<TransactionFilters>({})

  const url = useMemo(() => {
    const p = new URLSearchParams()
    if (filters.month)      p.set('month',      filters.month)
    if (filters.categoryId) p.set('categoryId', filters.categoryId)
    if (filters.type)       p.set('type',        filters.type)
    if (filters.wallet)     p.set('wallet',      filters.wallet)
    p.set('limit', '500')
    return `/api/transactions?${p.toString()}`
  }, [filters])

  const { data: transactions, loading, refetch } = useApiList<Transaction>(url, { refreshMs: 5000 })

  const [searchQuery, setSearchQuery] = useState('')

  const filteredTransactions = useMemo(() => {
    let list = [...transactions]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (t) => t.description?.toLowerCase().includes(q) || t.categoryName?.toLowerCase().includes(q)
      )
    }
    // Always sort newest first (by createdAt DESC for consistency)
    return list.sort((a, b) =>
      new Date(b.createdAt || b.date || '').getTime() - new Date(a.createdAt || a.date || '').getTime()
    )
  }, [transactions, searchQuery])

  const stats = useMemo(() => {
    const income  = transactions.filter(t => t.type === 'income') .reduce((s, t) => s + t.amount, 0)
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { income, expense, balance: income - expense }
  }, [transactions])

  // Helper: true when any filter is active
  const hasActiveFilter = useMemo(() =>
    !!(filters.month || filters.categoryId || filters.type || filters.wallet),
    [filters]
  )

  const clearFilters = useCallback(() => setFilters({}), [])

  const syncWalletBalances = useCallback(async () => {
    try {
      await fetch('/api/wallet-accounts/sync', { method: 'POST' })
    } catch { /* silent — non-critical */ }
  }, [])

  const addTransaction = useCallback(async (data: Partial<Transaction>) => {
    try {
      const res  = await fetch('/api/transactions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Transaksi berhasil ditambahkan! ✓')
      refetch()
      // Sync wallet account balances in background
      syncWalletBalances()
      return json.data
    } catch (err) {
      toast.error('Gagal menambahkan transaksi'); throw err
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
      toast.success('Transaksi diperbarui! ✓')
      refetch()
      syncWalletBalances()
      return json.data
    } catch { toast.error('Gagal memperbarui transaksi') }
  }, [refetch, syncWalletBalances])

  return {
    transactions: filteredTransactions,
    allTransactions: transactions,
    loading,
    filters,
    setFilters,
    clearFilters,
    hasActiveFilter,
    stats,
    searchQuery,
    setSearchQuery,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    refetch,
  }
}
