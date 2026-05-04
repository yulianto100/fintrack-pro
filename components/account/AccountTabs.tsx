'use client'

import { memo }   from 'react'
import { motion } from 'framer-motion'

export type AccountTab = 'all' | 'bank' | 'credit' | 'ewallet'

const TABS: { id: AccountTab; label: string }[] = [
  { id: 'all',    label: 'Semua'       },
  { id: 'bank',   label: 'Rekening'   },
  { id: 'credit', label: 'Kartu Kredit' },
  { id: 'ewallet',label: 'E-Wallet'   },
]

interface Props {
  active:   AccountTab
  onChange: (tab: AccountTab) => void
}

export const AccountTabs = memo(function AccountTabs({ active, onChange }: Props) {
  return (
    <div
      className="flex gap-2 px-4 py-1 overflow-x-auto scrollbar-none"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {TABS.map(tab => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="relative flex-shrink-0 px-4 py-2 rounded-full text-[12px] font-semibold transition-colors"
            style={{
              color:      isActive ? 'var(--accent)'   : 'var(--text-muted)',
              background: isActive ? 'var(--accent-dim)' : 'var(--surface-card)',
              border:     `1px solid ${isActive ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
            }}
          >
            {isActive && (
              <motion.span
                layoutId="tab-bg"
                className="absolute inset-0 rounded-full"
                style={{ background: 'var(--accent-dim)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
})
