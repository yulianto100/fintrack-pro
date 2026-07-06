'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeftRight, Plus, TrendingDown, TrendingUp } from 'lucide-react'
import { haptics } from '@/lib/haptics'

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
            haptics.medium()
            setOpen(false)
            action.onClick()
          }}
        />
        <MainFAB open={open} onToggle={() => {
          haptics.medium()
          setOpen((current) => !current)
        }} />
      </div>
    )
  }

  return (
    <div ref={ref} className="fixed right-5 z-50 flex flex-col items-end gap-2.5" style={transactionFabPosition}>
      <ActionList
        open={open}
        actions={TX_ACTIONS}
        onAction={(action) => {
          haptics.medium()
          setOpen(false)
          props.onSelect(action.type)
        }}
      />
      <MainFAB compact open={open} onToggle={() => {
        haptics.medium()
        setOpen((current) => !current)
      }} />
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
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[-1]"
            style={{ background: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(2px)' }}
          />
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-4 right-4 z-[-1] rounded-[28px] p-3"
            style={{
              bottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom,0px) + 84px)',
              background: 'color-mix(in srgb, var(--surface-2) 94%, transparent)',
              border: '1px solid var(--border)',
              boxShadow: '0 22px 60px rgba(0,0,0,0.34)',
              backdropFilter: 'blur(24px) saturate(1.4)',
            }}
          >
            <p className="px-2 pb-2 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              Aksi cepat
            </p>
            <div className="grid gap-2">
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => onAction(action)}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition-transform active:scale-[0.99]"
                  style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                    style={{ background: action.bg, color: action.color, boxShadow: `0 8px 20px ${action.shadow || `${action.bg}55`}` }}
                  >
                    {action.icon}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
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
