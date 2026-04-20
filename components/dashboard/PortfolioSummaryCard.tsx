'use client'

import Link from 'next/link'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { ArrowRight } from 'lucide-react'

interface Props {
  goldValue:     number
  goldGrams:     number
  stockCount:    number
  depositValue:  number
  depositCount:  number
}

const items = [
  { label: 'Emas',     icon: '🥇', href: '/portfolio/emas',     color: '#f6cc60', bg: 'rgba(246,204,96,0.12)' },
  { label: 'Saham',    icon: '📈', href: '/portfolio/saham',    color: '#63b3ed', bg: 'rgba(99,179,237,0.12)' },
  { label: 'Deposito', icon: '🏦', href: '/portfolio/deposito', color: '#d6aaff', bg: 'rgba(214,170,255,0.12)' },
]

export function PortfolioSummaryCard({ goldValue, goldGrams, stockCount, depositValue, depositCount }: Props) {
  const values = [
    { sub: `${formatNumber(goldGrams, 2)} gram`, value: goldValue,   showValue: true  },
    { sub: `${stockCount} emiten`,               value: null,         showValue: false },
    { sub: `${depositCount} aktif`,              value: depositValue, showValue: true  },
  ]

  return (
    <div className="glass-card overflow-hidden">
      {items.map((item, i) => (
        <Link key={item.label} href={item.href}>
          <div
            className="flex items-center gap-3 px-4 py-3 transition-all active:scale-[0.99]"
            style={{
              borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(52,211,110,0.04)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: item.bg }}>
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{values[i].sub}</p>
            </div>
            {values[i].showValue ? (
              <p className="text-sm font-bold font-mono flex-shrink-0" style={{ color: item.color }}>
                {formatCurrency(values[i].value || 0)}
              </p>
            ) : (
              <div className="flex items-center gap-1 flex-shrink-0" style={{ color: item.color }}>
                <span className="text-xs font-medium">Detail</span>
                <ArrowRight size={13} />
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}
