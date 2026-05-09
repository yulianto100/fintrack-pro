'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, PencilLine, X, Zap } from 'lucide-react'
import type { UserStreak } from '@/types'
import { dashboardRadius } from './dashboardTokens'

interface StreakData extends UserStreak {
  hasToday: boolean
}

export function StreakBanner() {
  const [data, setData] = useState<StreakData | null>(null)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    fetch('/api/streak')
      .then((response) => response.json())
      .then((json) => {
        if (json.success) setData(json.data)
      })
      .catch(() => {})
  }, [])

  if (!data || !visible) return null

  if (!data.hasToday) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0 }}
          className="relative flex items-center gap-3 px-4 py-3"
          style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: dashboardRadius.cardSm }}
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl" style={{ background: 'rgba(251,191,36,0.13)' }}>
            <PencilLine size={17} color="#fbbf24" strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight" style={{ color: '#fbbf24' }}>
              Hari ini belum ada transaksi dicatat
            </p>
            <p className="mt-0.5 text-xs leading-snug" style={{ color: 'var(--text-muted)' }}>
              {data.currentStreak > 0
                ? `Streak kamu ${data.currentStreak} hari - jangan putus sekarang!`
                : 'Catat transaksi pertamamu hari ini dan mulai streak.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
            style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}
            aria-label="Tutup pengingat streak"
          >
            <X size={12} strokeWidth={2.5} />
          </button>
        </motion.div>
      </AnimatePresence>
    )
  }

  if (data.currentStreak < 2) return null

  const isBest = data.currentStreak >= data.bestStreak && data.bestStreak > 1

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        className="flex items-center gap-3 px-4 py-3"
        style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)', borderRadius: dashboardRadius.cardSm }}
      >
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl" style={{ background: 'rgba(251,146,60,0.15)' }}>
          <Flame size={18} color="#fb923c" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug" style={{ color: '#fb923c' }}>
            {data.currentStreak} hari streak! {isBest ? 'Rekor baru!' : ''}
          </p>
          <p className="text-xs leading-snug" style={{ color: 'var(--text-muted)' }}>
            Catat transaksi setiap hari - Terbaik: {data.bestStreak} hari
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1 rounded-xl px-2 py-1" style={{ background: 'rgba(251,146,60,0.12)' }}>
          <Zap size={11} color="#fb923c" />
          <span className="text-xs font-bold" style={{ color: '#fb923c' }}>{data.currentStreak}</span>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
