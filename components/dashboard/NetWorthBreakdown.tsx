'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, Shield } from 'lucide-react'
import type { NetWorthAsset } from '@/types'

interface Props {
  cashBalance: number
  bankBalance: number
  ewalletBalance: number
  goldValue: number
  stockValue: number
  depositValue: number
  sbnValue: number
  reksadanaValue: number
  hidden?: boolean
}

const COLORS = {
  cash:      '#22C55E',
  bank:      '#3B82F6',
  ewallet:   '#A855F7',
  gold:      '#F59E0B',
  stock:     '#06B6D4',
  deposit:   '#8B5CF6',
  sbn:       '#EC4899',
  reksadana: '#14B8A6',
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div className="px-3 py-2 rounded-xl text-xs font-medium"
      style={{ background: 'rgba(10, 26, 15, 0.95)', border: '1px solid rgba(34,197,94,0.25)', color: 'var(--text-primary)' }}>
      <p>{name}</p>
      <p className="font-bold" style={{ color: 'var(--accent)' }}>{formatCurrency(value)}</p>
    </div>
  )
}

export function NetWorthBreakdown({
  cashBalance, bankBalance, ewalletBalance,
  goldValue, stockValue, depositValue,
  sbnValue, reksadanaValue,
  hidden = false,
}: Props) {
  const assets: NetWorthAsset[] = useMemo(() => {
    const raw = [
      { label: 'Cash',      value: cashBalance,    color: COLORS.cash,      type: 'asset' as const },
      { label: 'Bank',      value: bankBalance,    color: COLORS.bank,      type: 'asset' as const },
      { label: 'E-Wallet',  value: ewalletBalance, color: COLORS.ewallet,   type: 'asset' as const },
      { label: 'Emas',      value: goldValue,       color: COLORS.gold,      type: 'asset' as const },
      { label: 'Saham',     value: stockValue,      color: COLORS.stock,     type: 'asset' as const },
      { label: 'Deposito',  value: depositValue,    color: COLORS.deposit,   type: 'asset' as const },
      { label: 'SBN',       value: sbnValue,        color: COLORS.sbn,       type: 'asset' as const },
      { label: 'Reksadana', value: reksadanaValue,  color: COLORS.reksadana, type: 'asset' as const },
    ]
    return raw.filter((a) => a.value > 0)
  }, [cashBalance, bankBalance, ewalletBalance, goldValue, stockValue, depositValue, sbnValue, reksadanaValue])

  const totalAssets     = assets.filter((a) => a.type === 'asset').reduce((s, a) => s + a.value, 0)
  const totalLiabilities = 0 // Future: add liabilities support
  const netWorth        = totalAssets - totalLiabilities

  if (totalAssets === 0) return null

  const chartData = assets.map((a) => ({ name: a.label, value: a.value, color: a.color }))

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="glass-card p-5"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--accent-dim)' }}>
          <Shield size={16} color="var(--accent)" />
        </div>
        <div>
          <p className="font-display font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
            Net Worth Breakdown
          </p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Aset vs kewajiban</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Aset Bersih</p>
          <p className="font-display font-bold text-sm" style={{ color: netWorth >= 0 ? 'var(--accent)' : 'var(--red)' }}>
            {hidden ? '••••••' : formatCurrency(netWorth)}
          </p>
        </div>
      </div>

      {/* Pie Chart */}
      <div className="flex items-center gap-4">
        <div style={{ width: 110, height: 110, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={50}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-2">
          {assets.map((a) => {
            const pct = totalAssets > 0 ? ((a.value / totalAssets) * 100).toFixed(0) : '0'
            return (
              <div key={a.label} className="flex items-center gap-1.5 min-w-0">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: a.color }} />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium truncate" style={{ color: 'var(--text-muted)' }}>
                    {a.label} <span style={{ color: a.color }}>{pct}%</span>
                  </p>
                  <p className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {hidden ? '••••' : formatCurrency(a.value)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Asset vs Liability summary bar */}
      <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex justify-between text-xs mb-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
            <span style={{ color: 'var(--text-muted)' }}>Aset</span>
            <span className="font-semibold" style={{ color: 'var(--accent)' }}>
              {hidden ? '••••' : formatCurrency(totalAssets)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--red)' }} />
            <span style={{ color: 'var(--text-muted)' }}>Kewajiban</span>
            <span className="font-semibold" style={{ color: totalLiabilities > 0 ? 'var(--red)' : 'var(--text-muted)' }}>
              {hidden ? '••••' : formatCurrency(totalLiabilities)}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--red-dim)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${totalAssets > 0 ? Math.min(100, (totalAssets / (totalAssets + totalLiabilities || 1)) * 100) : 100}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #22C55E, #4ADE80)' }}
          />
        </div>

        {totalLiabilities === 0 && (
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp size={10} color="var(--accent)" />
            <p className="text-[10px]" style={{ color: 'var(--accent)' }}>
              Tidak ada kewajiban — keuangan sehat!
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
