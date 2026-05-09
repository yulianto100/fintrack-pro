'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, CreditCard } from 'lucide-react'
import { useCreditCards } from '@/hooks/useCreditCards'
import { dashboardColors, dashboardRadius } from '@/components/dashboard/dashboardTokens'

interface Props {
  hidden?: boolean
}

const MASKED = '******'

export function CreditCardDashboardSection({ hidden = false }: Props) {
  const { cards, loading, totalDebt, totalLimit, overallUsagePercent } = useCreditCards()

  if (loading) return <div className="skeleton h-24 rounded-2xl" />
  if (cards.length === 0) return null

  const statusColor =
    overallUsagePercent >= 80 ? dashboardColors.expenseStrong :
    overallUsagePercent >= 50 ? '#F59E0B' :
    dashboardColors.accent

  const statusLabel =
    overallUsagePercent >= 80 ? 'Perlu perhatian' :
    overallUsagePercent >= 50 ? 'Cukup tinggi' :
    'Aman'

  const fmt = (value: number) =>
    hidden ? MASKED : `Rp ${value.toLocaleString('id-ID')}`

  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[15px] font-semibold leading-tight" style={{ color: dashboardColors.text }}>
          Kartu Kredit
        </h2>
        <Link
          href="/akun?tab=kredit"
          className="flex items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-70"
          style={{ color: dashboardColors.accent }}
        >
          Kelola <ArrowRight size={13} />
        </Link>
      </div>

      <div
        className="glass-card p-4"
        style={{
          borderRadius: dashboardRadius.cardSm,
        }}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ background: dashboardColors.incomeSoft }}>
              <CreditCard size={19} style={{ color: dashboardColors.accent }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-snug" style={{ color: dashboardColors.text }}>
                {cards.length} Kartu Aktif
              </p>
              <p className="mt-1 truncate text-xs leading-snug" style={{ color: dashboardColors.muted }}>
                Total limit: {fmt(totalLimit)}
              </p>
            </div>
          </div>

          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold leading-none"
            style={{ background: `${statusColor}18`, color: statusColor }}
          >
            {statusLabel}
          </span>
        </div>

        <div className="mb-2 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs leading-snug" style={{ color: dashboardColors.muted }}>
              Total tagihan bulan ini
            </p>
            <p className="mt-1 text-lg font-bold leading-tight font-mono" style={{ color: totalDebt > 0 ? dashboardColors.expense : dashboardColors.accent }}>
              {fmt(totalDebt)}
            </p>
          </div>
          <p className="text-sm font-bold" style={{ color: statusColor }}>
            {overallUsagePercent.toFixed(0)}%
          </p>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(overallUsagePercent, 100)}%` }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: statusColor }}
          />
        </div>

        {cards.length > 1 && (
          <div className="mt-3 space-y-2">
            {cards.slice(0, 3).map((card) => {
              const pct = card.limit > 0 ? (card.used / card.limit) * 100 : 0
              const cardColor = pct >= 80 ? dashboardColors.expenseStrong : pct >= 50 ? '#F59E0B' : dashboardColors.accent
              return (
                <div key={card.id} className="flex items-center gap-2">
                  <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: card.color || dashboardColors.accent }} />
                  <p className="flex-1 truncate text-xs" style={{ color: dashboardColors.textSecondary }}>
                    {card.name}
                  </p>
                  <p className="text-xs font-mono" style={{ color: cardColor }}>
                    {hidden ? MASKED : `Rp ${card.used.toLocaleString('id-ID')}`}
                  </p>
                </div>
              )
            })}
            {cards.length > 3 && (
              <p className="text-center text-xs" style={{ color: dashboardColors.muted }}>
                +{cards.length - 3} kartu lainnya
              </p>
            )}
          </div>
        )}
      </div>
    </motion.section>
  )
}
