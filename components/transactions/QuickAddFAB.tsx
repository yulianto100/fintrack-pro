'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, TrendingUp } from 'lucide-react'
import { TransactionModal } from './TransactionModal'
import { InvestasiModal } from '@/components/investment/InvestasiModal'

interface WalletBalances {
  cash: number
  bank: number
  ewallet: number
}

interface Props {
  walletBalances?: WalletBalances
  onInvestmentSuccess?: () => void
}

export function QuickAddFAB({ walletBalances, onInvestmentSuccess }: Props) {
  const [txOpen,     setTxOpen    ] = useState(false)
  const [investOpen, setInvestOpen] = useState(false)

  const defaultBalances: WalletBalances = walletBalances ?? { cash: 0, bank: 0, ewallet: 0 }

  return (
    <>
      {/* ── Two-button FAB column ──────────────────────────────────────── */}
      <div
        className="fab-container"
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}
      >
        {/* 📈 Investasi */}
        <motion.button
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.06, type: 'spring', stiffness: 380, damping: 30 }}
          whileTap={{ scale: 0.90 }}
          onClick={() => setInvestOpen(true)}
          className="flex items-center gap-2.5 pl-4 pr-5 h-12 rounded-2xl shadow-xl"
          style={{
            background: 'linear-gradient(135deg,#F59E0B,#D97706)',
            boxShadow:  '0 6px 20px rgba(245,158,11,0.35)',
            color:      '#fff',
            whiteSpace: 'nowrap',
            fontWeight: 600,
            fontSize:   14,
          }}
        >
          <TrendingUp size={18} strokeWidth={2.5} />
          <span>Investasi</span>
        </motion.button>

        {/* ➕ Tambah Transaksi */}
        <motion.button
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0, type: 'spring', stiffness: 380, damping: 30 }}
          whileTap={{ scale: 0.90 }}
          onClick={() => setTxOpen(true)}
          className="flex items-center gap-2.5 pl-4 pr-5 h-14 rounded-2xl shadow-xl"
          style={{
            background: 'linear-gradient(135deg,#22C55E,#16A34A)',
            boxShadow:  '0 8px 24px rgba(34,197,94,0.30)',
            color:      '#fff',
            whiteSpace: 'nowrap',
            fontWeight: 700,
            fontSize:   15,
          }}
        >
          <Plus size={22} strokeWidth={2.8} />
          <span>Tambah Transaksi</span>
        </motion.button>
      </div>

      {/* ── Transaction Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {txOpen && (
          <TransactionModal
            key="tx-modal"
            defaultType="expense"
            onClose={() => setTxOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Investment Modal ───────────────────────────────────────────── */}
      <AnimatePresence>
        {investOpen && (
          <InvestasiModal
            key="invest-modal"
            walletBalances={defaultBalances}
            onClose={() => setInvestOpen(false)}
            onSuccess={() => {
              onInvestmentSuccess?.()
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
