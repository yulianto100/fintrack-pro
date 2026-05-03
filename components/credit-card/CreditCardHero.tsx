'use client'

import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import type { CreditCard as CreditCardType } from '@/types'

interface Props {
  card: CreditCardType
  hidden?: boolean
  onToggleHidden?: () => void
}

function usageColor(pct: number): { bar: string; glow: string; text: string } {
  if (pct >= 70) return { bar: 'linear-gradient(90deg,#ef4444aa,#ef4444)', glow: '#ef444460', text: '#ef4444' }
  if (pct >= 30) return { bar: 'linear-gradient(90deg,#f59e0baa,#f59e0b)', glow: '#f59e0b60', text: '#f59e0b' }
  return { bar: 'linear-gradient(90deg,#22c55eaa,#22c55e)', glow: '#22c55e60', text: '#22c55e' }
}

function bankInitials(name: string): string {
  const map: Record<string, string> = {
    bca: 'BCA', bni: 'BNI', bri: 'BRI', mandiri: 'MDR',
    cimb: 'CIMB', ocbc: 'OCBC', danamon: 'DNM', permata: 'PMT',
  }
  const key = name.toLowerCase().replace(/\s+/g, '')
  for (const [k, v] of Object.entries(map)) {
    if (key.includes(k)) return v
  }
  return name.slice(0, 3).toUpperCase()
}

function formatDue(day: number): string {
  const today = new Date()
  let d = new Date(today.getFullYear(), today.getMonth(), day)
  if (d < today) d = new Date(today.getFullYear(), today.getMonth() + 1, day)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

export function CreditCardHero({ card, hidden = false, onToggleHidden }: Props) {
  const pct       = card.limit > 0 ? Math.min((card.used / card.limit) * 100, 100) : 0
  const remaining = card.limit - card.used
  const color     = usageColor(pct)

  const fmt = (n: number) =>
    hidden ? '••••••' : `Rp ${n.toLocaleString('id-ID')}`

  const initials = card.bankName ? bankInitials(card.bankName) : '●'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className="relative rounded-3xl overflow-hidden select-none"
      style={{
        background: `linear-gradient(145deg, #0B3B2E 0%, #071f18 55%, #040f0b 100%)`,
        border:     '1px solid rgba(34,197,94,0.20)',
        boxShadow:  '0 16px 48px rgba(0,0,0,0.45), 0 2px 0 rgba(34,197,94,0.10) inset',
        padding:    '22px 22px 20px',
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: -40, right: -30, width: 180, height: 180, borderRadius: '50%',
          background: `radial-gradient(circle, ${card.color || '#22c55e'}22 0%, transparent 70%)`,
        }}
      />
      {/* Noise texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.025,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '120px',
        }}
      />

      {/* Row 1: Bank + card name + eye */}
      <div className="relative flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wider"
            style={{
              background: 'rgba(34,197,94,0.13)',
              border: '1px solid rgba(34,197,94,0.25)',
              color: '#22c55e',
              fontFamily: 'var(--font-jetbrains)',
            }}
          >
            {initials}
          </div>
          <div>
            <p className="font-bold text-base leading-tight" style={{ color: '#fff', fontFamily: 'var(--font-syne)' }}>
              {card.name}
            </p>
            {card.bankName && (
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>{card.bankName}</p>
            )}
          </div>
        </div>
        <button
          onClick={onToggleHidden}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}
          aria-label={hidden ? 'Tampilkan saldo' : 'Sembunyikan saldo'}
        >
          {hidden
            ? <EyeOff size={15} style={{ color: 'rgba(255,255,255,0.45)' }} />
            : <Eye    size={15} style={{ color: 'rgba(255,255,255,0.45)' }} />
          }
        </button>
      </div>

      {/* Masked card number */}
      {card.last4 && (
        <p className="tracking-[0.28em] text-[12px] mb-5" style={{ color: 'rgba(255,255,255,0.28)', fontFamily: 'var(--font-jetbrains)' }}>
          •••• •••• •••• {card.last4}
        </p>
      )}

      {/* PRIMARY: Used amount */}
      <div className="mb-1">
        <p className="text-[9px] font-semibold tracking-[0.18em] mb-1" style={{ color: 'rgba(255,255,255,0.32)' }}>
          TOTAL TERPAKAI
        </p>
        <motion.p
          key={`${card.id}-${hidden}`}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[30px] font-bold leading-none"
          style={{ color: color.text, fontFamily: 'var(--font-syne)', letterSpacing: '-0.5px' }}
        >
          {fmt(card.used)}
        </motion.p>
      </div>

      {/* SECONDARY + TERTIARY */}
      <div className="flex items-center gap-4 mt-3 mb-5">
        <div>
          <p className="text-[9px] tracking-widest font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.28)' }}>SISA LIMIT</p>
          <p className="text-[13px] font-semibold" style={{ color: 'rgba(255,255,255,0.72)', fontFamily: 'var(--font-jetbrains)' }}>
            {fmt(remaining)}
          </p>
        </div>
        <div className="w-px h-6 self-center" style={{ background: 'rgba(255,255,255,0.10)' }} />
        <div>
          <p className="text-[9px] tracking-widest font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.28)' }}>TOTAL LIMIT</p>
          <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.38)', fontFamily: 'var(--font-jetbrains)' }}>
            {fmt(card.limit)}
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[9px] tracking-widest font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.28)' }}>USAGE</p>
          <p className="text-[13px] font-bold" style={{ color: color.text, fontFamily: 'var(--font-jetbrains)' }}>
            {pct.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-[5px] rounded-full overflow-hidden mb-4" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1], delay: 0.2 }}
          className="h-full rounded-full"
          style={{ background: color.bar, boxShadow: `0 0 10px ${color.glow}` }}
        />
      </div>

      {/* Date badges */}
      <div className="flex gap-2">
        {[
          { label: 'Tgl Tagihan', value: `Tgl ${card.billingDate}` },
          { label: 'Jatuh Tempo', value: formatDue(card.dueDate) },
        ].map((b) => (
          <div
            key={b.label}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl flex-1 justify-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <span className="text-[9px] tracking-wider" style={{ color: 'rgba(255,255,255,0.30)' }}>
              {b.label.toUpperCase()}
            </span>
            <span className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.62)', fontFamily: 'var(--font-jetbrains)' }}>
              {b.value}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
