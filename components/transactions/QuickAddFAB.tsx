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
  const [menuOpen,   setMenuOpen  ] = useState(false)
  const [txOpen,     setTxOpen    ] = useState(false)
  const [investOpen, setInvestOpen] = useState(false)

  const defaultBalances: WalletBalances = walletBalances ?? { cash: 0, bank: 0, ewallet: 0 }

  const openTx = () => { setMenuOpen(false); setTxOpen(true) }
  const openInvest = () => { setMenuOpen(false); setInvestOpen(true) }

  return (
    <>
      {/* ── Backdrop (closes menu on outside tap) ─────────────────────── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="fab-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── FAB container ─────────────────────────────────────────────── */}
      <div className="fab-container">

        {/* Expanded options — appear above the main FAB */}
        <AnimatePresence>
          {menuOpen && (
            <div className="absolute bottom-16 right-0 flex flex-col items-end gap-2.5 mb-2">

              {/* 📈 Investasi (top) */}
              <motion.button
                initial={{ opacity: 0, x: 16, scale: 0.85 }}
                animate={{ opacity: 1, x: 0,  scale: 1    }}
                exit={{    opacity: 0, x: 16, scale: 0.85 }}
                transition={{ delay: 0.05, type: 'spring', stiffness: 380, damping: 26 }}
                whileTap={{ scale: 0.92 }}
                onClick={openInvest}
                className="flex items-center gap-3 pr-4 pl-3 py-2.5 rounded-2xl shadow-lg"
                style={{
                  background: 'var(--surface-close)',
                  border:     '1px solid rgba(245,158,11,0.35)',
                  color:      'var(--text-primary)',
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(245,158,11,0.18)' }}
                >
                  <TrendingUp size={14} color="#F59E0B" strokeWidth={2.5} />
                </span>
                <span className="text-sm font-semibold">Investasi</span>
              </motion.button>

              {/* ➕ Tambah Transaksi (bottom, closer to FAB) */}
              <motion.button
                initial={{ opacity: 0, x: 16, scale: 0.85 }}
                animate={{ opacity: 1, x: 0,  scale: 1    }}
                exit={{    opacity: 0, x: 16, scale: 0.85 }}
                transition={{ delay: 0, type: 'spring', stiffness: 380, damping: 26 }}
                whileTap={{ scale: 0.92 }}
                onClick={openTx}
                className="flex items-center gap-3 pr-4 pl-3 py-2.5 rounded-2xl shadow-lg"
                style={{
                  background: 'var(--surface-close)',
                  border:     '1px solid rgba(34,197,94,0.35)',
                  color:      'var(--text-primary)',
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(34,197,94,0.18)' }}
                >
                  <Plus size={15} color="var(--accent)" strokeWidth={2.8} />
                </span>
                <span className="text-sm font-semibold">Tambah Transaksi</span>
              </motion.button>
            </div>
          )}
        </AnimatePresence>

        {/* ── Main round + FAB ──────────────────────────────────────────── */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => setMenuOpen(p => !p)}
          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl"
          style={{
            background: menuOpen
              ? 'linear-gradient(135deg,#F87171,#e53e3e)'
              : 'linear-gradient(135deg,#22C55E,#16A34A)',
            boxShadow: menuOpen
              ? '0 8px 24px rgba(252,129,129,0.40)'
              : '0 8px 24px rgba(34,197,94,0.28)',
          }}
        >
          <motion.div
            animate={{ rotate: menuOpen ? 45 : 0 }}
            transition={{ duration: 0.2, type: 'spring', stiffness: 400, damping: 25 }}
          >
            <Plus size={26} color="#fff" strokeWidth={2.8} />
          </motion.div>
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
            onSuccess={() => onInvestmentSuccess?.()}
          />
        )}
      </AnimatePresence>
    </>
  )
}
