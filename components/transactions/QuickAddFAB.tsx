'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, TrendingUp } from 'lucide-react'
import { TransactionModal } from './TransactionModal'
import type { TransactionType } from '@/types'
import Link from 'next/link'

type Option =
  | { kind: 'tx';  type: TransactionType; icon: string; label: string; color: string }
  | { kind: 'nav'; href: string;          icon: string; label: string; color: string }

const OPTIONS: Option[] = [
  { kind: 'tx',  type: 'income',          icon: '💰', label: 'Pemasukan',  color: 'var(--accent)' },
  { kind: 'tx',  type: 'expense',         icon: '💸', label: 'Pengeluaran',color: 'var(--red)'    },
  { kind: 'tx',  type: 'transfer',        icon: '🔄', label: 'Transfer',   color: 'var(--blue)'   },
  { kind: 'nav', href: '/portfolio/emas', icon: '🥇', label: 'Investasi',  color: 'var(--gold)'   },
]

export function QuickAddFAB() {
  const [menuOpen,  setMenuOpen ] = useState(false)
  const [modalType, setModalType] = useState<TransactionType | null>(null)

  const handleTx = (type: TransactionType) => { setMenuOpen(false); setModalType(type) }

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div key="bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
        )}
      </AnimatePresence>

      {/* Sub-options — appear ABOVE the FAB, which is itself above navbar */}
      <div className="fab-container">
        <AnimatePresence>
          {menuOpen && (
            <div className="absolute bottom-16 right-0 flex flex-col items-end gap-2.5 mb-2">
              {OPTIONS.map((opt, i) => (
                <motion.div
                  key={opt.kind === 'tx' ? opt.type : opt.href}
                  initial={{ opacity: 0, x: 16, scale: 0.85 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 16, scale: 0.85 }}
                  transition={{ delay: (OPTIONS.length - 1 - i) * 0.05, type: 'spring', stiffness: 380, damping: 26 }}
                >
                  {opt.kind === 'tx' ? (
                    <button
                      onClick={() => handleTx(opt.type)}
                      className="flex items-center gap-3 pr-4 pl-3 py-2.5 rounded-2xl shadow-lg whitespace-nowrap"
                      style={{ background: 'var(--surface-close)', border: `1px solid ${opt.color}35`, color: 'var(--text-primary)' }}
                    >
                      <span className="text-lg">{opt.icon}</span>
                      <span className="text-sm font-medium">{opt.label}</span>
                    </button>
                  ) : (
                    <Link href={opt.href} onClick={() => setMenuOpen(false)}>
                      <div
                        className="flex items-center gap-3 pr-4 pl-3 py-2.5 rounded-2xl shadow-lg whitespace-nowrap cursor-pointer"
                        style={{ background: 'var(--surface-close)', border: `1px solid ${opt.color}35`, color: 'var(--text-primary)' }}
                      >
                        <span className="text-lg">{opt.icon}</span>
                        <span className="text-sm font-medium">{opt.label}</span>
                      </div>
                    </Link>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Main FAB button */}
        <motion.button
          whileTap={{ scale: 0.90 }}
          onClick={() => setMenuOpen((p) => !p)}
          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl"
          style={{
            background: menuOpen
              ? 'linear-gradient(135deg,#F87171,#e53e3e)'
              : 'linear-gradient(135deg,#22C55E,#16A34A)',
            boxShadow: menuOpen
              ? '0 8px 24px rgba(252,129,129,0.40)'
              : '0 8px 24px rgba(34,197,94,0.25)',
          }}
        >
          <motion.div animate={{ rotate: menuOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
            <Plus size={24} color="#fff" strokeWidth={2.5} />
          </motion.div>
        </motion.button>
      </div>

      {/* Transaction modal */}
      <AnimatePresence>
        {modalType !== null && (
          <TransactionModal key={modalType} defaultType={modalType} onClose={() => setModalType(null)} />
        )}
      </AnimatePresence>
    </>
  )
}
