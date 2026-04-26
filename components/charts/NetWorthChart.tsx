'use client'
import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { Transaction } from '@/types'
import { formatCurrency } from '@/lib/utils'

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null

  return (
    <div
      className="px-3 py-2 rounded-xl text-xs"
      style={{
        background: 'rgba(255,255,255,0.90)',
        border: '1px solid rgba(34,197,94,0.18)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
      }}
    >
      <p style={{ color: '#6B7280' }}>{label}</p>
      <p className="font-bold mt-0.5" style={{ color: '#22C55E' }}>
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  )
}

interface Props {
  transactions: Transaction[]
  goldValue?: number
  stockValue?: number
  depositValue?: number
}

export function NetWorthChart({
  transactions,
  goldValue = 0,
  stockValue = 0,
  depositValue = 0,
}: Props) {

  // 🔥 DATA ASLI LU (TIDAK DIUBAH)
  const data = useMemo(() => {
    const months: string[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }

    let running = 0

    return months.map((m, idx) => {
      const inc = transactions
        .filter(t => t.type === 'income' && t.date.startsWith(m))
        .reduce((s, t) => s + t.amount, 0)

      const exp = transactions
        .filter(t => t.type === 'expense' && t.date.startsWith(m))
        .reduce((s, t) => s + t.amount, 0)

      running += inc - exp

      const label = new Date(m + '-01').toLocaleDateString('id-ID', { month: 'short' })
      const extra = idx === months.length - 1 ? goldValue + stockValue + depositValue : 0

      return {
        month: label,
        worth: Math.max(0, running + extra),
      }
    })
  }, [transactions, goldValue, stockValue, depositValue])

  // 🔥 GROWTH %
  const growth = useMemo(() => {
    if (data.length < 2) return 0
    const last = data[data.length - 1].worth
    const prev = data[data.length - 2].worth
    if (prev === 0) return 0
    return ((last - prev) / prev) * 100
  }, [data])

  const isUp = growth >= 0

  // 🔥 PEAK (TITIK TERTINGGI)
  const peak = useMemo(() => {
    return data.reduce((max, d) => (d.worth > max.worth ? d : max), data[0])
  }, [data])

  if (data.every(d => d.worth === 0)) return null

  return (
    <div>

      {/* 🔥 HEADER + GROWTH */}
      <div className="flex justify-between items-center mb-3 px-1">
        <p className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
          KEKAYAAN BERSIH (6 BULAN)
        </p>

        <div
          className="text-[11px] font-bold px-2 py-1 rounded-lg"
          style={{
            background: isUp ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)',
            color: isUp ? '#16A34A' : '#EF4444',
          }}
        >
          {isUp ? '+' : ''}
          {growth.toFixed(1)}%
        </div>
      </div>

      <div className="glass-card p-4" style={{ height: 170 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>

            {/* 🌈 GRADIENT DINAMIS */}
            <defs>
              <linearGradient id="gwGrad" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={isUp ? "#22C55E" : "#ef4444"}
                  stopOpacity={0.35}
                />
                <stop
                  offset="100%"
                  stopColor={isUp ? "#22C55E" : "#ef4444"}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>

            {/* GRID */}
            <CartesianGrid
              stroke="rgba(34,197,94,0.08)"
              strokeDasharray="2 4"
              vertical={false}
            />

            {/* AXIS */}
            <XAxis
              dataKey="month"
              tick={{ fill: '#9CA3AF', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />

            {/* TOOLTIP */}
            <Tooltip content={<Tip />} cursor={false} />

            {/* 🔥 AREA */}
            <Area
              type="natural"
              dataKey="worth"
              stroke={isUp ? "#22C55E" : "#EF4444"}
              strokeWidth={2.5}
              fill="url(#gwGrad)"
              dot={false}
              activeDot={(props: any) => {
                const isPeak = props.payload.month === peak.month

                return (
                  <g>
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={5}
                      fill={isUp ? "#22C55E" : "#EF4444"}
                    />

                    {isPeak && (
                      <text
                        x={props.cx}
                        y={props.cy - 12}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#facc15"
                      >
                        🔥
                      </text>
                    )}
                  </g>
                )
              }}
              style={{
                filter: `drop-shadow(0 0 6px ${
                  isUp
                    ? 'rgba(34,197,94,0.45)'
                    : 'rgba(239,68,68,0.6)'
                })`,
              }}
              isAnimationActive
              animationDuration={800}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}