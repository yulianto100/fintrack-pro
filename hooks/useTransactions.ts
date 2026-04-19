'use client'

import { useState, useCallback, useMemo } from 'react'
import { useFirebaseList } from './useFirebaseRealtime'
import { getCurrentMonth } from '@/lib/utils'
import type { Transaction, TransactionFilters } from '@/types'
import toast from 'react-hot-toast'

export function useTransactions() {
  const { data: transactions, loading } = useFirebaseList<Transaction>('transactions')
  const [filters, setFilters] = useState<TransactionFilters>({
    month: getCurrentMonth(),
  })

  const filteredTransactions = useMemo(() => {
    if (!transactions) return []
    let list = [...transactions]

    if (filters.month) list = list.filter((t) => t.date.startsWith(filters.month!))
    if (filters.categoryId) list = list.filter((t) => t.categoryId === filters.categoryId)
    if (filters.type) list = list.filter((t) => t.type === filters.type)
    if (filters.wallet) list = list.filter((t) => t.wallet === filters.wallet || t.toWallet === filters.wallet)
    if (filters.search) {
      const q = filters.search.toLowerCase()
      list = list.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.categoryName?.toLowerCase().includes(q)
      )
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [transactions, filters])

  const stats = useMemo(() => {
    const income = filteredTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = filteredTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { income, expense, balance: income - expense }
  }, [filteredTransactions])

  const addTransaction = useCallback(async (data: Partial<Transaction>) => {
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Transaksi berhasil ditambahkan!')
      return json.data
    } catch (err) {
      toast.error('Gagal menambahkan transaksi')
      throw err
    }
  }, [])

  const deleteTransaction = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Transaksi dihapus')
    } catch (err) {
      toast.error('Gagal menghapus transaksi')
      throw err
    }
  }, [])

  const updateTransaction = useCallback(async (id: string, data: Partial<Transaction>) => {
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Transaksi diperbarui!')
      return json.data
    } catch (err) {
      toast.error('Gagal memperbarui transaksi')
      throw err
    }
  }, [])

  return {
    transactions: filteredTransactions,
    allTransactions: transactions || [],
    loading,
    filters,
    setFilters,
    stats,
    addTransaction,
    deleteTransaction,
    updateTransaction,
  }
}
