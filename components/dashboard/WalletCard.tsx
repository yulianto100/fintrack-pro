'use client'

import { formatCurrency } from '@/lib/utils'
import type { WalletType } from '@/types'

const WALLET_CONFIG: Record<WalletType, { icon: string; label: string; color: string; bg: string }> = {
  cash: {
    icon: '💵',
    label: 'Cash',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.1)',
  },
  bank: {
    icon: '🏦',
    label: 'Bank',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.1)',
  },
  ewallet: {
    icon: '📱',
    label: 'E-Wallet',
    color: '#a855f7',
    bg: 'rgba(168,85,247,0.1)',
  },
}

interface Props {
  type: WalletType
  balance: number
}

export function WalletCard({ type, balance }: Props) {
  const config = WALLET_CONFIG[type]

  return (
    <div
      className="glass-card p-3 flex flex-col items-center gap-2 text-center"
      style={{ minHeight: 90 }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
        style={{ background: config.bg }}
      >
        {config.icon}
      </div>
      <div>
        <p className="text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>{config.label}</p>
        <p
          className="text-xs font-bold font-mono leading-tight"
          style={{ color: balance >= 0 ? 'var(--text-primary)' : 'var(--red)' }}
        >
          {formatCurrency(balance)}
        </p>
      </div>
    </div>
  )
}
