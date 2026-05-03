'use client'

import { motion } from 'framer-motion'
import { Eye, EyeOff, CreditCard } from 'lucide-react'
import type { CreditCard as CreditCardType } from '@/types'

interface Props {
  card: CreditCardType
  hidden?: boolean
  onToggleHidden?: () => void
}

function usageColor(pct: number) {
  if (pct >= 80) return '#ef4444'
  if (pct >= 50) return '#f59e0b'
  return '#22c55e'
}

export function CreditCardHero({ card, hidden = false, onToggleHidden }: Props) {
  const pct       = card.limit > 0 ? Math.min((card.used / card.limit) * 100, 100) : 0
  const remaining = card.limit - card.used
  const barColor  = usageColor(pct)

  const fmt = (n: number) =>
    hidden ? '••••••' : `Rp ${n.toLocaleString('id-ID')}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl overflow-hidden p-5 select-none"
      style={{
        background: `linear-gradient(135deg, #0d2518 0%, #0a1f14 50%, #061209 100%)`,
        border:     '1px solid rgba(34,197,94,0.25)',
        boxShadow:  '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(34,197,94,0.12)',
      }}
    >
      {/* Glow effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 80% 20%, ${card.color || '#22c55e'}18 0%, transparent 60%)`,
        }}
      />

      {/* Card chip + logo row */}
      <div className="relative flex items-start justify-between mb-5">
        <div>
          <p className="text-[10px] font-semibold tracking-widest mb-1" style={{ color: 'rgba(34,197,94,0.6)' }}>
            KARTU KREDIT
          </p>
          <p className="font-display font-bold text-lg leading-tight" style={{ color: 'var(--text-primary)' }}>
            {card.name}
          </p>
          {card.bankName && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{card.bankName}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onToggleHidden && (
            <button
              onClick={onToggleHidden}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.07)' }}
            >
              {hidden
                ? <EyeOff size={14} style={{ color: 'var(--text-muted)' }} />
                : <Eye    size={14} style={{ color: 'var(--text-muted)' }} />
              }
            </button>
          )}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)' }}
          >
            <CreditCard size={20} style={{ color: card.color || '#22c55e' }} />
          </div>
        </div>
      </div>

      {/* Last 4 */}
      {card.last4 && (
        <p className="text-xs tracking-[0.25em] mb-4 font-mono" style={{ color: 'var(--text-muted)' }}>
          •••• •••• •••• {card.last4}
        </p>
      )}

      {/* Amounts row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'Limit',       value: fmt(card.limit),   accent: false },
          { label: 'Terpakai',    value: fmt(card.used),    accent: true  },
          { label: 'Sisa Limit',  value: fmt(remaining),    accent: false },
        ].map((item) => (
          <div key={item.label}>
            <p className="text-[9px] tracking-wider mb-1 font-semibold" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {item.label.toUpperCase()}
            </p>
            <p
              className="text-sm font-bold font-mono truncate"
              style={{ color: item.accent ? barColor : 'var(--text-primary)' }}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between mb-1.5">
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Penggunaan</span>
          <span className="text-[10px] font-bold" style={{ color: barColor }}>{pct.toFixed(1)}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${barColor}99, ${barColor})`,
              boxShadow:  `0 0 8px ${barColor}60`,
            }}
          />
        </div>
      </div>

      {/* Due date badges */}
      <div className="flex gap-2 mt-4">
        {[
          { label: 'Tgl Tagihan', value: card.billingDate },
          { label: 'Jatuh Tempo', value: card.dueDate },
        ].map((b) => (
          <div
            key={b.label}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px]"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <span style={{ color: 'rgba(255,255,255,0.35)' }}>{b.label}:</span>
            <span className="font-bold" style={{ color: 'var(--text-secondary)' }}>
              Tanggal {b.value}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
