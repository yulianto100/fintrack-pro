'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'
import type { Transaction } from '@/types'
import { generateWeeklySummary } from '@/lib/prediction'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

export function WeeklySummary({ transactions }: { transactions: Transaction[] }) {
  const summary = useMemo(() => generateWeeklySummary(transactions), [transactions])

  if (summary.txCount === 0) return null

  const isPositive  = summary.balance >= 0
  const vsPositive  = summary.vsLastWeek <= 0
  const vsAbs       = Math.abs(summary.vsLastWeek)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>RINGKASAN MINGGU INI</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {summary.txCount} transaksi · Top: {summary.topCategory}
          </p>
        </div>
        {summary.vsLastWeek !== 0 && (
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold"
            style={{
              background: vsPositive ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.1)',
              color:      vsPositive ? 'var(--accent)' : 'var(--red)',
            }}
          >
            {vsPositive ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
            {vsPositive ? '-' : '+'}{vsAbs.toFixed(0)}% pengeluaran
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Masuk',  value: summary.income,  color: 'var(--accent)', icon: '↑' },
          { label: 'Keluar', value: summary.expense, color: 'var(--red)',    icon: '↓' },
          { label: 'Saldo',  value: summary.balance, color: isPositive ? 'var(--accent)' : 'var(--red)', icon: isPositive ? '✓' : '!' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="rounded-xl p-3 text-center"
            style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
            <p className="text-[9px] mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
            <p className="text-xs font-bold font-mono leading-tight" style={{ color }}>
              {value < 0 ? '-' : ''}{formatCurrency(Math.abs(value))}
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
