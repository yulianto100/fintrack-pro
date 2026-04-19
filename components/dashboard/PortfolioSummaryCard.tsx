'use client'

import { formatCurrency, formatNumber } from '@/lib/utils'

interface Props {
  goldValue: number
  goldGrams: number
  stockCount: number
  depositValue: number
  depositCount: number
}

export function PortfolioSummaryCard({ goldValue, goldGrams, stockCount, depositValue, depositCount }: Props) {
  const items = [
    {
      icon: '🥇',
      label: 'Emas',
      sub: `${formatNumber(goldGrams, 2)} gram`,
      value: goldValue,
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.1)',
    },
    {
      icon: '📈',
      label: 'Saham',
      sub: `${stockCount} emiten`,
      value: null,
      color: '#3b82f6',
      bg: 'rgba(59,130,246,0.1)',
    },
    {
      icon: '🏦',
      label: 'Deposito',
      sub: `${depositCount} aktif`,
      value: depositValue,
      color: '#a855f7',
      bg: 'rgba(168,85,247,0.1)',
    },
  ]

  return (
    <div className="glass-card p-4 space-y-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: item.bg }}
          >
            {item.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {item.label}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.sub}</p>
          </div>
          {item.value !== null && (
            <p className="text-sm font-bold font-mono" style={{ color: item.color }}>
              {formatCurrency(item.value)}
            </p>
          )}
          {item.value === null && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Lihat detail →</p>
          )}
        </div>
      ))}
    </div>
  )
}
