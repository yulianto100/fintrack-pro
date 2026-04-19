'use client'

import { useState, useCallback, useMemo } from 'react'
import { useApiList } from './useApiData'
import { getCurrentMonth } from '@/lib/utils'
import type { Transaction, TransactionFilters } from '@/types'
import toast from 'react-hot-toast'

export function useTransactions() {
  const [filters, setFilters] = useState<TransactionFilters>({ month: getCurrentMonth() })

  // Build query string from filters
  const url = useMemo(() => {
    const p = new URLSearchParams()
    if (filters.month)      p.set('month',      filters.month)
    if (filters.categoryId) p.set('categoryId', filters.categoryId)
    if (filters.type)       p.set('type',        filters.type)
    if (filters.wallet)     p.set('wallet',      filters.wallet)
    return `/api/transactions?${p.toString()}&limit=500`
  }, [filters])

  const { data: transactions, loading, refetch } = useApiList<Transaction>(url, { refreshMs: 5000 })

  // Client-side search (not passed to API)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredTransactions = useMemo(() => {
    let list = [...transactions]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (t) =>
          t.description?.toLowerCase().includes(q) ||
          t.categoryName?.toLowerCase().includes(q)
      )
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [transactions, searchQuery])

  const stats = useMemo(() => {
    const income  = transactions.filter((t) => t.type === 'income') .reduce((s, t) => s + t.amount, 0)
    const expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { income, expense, balance: income - expense }
  }, [transactions])

  const addTransaction = useCallback(async (data: Partial<Transaction>) => {
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Transaksi berhasil ditambahkan! ✓')
      refetch()
      return json.data
    } catch (err) {
      toast.error('Gagal menambahkan transaksi')
      throw err
    }
  }, [refetch])

  const deleteTransaction = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Transaksi dihapus')
      refetch()
    } catch {
      toast.error('Gagal menghapus transaksi')
    }
  }, [refetch])

  const updateTransaction = useCallback(async (id: string, data: Partial<Transaction>) => {
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Transaksi diperbarui! ✓')
      refetch()
      return json.data
    } catch {
      toast.error('Gagal memperbarui transaksi')
    }
  }, [refetch])

  return {
    transactions: filteredTransactions,
    allTransactions: transactions,
    loading,
    filters,
    setFilters,
    stats,
    searchQuery,
    setSearchQuery,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    refetch,
  }
}
