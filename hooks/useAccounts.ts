'use client'

import { useState, useCallback, useMemo } from 'react'
import { useApiList } from './useApiData'
import type { WalletAccount, CreditCard } from '@/types'
import {
  UnifiedAccount,
  walletAccountToUnified,
  creditCardToUnified,
  calcAccountSummary,
} from '@/types/account'
import toast from 'react-hot-toast'

export function useAccounts() {
  const {
    data: wallets,
    loading: walletsLoading,
    refetch: refetchWallets,
  } = useApiList<WalletAccount>('/api/wallet-accounts', { refreshMs: 10_000 })

  const {
    data: cards,
    loading: cardsLoading,
    refetch: refetchCards,
  } = useApiList<CreditCard>('/api/credit-cards', { refreshMs: 10_000 })

  const loading = walletsLoading || cardsLoading

  const refetch = useCallback(() => {
    refetchWallets()
    refetchCards()
  }, [refetchWallets, refetchCards])

  // ── Unified list ─────────────────────────────────────────
  const accounts = useMemo<UnifiedAccount[]>(() => {
    const bankAccounts  = wallets.filter(w => w.type === 'bank').map(walletAccountToUnified)
    const ewallets      = wallets.filter(w => w.type === 'ewallet').map(walletAccountToUnified)
    const creditCards   = cards.map(creditCardToUnified)
    return [...bankAccounts, ...creditCards, ...ewallets]
  }, [wallets, cards])

  const summary = useMemo(() => calcAccountSummary(accounts), [accounts])

  // ── ADD bank / ewallet ────────────────────────────────────
  const addWalletAccount = useCallback(
    async (data: { type: 'bank' | 'ewallet'; name: string; balance?: number }) => {
      const res  = await fetch('/api/wallet-accounts', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success(data.type === 'bank' ? 'Rekening berhasil ditambahkan! 🏦' : 'E-Wallet berhasil ditambahkan! 💳')
      refetch()
      return json.data as WalletAccount
    },
    [refetch]
  )

  // ── ADD credit card ───────────────────────────────────────
  const addCreditCard = useCallback(
    async (data: Omit<CreditCard, 'id' | 'userId' | 'used' | 'createdAt' | 'updatedAt'>) => {
      const res  = await fetch('/api/credit-cards', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Kartu kredit berhasil ditambahkan! 💳')
      refetch()
      return json.data as CreditCard
    },
    [refetch]
  )

  // ── UPDATE wallet balance ─────────────────────────────────
  const updateWalletBalance = useCallback(
    async (id: string, balance: number) => {
      const res  = await fetch(`/api/wallet-accounts/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ balance }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Saldo diperbarui! ✓')
      refetch()
    },
    [refetch]
  )

  // ── UPDATE credit card ────────────────────────────────────
  const updateCreditCard = useCallback(
    async (id: string, data: Partial<CreditCard>) => {
      const res  = await fetch(`/api/credit-cards/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Kartu diperbarui! ✓')
      refetch()
    },
    [refetch]
  )

  // ── DELETE ────────────────────────────────────────────────
  const deleteAccount = useCallback(
    async (account: UnifiedAccount) => {
      const url =
        account.type === 'credit'
          ? `/api/credit-cards/${account.id}`
          : `/api/wallet-accounts/${account.id}`

      const res  = await fetch(url, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Akun dihapus')
      refetch()
    },
    [refetch]
  )

  // ── PAY credit card bill ─────────────────────────────────
  const payBill = useCallback(
    async (params: {
      creditCardId:   string
      walletType:     'cash' | 'bank' | 'ewallet'
      walletAccountId?: string
      amount:         number
      date:           string
      notes?:         string
    }) => {
      const res  = await fetch(`/api/credit-cards/${params.creditCardId}/pay`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(params),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Tagihan berhasil dibayar! ✓')
      refetch()
      return json.data
    },
    [refetch]
  )

  return {
    accounts,
    wallets,
    cards,
    loading,
    refetch,
    summary,
    addWalletAccount,
    addCreditCard,
    updateWalletBalance,
    updateCreditCard,
    deleteAccount,
    payBill,
  }
}
