'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, TrendingDown, TrendingUp, ArrowLeftRight, Coins, BarChart2 } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type TransactionType = 'expense' | 'income' | 'transfer'

interface DashboardAction {
  label:   string
  icon:    React.ReactNode
  color:   string
  bg:      string
  onClick: () => void
}

interface TransactionVariantProps {
  variant: 'transaction'
  onSelect: (type: TransactionType) => void
}

interface DashboardVariantProps {
  variant: 'dashboard'
  actions: DashboardAction[]
}

type Props = TransactionVariantProps | DashboardVariantProps

// ─── Transaction speed-dial actions ──────────────────────────────────────────

const TX_ACTIONS = [
  {
    type:  'expense'  as TransactionType,
    label: 'Pengeluaran',
    icon:  <TrendingDown size={18} strokeWidth={2.2} />,
    color: '#fff',
    bg:    'var(--red)',
    shadow:'rgba(239,68,68,0.40)',
  },
  {
    type:  'income'   as TransactionType,
    label: 'Pemasukan',
    icon:  <TrendingUp  size={18} strokeWidth={2.2} />,
    color: '#000',
    bg:    'var(--accent)',
    shadow:'rgba(34,197,94,0.40)',
  },
  {
    type:  'transfer' as TransactionType,
    label: 'Transfer',
    icon:  <ArrowLeftRight size={18} strokeWidth={2.2} />,
    color: '#fff',
    bg:    'var(--blue, #3b82f6)',
    shadow:'rgba(59,130,246,0.40)',
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function FloatingActionButton(props: Props) {
  const [open, setOpen] = useState(false)
  const ref  = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // ── Dashboard variant ──────────────────────────────────────────────────────
  if (props.variant === 'dashboard') {
    const { actions } = props
    return (
      <div ref={ref} className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2.5">
        {/* Speed dial items */}
        <AnimatePresence>
          {open && actions.map((action, i) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, y: 10, scale: 0.85 }}
              animate={{ opacity: 1, y: 0,  scale: 1    }}
              exit={{    opacity: 0, y: 10, scale: 0.85 }}
              transition={{ delay: (actions.length - 1 - i) * 0.06, duration: 0.18, ease: [0.16,1,0.3,1] }}
              className="flex items-center gap-2.5"
            >
              {/* Label chip */}
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{
                  background: 'var(--surface-3)',
                  border:     '1px solid var(--border)',
                  color:      'var(--text-primary)',
                  boxShadow:  '0 4px 12px rgba(0,0,0,0.25)',
                }}
              >
                {action.label}
              </span>
              {/* Action button */}
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => { setOpen(false); action.onClick() }}
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  background: action.bg,
                  color:      action.color,
                  boxShadow:  `0 6px 20px ${action.bg}55`,
                }}
              >
                {action.icon}
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Main FAB */}
        <MainFAB open={open} onToggle={() => setOpen(o => !o)} />
      </div>
    )
  }

  // ── Transaction variant (speed dial: expense / income / transfer) ──────────
  const { onSelect } = props
  return (
    <div ref={ref} className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2.5">
      <AnimatePresence>
        {open && TX_ACTIONS.map((action, i) => (
          <motion.div
            key={action.type}
            initial={{ opacity: 0, y: 12, scale: 0.82 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: 12, scale: 0.82 }}
            transition={{ delay: (TX_ACTIONS.length - 1 - i) * 0.06, duration: 0.18, ease: [0.16,1,0.3,1] }}
            className="flex items-center gap-2.5"
          >
            {/* Label chip */}
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{
                background: 'var(--surface-3)',
                border:     '1px solid var(--border)',
                color:      'var(--text-primary)',
                boxShadow:  '0 4px 12px rgba(0,0,0,0.25)',
              }}
            >
              {action.label}
            </span>
            {/* Action button */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                setOpen(false)
                onSelect(action.type)
              }}
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: action.bg,
                color:      action.color,
                boxShadow:  `0 6px 20px ${action.shadow}`,
              }}
            >
              {action.icon}
            </motion.button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Main FAB */}
      <MainFAB open={open} onToggle={() => setOpen(o => !o)} />
    </div>
  )
}

// ─── Shared main FAB button ───────────────────────────────────────────────────

function MainFAB({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      whileHover={{ scale: 1.06 }}
      onClick={onToggle}
      className="w-14 h-14 rounded-full flex items-center justify-center relative z-10"
      style={{
        background: open
          ? 'var(--surface-3)'
          : 'var(--accent)',
        color:      open ? 'var(--text-primary)' : '#000',
        boxShadow:  open
          ? '0 6px 20px rgba(0,0,0,0.35)'
          : '0 8px 28px rgba(34,197,94,0.45)',
        border:     open ? '1px solid var(--border)' : 'none',
        transition: 'background 0.2s, color 0.2s, box-shadow 0.2s',
      }}
    >
      <motion.div
        animate={{ rotate: open ? 45 : 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <Plus size={24} strokeWidth={2.5} />
      </motion.div>
    </motion.button>
  )
}
