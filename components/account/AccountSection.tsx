'use client'

import { memo }             from 'react'
import { motion }           from 'framer-motion'
import type { ReactNode }   from 'react'

interface Props {
  title:    string
  count?:   number
  children: ReactNode
  delay?:   number
}

export const AccountSection = memo(function AccountSection({
  title,
  count,
  children,
  delay = 0,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay, ease: [0.23, 1, 0.32, 1] }}
    >
      {/* Section header */}
      <div className="flex items-center justify-between px-4 mb-2">
        <span className="text-[11px] font-semibold tracking-widest uppercase"
          style={{ color: 'var(--text-muted)' }}>
          {title}
        </span>
        {count !== undefined && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{
              background: 'var(--accent-dim)',
              color:      'var(--accent)',
            }}
          >
            {count}
          </span>
        )}
      </div>

      {/* Items container */}
      <div
        className="mx-4 rounded-2xl overflow-hidden"
        style={{
          border:     '1px solid var(--border)',
          background: 'var(--surface-card)',
        }}
      >
        {children}
      </div>
    </motion.div>
  )
})
