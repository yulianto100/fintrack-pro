'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import { TransactionModal } from './TransactionModal'
import type { TransactionType } from '@/types'

export function QuickAddFAB() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<TransactionType>('expense')

  const options = [
    { type: 'income' as TransactionType, icon: '💰', label: 'Pemasukan', color: 'var(--accent)' },
    { type: 'expense' as TransactionType, icon: '💸', label: 'Pengeluaran', color: 'var(--red)' },
    { type: 'transfer' as TransactionType, icon: '🔄', label: 'Transfer', color: 'var(--blue)' },
  ]

  return (
    <>
      {/* Sub buttons */}
      <AnimatePresence>
        {open && (
          <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-3">
            {options.map((opt, i) => (
              <motion.button
                key={opt.type}
                initial={{ opacity: 0, x: 20, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.8 }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 400, damping: 25 }}
                onClick={() => { setType(opt.type); setOpen(false) }}
                className="flex items-center gap-3 pr-4 pl-3 py-2.5 rounded-2xl shadow-lg"
                style={{
                  background: 'var(--surface-2)',
                  border: `1px solid ${opt.color}40`,
                  color: 'var(--text-primary)',
                }}
              >
                <span className="text-lg">{opt.icon}</span>
                <span className="text-sm font-medium">{opt.label}</span>
              </motion.button>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen(!open)}
        className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl"
        style={{
          background: open
            ? 'linear-gradient(135deg, #ef4444, #dc2626)'
            : 'linear-gradient(135deg, #22c55e, #16a34a)',
          boxShadow: open
            ? '0 8px 25px rgba(239,68,68,0.4)'
            : '0 8px 25px rgba(34,197,94,0.4)',
        }}
      >
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }}>
          <Plus size={24} color="#fff" strokeWidth={2.5} />
        </motion.div>
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {!open && type && (
          <TransactionModal
            key={type}
            defaultType={type}
            onClose={() => setType('expense')}
          />
        )}
      </AnimatePresence>
    </>
  )
}
