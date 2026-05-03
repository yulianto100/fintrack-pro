'use client'

import { motion } from 'framer-motion'
import type { CreditCard } from '@/types'
import { generateCreditCardInsights } from '@/lib/credit-card-insights'

interface Props {
  card: CreditCard
}

const insightBg: Record<string, string> = {
  danger:  'rgba(239,68,68,0.09)',
  warning: 'rgba(245,158,11,0.09)',
  info:    'rgba(99,179,237,0.09)',
  success: 'rgba(34,197,94,0.09)',
}

const insightBorder: Record<string, string> = {
  danger:  'rgba(239,68,68,0.22)',
  warning: 'rgba(245,158,11,0.22)',
  info:    'rgba(99,179,237,0.22)',
  success: 'rgba(34,197,94,0.22)',
}

const insightColor: Record<string, string> = {
  danger:  '#ef4444',
  warning: '#f59e0b',
  info:    '#63b3ed',
  success: '#22c55e',
}

export function CreditCardInsights({ card }: Props) {
  const insights = generateCreditCardInsights(card)
  if (insights.length === 0) return null

  return (
    <div className="space-y-2">
      {insights.map((ins, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.07 }}
          className="flex items-start gap-3 p-3.5 rounded-2xl"
          style={{
            background: insightBg[ins.type]   || insightBg.info,
            border:     `1px solid ${insightBorder[ins.type] || insightBorder.info}`,
          }}
        >
          <span className="text-xl flex-shrink-0 mt-0.5">{ins.icon}</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: insightColor[ins.type] || 'var(--text-primary)' }}>
              {ins.title}
            </p>
            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {ins.message}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
