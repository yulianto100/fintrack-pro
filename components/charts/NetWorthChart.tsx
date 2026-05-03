'use client'

import { useMemo, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceDot,
} from 'recharts'
import type { Transaction } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { isExpenseForSummary } from '@/lib/transaction-rules'

// ─── Types ────────────────────────────────────────────────────────────────────

type Range = 'YTD' | '3M' | '6M' | '1Y'

interface DataPoint {
  month:     string
  worth:     number
  prevWorth: number
  change:    number
  changePct: number
}

// ─── Enhanced Tooltip ─────────────────────────────────────────────────────────

const EnhancedTip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null

  const point = payload[0].payload as DataPoint
  const { month, worth, change, changePct } = point
  const isUp     = change >= 0
  const hasChange = change !== 0

  return (
    <div
      style={{
        background:           'var(--surface-close)',
        border:               '1px solid rgba(34,197,94,0.22)',
        backdropFilter:       'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius:         12,
        padding:              '10px 14px',
        boxShadow:            '0 8px 24px rgba(0,0,0,0.22)',
        minWidth:             158,
        animation:            'tooltipAppear 0.12s ease-out both',
      }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1"
        style={{ color: 'var(--text-muted)' }}>
        {month}
      </p>
      <p className="text-sm font-bold font-mono mb-1" style={{ color: '#22C55E' }}>
        {formatCurrency(worth)}
      </p>
      {hasChange && (
        <div className="flex items-center gap-1 text-[10px] font-semibold"
          style={{ color: isUp ? '#22C55E' : 'var(--red, #EF4444)' }}>
          <span>{isUp ? '↑' : '↓'}</span>
          <span>{isUp ? '+' : ''}{formatCurrency(Math.abs(change))}</span>
          <span style={{ opacity: 0.65 }}>
            ({isUp ? '+' : ''}{changePct.toFixed(1)}%)
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  transactions:  Transaction[]
  goldValue?:    number
  stockValue?:   number
  depositValue?: number
}

export function NetWorthChart({
  transactions,
  goldValue    = 0,
  stockValue   = 0,
  depositValue = 0,
}: Props) {
  const [range, setRange] = useState<Range>('YTD')

  // ── Build dataset ──────────────────────────────────────────────────────────
  const data = useMemo((): DataPoint[] => {
    const now = new Date()

    // Build month list based on range
    const months: string[] = []

    if (range === 'YTD') {
      // January of current year → current month
      const currentYear  = now.getFullYear()
      const currentMonth = now.getMonth() // 0-indexed
      for (let m = 0; m <= currentMonth; m++) {
        months.push(`${currentYear}-${String(m + 1).padStart(2, '0')}`)
      }
    } else {
      const monthCount =
        range === '3M' ?  3 :
        range === '6M' ?  6 : 12
      for (let i = monthCount - 1; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        months.push(
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        )
      }
    }

    let running = 0
    const rawPoints = months.map((m, idx) => {
      const inc = transactions
        .filter(t => t.type === 'income'  && t.date.startsWith(m))
        .reduce((s, t) => s + t.amount, 0)
      const exp = transactions
        .filter(t => isExpenseForSummary(t) && t.date.startsWith(m))
        .reduce((s, t) => s + t.amount, 0)
      running += inc - exp
      const label = new Date(m + '-01').toLocaleDateString('id-ID', { month: 'short' })
      const extra = idx === months.length - 1 ? goldValue + stockValue + depositValue : 0
      return { month: label, worth: Math.max(0, running + extra) }
    })

    return rawPoints.map((p, i) => {
      const prevWorth = i > 0 ? rawPoints[i - 1].worth : p.worth
      const change    = p.worth - prevWorth
      const changePct = prevWorth > 0 ? (change / prevWorth) * 100 : 0
      return { ...p, prevWorth, change, changePct }
    })
  }, [transactions, goldValue, stockValue, depositValue, range])

  // ── Growth % ───────────────────────────────────────────────────────────────
  const growth = useMemo(() => {
    if (data.length < 2) return 0
    const last = data[data.length - 1].worth
    const prev = data[data.length - 2].worth
    if (prev === 0) return 0
    return ((last - prev) / prev) * 100
  }, [data])

  const isUp = growth >= 0

  // ── Peak & trough ──────────────────────────────────────────────────────────
  const { peak, trough } = useMemo(() => {
    if (data.length === 0) return { peak: null, trough: null }
    const p = data.reduce((mx, d) => d.worth > mx.worth ? d : mx, data[0])
    const t = data.reduce((mn, d) => d.worth < mn.worth ? d : mn, data[0])
    return { peak: p, trough: t.month !== p.month ? t : null }
  }, [data])

  if (data.every(d => d.worth === 0)) return null

  const RANGES: Range[] = ['YTD', '3M', '6M', '1Y']

  return (
    <div>
      {/* Header row */}
      <div className="flex justify-between items-center mb-3 px-1"
        style={{ position: 'relative', zIndex: 2 }}>
        <p className="text-[11px] font-semibold tracking-wider"
          style={{ color: 'var(--text-muted)' }}>
          KEKAYAAN BERSIH
        </p>

        <div className="flex items-center gap-0.5">
          {RANGES.map(r => (
            <button
              key={r}
              onClick={(e) => { e.stopPropagation(); setRange(r) }}
              className="px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all duration-150 active:scale-95"
              style={{
                background:    range === r ? 'rgba(34,197,94,0.15)' : 'transparent',
                color:         range === r ? '#22C55E' : 'var(--text-muted)',
                border:        range === r
                  ? '1px solid rgba(34,197,94,0.30)'
                  : '1px solid transparent',
                position:      'relative',
                zIndex:        3,
                pointerEvents: 'auto',
              }}
            >
              {r}
            </button>
          ))}

          <div
            className="ml-1.5 text-[11px] font-bold px-2 py-1 rounded-lg"
            style={{
              background: isUp ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)',
              color:      isUp ? '#16A34A' : '#EF4444',
            }}
          >
            {isUp ? '+' : ''}{growth.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Chart area — overflow:hidden prevents Recharts SVG overlay from escaping into button zone */}
      <div className="glass-card p-4"
        style={{ height: 180, overflow: 'hidden', isolation: 'isolate', position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 18, right: 12, left: 12, bottom: 0 }}>
            <defs>
              <linearGradient id="gwGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={isUp ? '#22C55E' : '#ef4444'} stopOpacity={0.32} />
                <stop offset="100%" stopColor={isUp ? '#22C55E' : '#ef4444'} stopOpacity={0}    />
              </linearGradient>
            </defs>

            <CartesianGrid
              stroke="rgba(34,197,94,0.08)"
              strokeDasharray="2 4"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fill: '#9CA3AF', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />

            <Tooltip content={<EnhancedTip />} cursor={false} />

            <Area
              type="natural"
              dataKey="worth"
              stroke={isUp ? '#22C55E' : '#EF4444'}
              strokeWidth={2.5}
              fill="url(#gwGrad)"
              dot={false}
              activeDot={(props: any) => (
                <circle
                  cx={props.cx} cy={props.cy} r={5}
                  fill={isUp ? '#22C55E' : '#EF4444'}
                  style={{
                    filter: `drop-shadow(0 0 5px ${
                      isUp ? 'rgba(34,197,94,0.70)' : 'rgba(239,68,68,0.70)'
                    })`,
                  }}
                />
              )}
              style={{
                filter: `drop-shadow(0 0 6px ${
                  isUp ? 'rgba(34,197,94,0.45)' : 'rgba(239,68,68,0.55)'
                })`,
              }}
              isAnimationActive
              animationDuration={700}
              animationEasing="ease-out"
            />

            {/* ● Peak dot */}
            {peak && (
              <ReferenceDot
                x={peak.month} y={peak.worth}
                r={4}
                fill="#22C55E"
                stroke="rgba(255,255,255,0.90)"
                strokeWidth={2}
              />
            )}

            {/* ● Trough dot */}
            {trough && (
              <ReferenceDot
                x={trough.month} y={trough.worth}
                r={4}
                fill="#EF4444"
                stroke="rgba(255,255,255,0.90)"
                strokeWidth={2}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Peak / trough legend */}
      {(peak || trough) && (
        <div className="flex items-center gap-4 mt-1.5 px-1">
          {peak && (
            <div className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#22C55E' }} />
              <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                Tertinggi · {peak.month}
              </span>
            </div>
          )}
          {trough && (
            <div className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#EF4444' }} />
              <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                Terendah · {trough.month}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
