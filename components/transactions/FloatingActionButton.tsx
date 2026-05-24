'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeftRight, Plus, TrendingDown, TrendingUp } from 'lucide-react'

type TransactionType = 'expense' | 'income' | 'transfer'

interface DashboardAction {
  label: string
  icon: ReactNode
  color: string
  bg: string
  shadow?: string
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

const TX_ACTIONS = [
  {
    type: 'expense' as TransactionType,
    label: 'Pengeluaran',
    icon: <TrendingDown size={18} strokeWidth={2.2} />,
    color: '#06120A',
    bg: 'var(--expenseNormal)',
    shadow: 'rgba(248,113,113,0.32)',
  },
  {
    type: 'income' as TransactionType,
    label: 'Pemasukan',
    icon: <TrendingUp size={18} strokeWidth={2.2} />,
    color: '#000',
    bg: 'var(--accent)',
    shadow: 'rgba(34,197,94,0.40)',
  },
  {
    type: 'transfer' as TransactionType,
    label: 'Transfer',
    icon: <ArrowLeftRight size={18} strokeWidth={2.2} />,
    color: '#fff',
    bg: 'var(--blue, #3b82f6)',
    shadow: 'rgba(59,130,246,0.40)',
  },
]

const fabPosition = {
  bottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom,0px) + 28px)',
}

const transactionFabPosition = {
  bottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom,0px) + 36px)',
}

export function FloatingActionButton(props: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const transactionSelect = props.variant === 'transaction' ? props.onSelect : null

  useEffect(() => {
    if (!open) return

    function handler(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!transactionSelect) return
    const handler = () => transactionSelect('expense')
    window.addEventListener('finuvo:open-add-transaction', handler)
    return () => window.removeEventListener('finuvo:open-add-transaction', handler)
  }, [transactionSelect])

  if (props.variant === 'dashboard') {
    return (
      <div ref={ref} className="fixed right-5 z-50 flex flex-col items-end gap-2.5" style={fabPosition}>
        <ActionList
          open={open}
          actions={props.actions}
          onAction={(action) => {
            setOpen(false)
            action.onClick()
          }}
        />
        <MainFAB open={open} onToggle={() => setOpen((current) => !current)} />
      </div>
    )
  }

  return (
    <div ref={ref} className="fixed right-5 z-50 flex flex-col items-end gap-2.5" style={transactionFabPosition}>
      <ActionList
        open={open}
        actions={TX_ACTIONS}
        onAction={(action) => {
          setOpen(false)
          props.onSelect(action.type)
        }}
      />
      <MainFAB compact open={open} onToggle={() => setOpen((current) => !current)} />
    </div>
  )
}

function ActionList<T extends DashboardAction | (typeof TX_ACTIONS)[number]>({
  open,
  actions,
  onAction,
}: {
  open: boolean
  actions: readonly T[]
  onAction: (action: T) => void
}) {
  return (
    <AnimatePresence>
      {open && actions.map((action, index) => (
        <motion.div
          key={action.label}
          initial={{ opacity: 0, y: 10, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.85 }}
          transition={{ delay: (actions.length - 1 - index) * 0.05, duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-2.5"
        >
          <span
            className="hidden max-w-[190px] rounded-full px-3 py-1.5 text-xs font-semibold leading-none sm:inline-flex"
            style={{
              background: 'var(--surface-3)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            }}
          >
            {action.label}
          </span>
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => onAction(action)}
            aria-label={action.label}
            title={action.label}
            className="flex h-11 w-11 items-center justify-center rounded-full"
            style={{
              background: action.bg,
              color: action.color,
              boxShadow: `0 8px 22px ${action.shadow || `${action.bg}55`}`,
            }}
          >
            {action.icon}
          </motion.button>
        </motion.div>
      ))}
    </AnimatePresence>
  )
}

function MainFAB({ compact = false, open, onToggle }: { compact?: boolean; open: boolean; onToggle: () => void }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.92 }}
      whileHover={{ scale: 1.05 }}
      onClick={onToggle}
      className="relative z-10 flex items-center justify-center rounded-full"
      style={{
        width: 48,
        height: 48,
        background: open ? 'var(--surface-3)' : 'var(--accent)',
        color: open ? 'var(--text-primary)' : '#000',
        boxShadow: open ? '0 6px 20px rgba(0,0,0,0.35)' : '0 10px 26px rgba(34,197,94,0.42)',
        border: open ? '1px solid var(--border)' : 'none',
        transition: 'background 0.2s, color 0.2s, box-shadow 0.2s',
      }}
      aria-label={open ? 'Tutup menu cepat' : 'Buka menu cepat'}
    >
      <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
        <Plus size={compact ? 20 : 22} strokeWidth={2.6} />
      </motion.div>
    </motion.button>
  )
}
