'use client'

import { useState, useCallback, useMemo } from 'react'
import { useApiList } from './useApiData'
import type { CreditCard } from '@/types'
import toast from 'react-hot-toast'

export function useCreditCards() {
  const { data: cards, loading, refetch } = useApiList<CreditCard>('/api/credit-cards', { refreshMs: 10000 })

  const totalDebt = useMemo(() => cards.reduce((s, c) => s + c.used, 0), [cards])
  const totalLimit = useMemo(() => cards.reduce((s, c) => s + c.limit, 0), [cards])
  const overallUsagePercent = totalLimit > 0 ? (totalDebt / totalLimit) * 100 : 0

  const addCard = useCallback(async (data: Omit<CreditCard, 'id' | 'userId' | 'used' | 'createdAt' | 'updatedAt'>) => {
    try {
      const res = await fetch('/api/credit-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Kartu kredit berhasil ditambahkan! 💳')
      refetch()
      return json.data
    } catch (err) {
      toast.error('Gagal menambahkan kartu kredit')
      throw err
    }
  }, [refetch])

  const updateCard = useCallback(async (id: string, data: Partial<CreditCard>) => {
    try {
      const res = await fetch(`/api/credit-cards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Kartu diperbarui! ✓')
      refetch()
      return json.data
    } catch {
      toast.error('Gagal memperbarui kartu kredit')
    }
  }, [refetch])

  const deleteCard = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/credit-cards/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Kartu dihapus')
      refetch()
    } catch {
      toast.error('Gagal menghapus kartu kredit')
    }
  }, [refetch])

  const payBill = useCallback(async (params: {
    creditCardId: string
    walletType: 'cash' | 'bank' | 'ewallet'
    walletAccountId?: string
    amount: number
    date: string
    notes?: string
  }) => {
    try {
      const res = await fetch(`/api/credit-cards/${params.creditCardId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Tagihan berhasil dibayar! ✓')
      refetch()
      return json.data
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membayar tagihan'
      toast.error(msg)
      throw err
    }
  }, [refetch])

  return {
    cards,
    loading,
    refetch,
    totalDebt,
    totalLimit,
    overallUsagePercent,
    addCard,
    updateCard,
    deleteCard,
    payBill,
  }
}
