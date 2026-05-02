'use client'

import { useState, useCallback } from 'react'
import { AnimatePresence }         from 'framer-motion'
import { PlusCircle, TrendingUp }  from 'lucide-react'
import { FloatingActionButton }    from '@/components/transactions/FloatingActionButton'
import { TransactionModal }        from '@/components/transactions/TransactionModal'

interface Props {
  walletBalances: { cash: number; bank: number; ewallet: number }
}

export function QuickAddFAB({ walletBalances }: Props) {
  const [modalOpen, setModalOpen] = useState(false)

  const openTransaction = useCallback(() => {
    setModalOpen(true)
  }, [])

  // Dispatch custom event — same as original pre-update behavior.
  // Dashboard page / InvestModal listens for this event to open Beli Investasi modal.
  const openInvest = useCallback(() => {
    window.dispatchEvent(new CustomEvent('fintrack:open-invest'))
  }, [])

  const dashboardActions = [
    {
      label:   'Tambah Transaksi',
      icon:    <PlusCircle size={18} strokeWidth={2.2} />,
      color:   '#000',
      bg:      'var(--accent)',
      onClick: openTransaction,
    },
    {
      label:   'Investasi',
      icon:    <TrendingUp size={18} strokeWidth={2.2} />,
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
            defaultType="expense"
            onClose={() => setModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
