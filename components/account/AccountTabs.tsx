'use client'

import { memo, useRef } from 'react'
import { motion, LayoutGroup } from 'framer-motion'

export type AccountTab = 'all' | 'bank' | 'credit' | 'ewallet'

const TABS: { id: AccountTab; label: string; emoji: string }[] = [
  { id: 'all',     label: 'Semua',       emoji: '⚡' },
  { id: 'bank',    label: 'Rekening',    emoji: '🏦' },
  { id: 'credit',  label: 'Kartu Kredit', emoji: '💳' },
  { id: 'ewallet', label: 'E-Wallet',    emoji: '📱' },
]

interface Props {
  active: AccountTab
  onChange: (tab: AccountTab) => void
}

export const AccountTabs = memo(function AccountTabs({ active, onChange }: Props) {
  return (
    <LayoutGroup>
      <div
        className="flex gap-2 px-4 py-1 overflow-x-auto scrollbar-none"
        style={{ WebkitOverflowScrolling: 'touch' }}
        role="tablist"
        aria-label="Filter akun"
      >
        {TABS.map(tab => {
          const isActive = tab.id === active
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className="relative flex-shrink-0 px-4 py-2 rounded-full text-[12px] font-semibold"
              style={{
                color: isActive ? '#fff' : 'var(--text-muted)',
                transition: 'color 150ms ease',
                border: isActive
                  ? '1px solid rgba(34,197,94,0.4)'
                  : '1px solid var(--border)',
                // Let the motion div handle the background
                background: isActive ? 'transparent' : 'var(--surface-card)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Animated fill pill */}
              {isActive && (
                <motion.span
                  layoutId="tab-active-pill"
                  className="absolute inset-0 rounded-full"
                  style={{ background: 'var(--accent)' }}
                  transition={{ type: 'spring', stiffness: 450, damping: 34, mass: 0.8 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <span className="text-[11px]">{tab.emoji}</span>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </LayoutGroup>
  )
})
