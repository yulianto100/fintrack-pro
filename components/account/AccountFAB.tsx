'use client'

import { memo, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Building2, CreditCard, Plus, Wallet } from 'lucide-react'
import { haptics } from '@/lib/haptics'

interface Props {
  onAddBank:    () => void
  onAddCredit:  () => void
  onAddEwallet: () => void
}

const ITEMS = [
  {
    icon: Building2,
    label: 'Tambah Rekening',
    key: 'bank' as const,
    color: '#06120A',
    bg: 'var(--accent)',
    shadow: 'rgba(34,197,94,0.40)',
  },
  {
    icon: CreditCard,
    label: 'Tambah Kartu Kredit',
    key: 'credit' as const,
    color: '#06120A',
    bg: '#FBBF24',
    shadow: 'rgba(251,191,36,0.32)',
  },
  {
    icon: Wallet,
    label: 'Tambah E-Wallet',
    key: 'ewallet' as const,
    color: '#ECFDF5',
    bg: 'var(--blue, #60A5FA)',
    shadow: 'rgba(96,165,250,0.34)',
  },
]

export const AccountFAB = memo(function AccountFAB({ onAddBank, onAddCredit, onAddEwallet }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const handlers: Record<string, () => void> = {
    bank:    () => { haptics.medium(); setOpen(false); onAddBank()    },
    credit:  () => { haptics.medium(); setOpen(false); onAddCredit()  },
    ewallet: () => { haptics.medium(); setOpen(false); onAddEwallet() },
  }

  useEffect(() => {
    if (!open) return

    function handler(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div
      ref={ref}
      className="fixed right-5 z-50 flex flex-col items-end gap-2.5"
      style={{
        bottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom,0px) + 28px)',
      }}
    >
      <AnimatePresence>
        {open && ITEMS.map((item, index) => {
          const Icon = item.icon

          return (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 10, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.85 }}
              transition={{ delay: (ITEMS.length - 1 - index) * 0.05, duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-2.5"
            >
              <span
                className="max-w-[190px] rounded-full px-3 py-1.5 text-xs font-semibold leading-none"
                style={{
                  background: 'var(--surface-3)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                }}
              >
                {item.label}
              </span>
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={handlers[item.key]}
                className="flex h-11 w-11 items-center justify-center rounded-full"
                style={{
                  background: item.bg,
                  color: item.color,
                  boxShadow: `0 8px 22px ${item.shadow}`,
                }}
              >
                <Icon size={17} strokeWidth={2.2} />
              </motion.button>
            </motion.div>
          )
        })}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => {
          haptics.medium()
          setOpen(v => !v)
        }}
        whileTap={{ scale: 0.92 }}
        whileHover={{ scale: 1.05 }}
        className="relative z-10 flex items-center justify-center rounded-full"
        style={{
          width: 52,
          height: 52,
          background: open ? 'var(--surface-3)' : 'var(--accent)',
          color: open ? 'var(--text-primary)' : '#000',
          boxShadow: open ? '0 6px 20px rgba(0,0,0,0.35)' : '0 10px 26px rgba(34,197,94,0.42)',
          border: open ? '1px solid var(--border)' : 'none',
          transition: 'background 0.2s, color 0.2s, box-shadow 0.2s',
        }}
        aria-label={open ? 'Tutup menu akun' : 'Buka menu akun'}
      >
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <Plus size={22} strokeWidth={2.6} />
        </motion.div>
      </motion.button>
    </div>
  )
})
