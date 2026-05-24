'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { ArrowLeftRight, CreditCard, TrendingDown, TrendingUp } from 'lucide-react'
import { FloatingActionButton } from '@/components/transactions/FloatingActionButton'
import { TransactionModal } from '@/components/transactions/TransactionModal'
import { PayCreditCardModal } from '@/components/credit-card/PayCreditCardModal'
import { useCreditCards } from '@/hooks/useCreditCards'
import type { CreditCard as CreditCardType, TransactionType } from '@/types'

export function QuickAddFAB() {
  const router = useRouter()
  const { cards, refetch } = useCreditCards()
  const [txType, setTxType] = useState<TransactionType | null>(null)
  const [payTarget, setPayTarget] = useState<CreditCardType | null>(null)

  const suggestedPayCard = useMemo(
    () => [...cards].sort((a, b) => b.used - a.used)[0],
    [cards],
  )

  useEffect(() => {
    const handler = () => setTxType('expense')
    window.addEventListener('finuvo:open-add-transaction', handler)
    return () => window.removeEventListener('finuvo:open-add-transaction', handler)
  }, [])

  const openPayCreditCard = () => {
    if (suggestedPayCard) {
      setPayTarget(suggestedPayCard)
      return
    }

    router.push('/akun?tab=kredit')
  }

  const dashboardActions = [
    {
      label: 'Catat Pengeluaran',
      icon: <TrendingDown size={17} strokeWidth={2.2} />,
      color: '#06120A',
      bg: '#FCA5A5',
      shadow: 'rgba(252,165,165,0.32)',
      onClick: () => setTxType('expense'),
    },
    {
      label: 'Catat Pemasukan',
      icon: <TrendingUp size={17} strokeWidth={2.2} />,
      color: '#06120A',
      bg: 'var(--accent)',
      shadow: 'rgba(34,197,94,0.38)',
      onClick: () => setTxType('income'),
    },
    {
      label: 'Transfer',
      icon: <ArrowLeftRight size={17} strokeWidth={2.2} />,
      color: '#ECFDF5',
      bg: 'var(--blue, #60A5FA)',
      shadow: 'rgba(96,165,250,0.34)',
      onClick: () => setTxType('transfer'),
    },
    {
      label: 'Bayar Kartu Kredit',
      icon: <CreditCard size={17} strokeWidth={2.2} />,
      color: '#06120A',
      bg: '#FBBF24',
      shadow: 'rgba(251,191,36,0.32)',
      onClick: openPayCreditCard,
    },
  ]

  return (
    <>
      <FloatingActionButton variant="dashboard" actions={dashboardActions} />

      <AnimatePresence>
        {txType && (
          <TransactionModal
            defaultType={txType}
            onClose={() => setTxType(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {payTarget && (
          <PayCreditCardModal
            card={payTarget}
            onClose={() => setPayTarget(null)}
            onSuccess={() => {
              refetch()
              window.dispatchEvent(new CustomEvent('fintrack:wallet-updated'))
              window.dispatchEvent(new CustomEvent('fintrack:transactions-updated'))
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
