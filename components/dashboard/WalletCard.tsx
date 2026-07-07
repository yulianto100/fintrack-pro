'use client'

import { Building2, Smartphone, Wallet, type LucideIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import type { WalletType } from '@/types'
import { dashboardColors, dashboardRadius } from './dashboardTokens'

const WALLET_CONFIG: Record<WalletType, {
  Icon: LucideIcon
  label: string
  color: string
  bg: string
  portfolioHref: string
}> = {
  cash: {
    Icon: Wallet,
    label: 'Cash',
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.12)',
    portfolioHref: '/transactions?wallet=cash',
  },
  bank: {
    Icon: Building2,
    label: 'Bank',
    color: '#60A5FA',
    bg: 'rgba(96,165,250,0.12)',
    portfolioHref: '/akun?tab=rekening',
  },
  ewallet: {
    Icon: Smartphone,
    label: 'E-Wallet',
    color: '#C084FC',
    bg: 'rgba(192,132,252,0.12)',
    portfolioHref: '/akun?tab=ewallet',
  },
}

interface Props {
  type: WalletType
  balance: number
  hidden?: boolean
}

const MASKED = '******'

export function WalletCard({ type, balance, hidden = false }: Props) {
  const config = WALLET_CONFIG[type]
  const router = useRouter()
  const Icon = config.Icon
  const valueColor = balance >= 0 ? dashboardColors.text : dashboardColors.expenseStrong

  return (
    <button
      type="button"
      onClick={() => router.push(config.portfolioHref)}
      className="glass-card flex min-h-[88px] w-full flex-col items-center justify-between p-2.5 text-center transition-transform active:scale-[0.97]"
      style={{ borderRadius: dashboardRadius.cardSm }}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-2xl" style={{ background: config.bg, color: config.color }}>
        <Icon size={18} strokeWidth={2.2} />
      </div>
      <div className="min-w-0">
        <p className="mb-1 text-xs leading-tight" style={{ color: dashboardColors.muted }}>
          {config.label}
        </p>
        <p
          className="max-w-full truncate text-[12px] font-bold leading-tight font-mono"
          style={{ color: hidden ? dashboardColors.muted : valueColor, letterSpacing: hidden ? 2 : 0 }}
        >
          {hidden ? MASKED : formatCurrency(balance)}
        </p>
      </div>
    </button>
  )
}
