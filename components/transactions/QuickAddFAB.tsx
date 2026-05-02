'use client'

import { useState }               from 'react'
import { AnimatePresence }         from 'framer-motion'
import { PlusCircle, TrendingUp }  from 'lucide-react'
import { FloatingActionButton }    from '@/components/transactions/FloatingActionButton'
import { TransactionModal }        from '@/components/transactions/TransactionModal'
import { InvestasiModal }          from '@/components/investment/InvestasiModal'

interface Props {
  walletBalances: { cash: number; bank: number; ewallet: number }
}

export function QuickAddFAB({ walletBalances }: Props) {
  const [txOpen,     setTxOpen    ] = useState(false)
  const [investOpen, setInvestOpen] = useState(false)

  const dashboardActions = [
    {
      label:   'Tambah Transaksi',
      icon:    <PlusCircle size={18} strokeWidth={2.2} />,
      color:   '#000',
      bg:      'var(--accent)',
      onClick: () => setTxOpen(true),
    },
    {
      label:   'Investasi',
      icon:    <TrendingUp size={18} strokeWidth={2.2} />,
      color:   '#fff',
      bg:      'var(--blue, #3b82f6)',
      onClick: () => setInvestOpen(true),
    },
  ]

  return (
    <>
      <FloatingActionButton variant="dashboard" actions={dashboardActions} />

      <AnimatePresence>
        {txOpen && (
          <TransactionModal
            defaultType="expense"
            onClose={() => setTxOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {investOpen && (
          <InvestasiModal
            walletBalances={walletBalances}
            onClose={() => setInvestOpen(false)}
            onSuccess={() => {
              window.dispatchEvent(new CustomEvent('fintrack:wallet-updated'))
              window.dispatchEvent(new CustomEvent('fintrack:transactions-updated'))
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
