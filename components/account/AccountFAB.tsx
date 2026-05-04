'use client'

import { useState, memo }          from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Building2, CreditCard, Wallet } from 'lucide-react'

interface Props {
  onAddBank:    () => void
  onAddCredit:  () => void
  onAddEwallet: () => void
}

const ITEMS = [
  { icon: Building2,   label: 'Tambah Rekening',   key: 'bank'    as const },
  { icon: CreditCard,  label: 'Tambah Kartu Kredit', key: 'credit'  as const },
  { icon: Wallet,      label: 'Tambah E-Wallet',   key: 'ewallet' as const },
]

export const AccountFAB = memo(function AccountFAB({ onAddBank, onAddCredit, onAddEwallet }: Props) {
  const [open, setOpen] = useState(false)

  const handlers: Record<string, () => void> = {
    bank:    () => { setOpen(false); onAddBank()    },
    credit:  () => { setOpen(false); onAddCredit()  },
    ewallet: () => { setOpen(false); onAddEwallet() },
  }

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="fab-bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.3)' }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Menu items */}
      <div
        className="fixed z-50 flex flex-col items-end gap-2"
        style={{
          bottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom,0px) + 72px)',
          right:  20,
        }}
      >
        <AnimatePresence>
          {open && ITEMS.map((item, i) => (
            <motion.button
              key={item.key}
              initial={{ opacity: 0, x: 20, scale: 0.85 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 16, scale: 0.9 }}
              transition={{ delay: i * 0.05, duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              onClick={handlers[item.key]}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{
                background: 'var(--surface-card)',
                border:     '1px solid var(--border-hover)',
                boxShadow:  '0 8px 24px rgba(0,0,0,0.3)',
                color:      'var(--text-primary)',
              }}
            >
              <span className="text-[12px] font-semibold whitespace-nowrap">{item.label}</span>
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--accent-dim)' }}
              >
                <item.icon size={13} style={{ color: 'var(--accent)' }} />
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* FAB button */}
      <motion.button
        onClick={() => setOpen(v => !v)}
        whileTap={{ scale: 0.92 }}
        className="fixed z-50 flex items-center justify-center rounded-full"
        style={{
          width:      52,
          height:     52,
          bottom:     'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom,0px) + 12px)',
          right:      20,
          background: 'var(--accent)',
          boxShadow:  '0 8px 24px rgba(34,197,94,0.4)',
        }}
      >
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
        >
          {open ? <X size={20} color="#fff" /> : <Plus size={20} color="#fff" />}
        </motion.div>
      </motion.button>
    </>
  )
})
