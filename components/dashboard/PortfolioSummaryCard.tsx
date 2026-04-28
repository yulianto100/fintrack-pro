'use client'

import Link from 'next/link'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { ArrowRight } from 'lucide-react'

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
  hidden?:         boolean
}

const ITEMS = [
  { label: 'Emas',      color: '#f6cc60', key: 'gold'      },
  { label: 'Saham',     color: '#63b3ed', key: 'stock'     },
  { label: 'Deposito',  color: '#d6aaff', key: 'deposit'   },
  { label: 'SBN',       color: '#c084fc', key: 'sbn'       },
  { label: 'Reksadana', color: '#38bdf8', key: 'reksadana' },
]

export function PortfolioSummaryCard({
  goldValue, goldGrams, stockCount, stockValue,
  depositValue, depositCount, sbnValue, sbnCount,
  reksadanaValue, reksadanaCount, hidden = false,
}: Props) {
  const values: Record<string, number> = {
    gold: goldValue, stock: stockValue, deposit: depositValue,
    sbn: sbnValue, reksadana: reksadanaValue,
  }
  const subs: Record<string, string> = {
    gold:      `${formatNumber(goldGrams, 2)} gram`,
    stock:     `${stockCount} emiten`,
    deposit:   `${depositCount} aktif`,
    sbn:       `${sbnCount} seri`,
    reksadana: `${reksadanaCount} produk`,
  }

  const total       = Object.values(values).reduce((s, v) => s + v, 0)
  const activeItems = ITEMS.filter((item) => values[item.key] > 0)

  const HiddenVal = ({ color }: { color: string }) => (
    <span className="text-xs font-bold font-mono" style={{ color: 'var(--text-muted)' }}>••••••</span>
  )

  return (
    <Link href="/portfolio">
      <div className="glass-card p-4 cursor-pointer active:scale-[0.99] transition-transform"
        style={{ borderColor: 'rgba(34,197,94,0.12)' }}>

        {/* Total row */}
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Total Portofolio Investasi</p>
            <p className="text-xl font-display font-bold mb-2.5" style={{ color: 'var(--text-primary)' }}>
              {hidden ? <span style={{ color: 'var(--text-muted)', letterSpacing: 2 }}>••••••••</span> : formatCurrency(total)}
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {activeItems.map((item) => {
                const pct = total > 0 ? ((values[item.key] / total) * 100).toFixed(0) : '0'
                return (
                  <div key={item.label} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {item.label} {hidden ? '–' : `${pct}%`}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <ArrowRight size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        </div>

        {/* Divider */}
        <div className="h-px mt-4 mb-3" style={{ background: 'var(--border)' }} />

        {/* Per-asset breakdown */}
        {activeItems.length > 0 ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              {activeItems.slice(0, 3).map((item) => (
                <div key={item.label} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                    <p className="text-[10px] font-medium truncate" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                  </div>
                  {hidden
                    ? <HiddenVal color={item.color} />
                    : <p className="text-xs font-bold font-mono" style={{ color: item.color }}>{formatCurrency(values[item.key])}</p>
                  }
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{subs[item.key]}</p>
                </div>
              ))}
            </div>
            {activeItems.length > 3 && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {activeItems.slice(3).map((item) => (
                  <div key={item.label} className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                      <p className="text-[10px] font-medium truncate" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                    </div>
                    {hidden
                      ? <HiddenVal color={item.color} />
                      : <p className="text-xs font-bold font-mono" style={{ color: item.color }}>{formatCurrency(values[item.key])}</p>
                    }
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{subs[item.key]}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>
            Belum ada investasi. Tap untuk mulai! 🚀
          </p>
        )}
      </div>
    </Link>
  )
}
