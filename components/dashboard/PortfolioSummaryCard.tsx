'use client'

import Link from 'next/link'
import { formatCurrency, formatNumber } from '@/lib/utils'

interface Props {
  goldValue:       number
  goldGrams:       number
  stockCount:      number
  stockValue:      number
  depositValue:    number
  depositCount:    number
  sbnValue:        number
  sbnCount:        number
  reksadanaValue:  number
  reksadanaCount:  number
}

const ITEMS = [
  { label: 'Emas',      icon: '🥇', href: '/portfolio/emas',      color: '#f6cc60', bg: 'rgba(246,204,96,0.12)'  },
  { label: 'Saham',     icon: '📈', href: '/portfolio/saham',     color: '#63b3ed', bg: 'rgba(99,179,237,0.12)'  },
  { label: 'Deposito',  icon: '🏦', href: '/portfolio/deposito',  color: '#d6aaff', bg: 'rgba(214,170,255,0.12)' },
  { label: 'SBN',       icon: '🏛️', href: '/portfolio/sbn',       color: '#c084fc', bg: 'rgba(192,132,252,0.12)' },
  { label: 'Reksadana', icon: '📦', href: '/portfolio/reksadana', color: '#38bdf8', bg: 'rgba(56,189,248,0.12)'  },
]

export function PortfolioSummaryCard({
  goldValue, goldGrams, stockCount, stockValue,
  depositValue, depositCount, sbnValue, sbnCount,
  reksadanaValue, reksadanaCount,
}: Props) {
  const rows = [
    { sub: `${formatNumber(goldGrams, 2)} gram`, value: goldValue       },
    { sub: `${stockCount} emiten`,               value: stockValue      },
    { sub: `${depositCount} aktif`,              value: depositValue    },
    { sub: `${sbnCount} seri`,                   value: sbnValue        },
    { sub: `${reksadanaCount} produk`,            value: reksadanaValue  },
  ]

  return (
    <div className="glass-card overflow-hidden">
      {ITEMS.map((item, i) => (
        <Link key={item.label} href={item.href}>
          <div
            className="flex items-center gap-3 px-4 py-3 transition-all active:scale-[0.99]"
            style={{
              borderBottom: i < ITEMS.length - 1 ? '1px solid var(--border)' : 'none',
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
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{rows[i].sub}</p>
            </div>
            <p className="text-sm font-bold font-mono flex-shrink-0" style={{ color: item.color }}>
              {formatCurrency(rows[i].value)}
            </p>
          </div>
        </Link>
      ))}
    </div>
  )
}
