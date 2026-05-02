'use client'

import { useState, useCallback } from 'react'
import { AnimatePresence }         from 'framer-motion'
import { TrendingDown, TrendingUp, Coins } from 'lucide-react'
import { FloatingActionButton }    from '@/components/transactions/FloatingActionButton'
import { TransactionModal }        from '@/components/transactions/TransactionModal'
import type { WalletType }         from '@/types'

interface Props {
  walletBalances: { cash: number; bank: number; ewallet: number }
}

export function QuickAddFAB({ walletBalances }: Props) {
  const [modalOpen,   setModalOpen  ] = useState(false)
  const [defaultType, setDefaultType] = useState<'income' | 'expense'>('expense')
  const [investOpen,  setInvestOpen ] = useState(false)

  const openExpense = useCallback(() => {
    setDefaultType('expense')
    setModalOpen(true)
  }, [])

  const openIncome = useCallback(() => {
    setDefaultType('income')
    setModalOpen(true)
  }, [])

  const openInvest = useCallback(() => {
    // Keep existing invest behavior — dispatch custom event so portfolio
    // components can pick it up, same as before.
    window.dispatchEvent(new CustomEvent('fintrack:open-invest'))
    setInvestOpen(true)
  }, [])

  const dashboardActions = [
    {
      label:   'Pengeluaran',
      icon:    <TrendingDown size={18} strokeWidth={2.2} />,
      color:   '#fff',
      bg:      'var(--red)',
      onClick: openExpense,
    },
    {
      label:   'Pemasukan',
      icon:    <TrendingUp size={18} strokeWidth={2.2} />,
      color:   '#000',
      bg:      'var(--accent)',
      onClick: openIncome,
    },
    {
      label:   'Investasi',
      icon:    <Coins size={18} strokeWidth={2.2} />,
      color:   '#fff',
      bg:      'var(--blue, #3b82f6)',
      onClick: openInvest,
    },
  ]

  return (
    <>
      <FloatingActionButton
        variant="dashboard"
        actions={dashboardActions}
      />

      <AnimatePresence>
        {modalOpen && (
          <TransactionModal
            defaultType={defaultType}
            onClose={() => setModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
