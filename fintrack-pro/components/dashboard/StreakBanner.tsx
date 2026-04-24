'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, X, Zap } from 'lucide-react'
import type { UserStreak } from '@/types'

interface StreakData extends UserStreak { hasToday: boolean }

export function StreakBanner() {
  const [data,    setData   ] = useState<StreakData | null>(null)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    fetch('/api/streak')
      .then((r) => r.json())
      .then((j) => { if (j.success) setData(j.data) })
      .catch(() => {})
  }, [])

  if (!data || !visible) return null

  // No-transaction-today banner
  if (!data.hasToday) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl relative"
          style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}
        >
          <span className="text-xl flex-shrink-0">📝</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight" style={{ color: '#fbbf24' }}>
              Hari ini belum ada transaksi dicatat
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {data.currentStreak > 0
                ? `Streak kamu ${data.currentStreak} hari — jangan putus sekarang!`
                : 'Catat transaksi pertamamu hari ini dan mulai streak.'}
            </p>
          </div>
          <button
            onClick={() => setVisible(false)}
            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}
          >
            <X size={10} strokeWidth={2.5} />
          </button>
        </motion.div>
      </AnimatePresence>
    )
  }

  // Streak card — only show if streak >= 2
  if (data.currentStreak < 2) return null

  const isBest = data.currentStreak >= data.bestStreak && data.bestStreak > 1

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        className="flex items-center gap-3 px-4 py-3 rounded-2xl"
        style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)' }}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(251,146,60,0.15)' }}>
          <Flame size={18} color="#fb923c" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold" style={{ color: '#fb923c' }}>
            {data.currentStreak} hari streak! {isBest ? '🏆 Rekor baru!' : ''}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Catat transaksi setiap hari · Terbaik: {data.bestStreak} hari
          </p>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg flex-shrink-0"
          style={{ background: 'rgba(251,146,60,0.12)' }}>
          <Zap size={11} color="#fb923c" />
          <span className="text-xs font-bold" style={{ color: '#fb923c' }}>{data.currentStreak}</span>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
