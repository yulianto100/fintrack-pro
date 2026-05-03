'use client'

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import type { CreditCard } from '@/types'
import { generateCreditCardInsights } from '@/lib/credit-card-insights'

interface Props {
  card: CreditCard
}

const typeStyle = {
  danger:  { bg: 'rgba(239,68,68,0.07)',  border: 'rgba(239,68,68,0.20)',  color: '#ef4444' },
  warning: { bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.20)', color: '#f59e0b' },
  info:    { bg: 'rgba(59,130,246,0.07)', border: 'rgba(59,130,246,0.20)', color: '#60a5fa' },
  success: { bg: 'rgba(34,197,94,0.07)',  border: 'rgba(34,197,94,0.20)',  color: '#22c55e' },
}

export function CreditCardInsights({ card }: Props) {
  const insights = generateCreditCardInsights(card)
  if (insights.length === 0) return null

  return (
    <div className="space-y-2.5">
      {/* AI header badge */}
      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)' }}
        >
          <Sparkles size={10} style={{ color: 'var(--accent)' }} />
          <span className="text-[9px] font-semibold tracking-wider" style={{ color: 'var(--accent)' }}>
            SMART INSIGHT
          </span>
        </div>
      </div>

      {insights.map((ins, i) => {
        const s = typeStyle[ins.type] || typeStyle.info
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
            className="flex items-start gap-3 p-4 rounded-2xl"
            style={{ background: s.bg, border: `1px solid ${s.border}` }}
          >
            <span className="text-lg flex-shrink-0 mt-0.5">{ins.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: s.color }}>{ins.title}</p>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {ins.message}
              </p>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
