'use client'

import { formatCurrency } from '@/lib/utils'
import type { WalletType } from '@/types'
import { useRouter } from 'next/navigation'

const WALLET_CONFIG: Record<WalletType, { icon: string; label: string; color: string; bg: string; portfolioHref: string }> = {
  cash: {
    icon: '💵', label: 'Cash', color: '#22c55e',
    bg: 'rgba(34,197,94,0.1)', portfolioHref: '/transactions?wallet=cash',
  },
  bank: {
    icon: '🏦', label: 'Bank', color: '#3b82f6',
    bg: 'rgba(59,130,246,0.1)', portfolioHref: '/akun?tab=rekening',
  },
  ewallet: {
    icon: '📱', label: 'E-Wallet', color: '#a855f7',
    bg: 'rgba(168,85,247,0.1)', portfolioHref: '/akun?tab=ewallet',
  },
}

interface Props {
  type:    WalletType
  balance: number
  hidden?: boolean
}

export function WalletCard({ type, balance, hidden = false }: Props) {
  const config = WALLET_CONFIG[type]
  const router = useRouter()

  return (
    <button
      onClick={() => router.push(config.portfolioHref)}
      className="glass-card p-3 flex flex-col items-center gap-2 text-center w-full active:scale-[0.97] transition-transform cursor-pointer"
      style={{ minHeight: 90 }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: config.bg }}>
        {config.icon}
      </div>
      <div>
        <p className="text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>{config.label}</p>
        <p
          className="text-xs font-bold font-mono leading-tight"
          style={{ color: hidden ? 'var(--text-muted)' : (balance >= 0 ? 'var(--text-primary)' : 'var(--red)') }}
        >
          {hidden ? '••••••' : formatCurrency(balance)}
        </p>
      </div>
    </button>
  )
}
