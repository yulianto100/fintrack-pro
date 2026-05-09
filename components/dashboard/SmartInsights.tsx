'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Bell,
  ClipboardList,
  Lightbulb,
  PieChart,
  Rocket,
  Scale,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  WalletCards,
  X,
  type LucideIcon,
} from 'lucide-react'
import type { Transaction, GoldHolding, StockHolding, Deposit, Insight, BudgetStatus } from '@/types'
import { generateAllInsights } from '@/lib/insight-engine'
import { DashboardSectionHeader } from './DashboardSectionHeader'
import { dashboardColors, dashboardRadius } from './dashboardTokens'

interface Props {
  transactions: Transaction[]
  goldHoldings: GoldHolding[]
  stocks: StockHolding[]
  deposits: Deposit[]
  totalWealth: number
  goldValue: number
  stockValue?: number
  walletTotal?: number
  budgets?: BudgetStatus[]
}

const STORAGE_KEY = 'finuvo_dismissed_insights'
const INITIAL_LIMIT = 3

const TONE: Record<Insight['type'], { label: string; bg: string; border: string; text: string; iconBg: string }> = {
  success: {
    label: 'Positif',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.22)',
    text: '#4ADE80',
    iconBg: 'rgba(34,197,94,0.14)',
  },
  info: {
    label: 'Info',
    bg: 'rgba(45,212,191,0.08)',
    border: 'rgba(45,212,191,0.22)',
    text: '#2DD4BF',
    iconBg: 'rgba(45,212,191,0.13)',
  },
  warning: {
    label: 'Perhatian',
    bg: 'rgba(251,191,36,0.08)',
    border: 'rgba(251,191,36,0.24)',
    text: '#FBBF24',
    iconBg: 'rgba(251,191,36,0.13)',
  },
  critical: {
    label: 'Urgent',
    bg: 'rgba(251,113,133,0.10)',
    border: 'rgba(251,113,133,0.28)',
    text: '#FB7185',
    iconBg: 'rgba(251,113,133,0.15)',
  },
}

const ICONS: Record<string, LucideIcon> = {
  'alert-triangle': AlertTriangle,
  'badge-check': BadgeCheck,
  'bar-chart': BarChart3,
  bell: Bell,
  'circle-alert': AlertTriangle,
  'clipboard-list': ClipboardList,
  lightbulb: Lightbulb,
  'pie-chart': PieChart,
  rocket: Rocket,
  scale: Scale,
  search: Search,
  'shield-alert': ShieldAlert,
  sparkles: Sparkles,
  'trend-up': TrendingUp,
  wallet: WalletCards,
}

function toKey(title: string): string {
  return 'insight_dismissed_' + title.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 60)
}

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

function saveDismissed(keys: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...keys]))
  } catch {
    // Ignore storage failures; insights should still render.
  }
}

function getIcon(insight: Insight): LucideIcon {
  if (ICONS[insight.icon]) return ICONS[insight.icon]
  if (insight.type === 'critical') return ShieldAlert
  if (insight.type === 'warning') return AlertTriangle
  if (insight.type === 'success') return BadgeCheck
  return Lightbulb
}

export function SmartInsights({
  transactions,
  goldHoldings,
  stocks,
  deposits,
  totalWealth,
  goldValue,
  stockValue,
  walletTotal,
  budgets,
}: Props) {
  const allInsights = useMemo(
    () => generateAllInsights({
      transactions,
      goldHoldings,
      stocks,
      deposits,
      totalWealth,
      goldValue,
      stockValue,
      walletTotal,
      budgets,
    }),
    [transactions, goldHoldings, stocks, deposits, totalWealth, goldValue, stockValue, walletTotal, budgets],
  )

  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    setDismissed(loadDismissed())
  }, [])

  const dismiss = useCallback((title: string) => {
    setDismissed((prev) => {
      const next = new Set(prev)
      next.add(toKey(title))
      saveDismissed(next)
      return next
    })
  }, [])

  const visible = useMemo(
    () => allInsights.filter((insight) => !dismissed.has(toKey(insight.title))),
    [allInsights, dismissed],
  )

  const shownInsights = showAll ? visible : visible.slice(0, INITIAL_LIMIT)
  const dismissedCount = allInsights.length - visible.length

  const restoreAll = useCallback(() => {
    const next = new Set(dismissed)
    allInsights.forEach((insight) => next.delete(toKey(insight.title)))
    setDismissed(next)
    saveDismissed(next)
  }, [dismissed, allInsights])

  if (allInsights.length === 0) return null

  return (
    <section className="space-y-3">
      <DashboardSectionHeader
        title="Insight Penting"
        actionLabel={visible.length > INITIAL_LIMIT ? (showAll ? 'Ringkas' : 'Lihat semua insight') : undefined}
        onAction={() => setShowAll((current) => !current)}
      />

      {visible.length === 0 && (
        <div className="glass-card p-4 text-center" style={{ borderRadius: dashboardRadius.cardSm }}>
          <p className="text-sm font-semibold" style={{ color: dashboardColors.text }}>Semua insight disembunyikan</p>
          <button type="button" onClick={restoreAll} className="mt-2 text-xs font-semibold" style={{ color: dashboardColors.accent }}>
            Tampilkan insight
          </button>
        </div>
      )}

      <AnimatePresence initial={false}>
        {shownInsights.map((insight) => {
          const tone = TONE[insight.type]
          const Icon = getIcon(insight)

          return (
            <motion.article
              key={insight.title}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0, scale: 0.97, transition: { duration: 0.2 } }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div
                className="relative flex items-start gap-3 rounded-2xl p-4"
                style={{ background: tone.bg, border: `1px solid ${tone.border}` }}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ background: tone.iconBg, color: tone.text }}>
                  <Icon size={19} strokeWidth={2.2} />
                </div>

                <div className="min-w-0 flex-1 pr-5">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none" style={{ background: tone.iconBg, color: tone.text }}>
                      {tone.label}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold leading-snug" style={{ color: tone.text }}>
                    {insight.title}
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed" style={{ color: dashboardColors.muted }}>
                    {insight.message}
                  </p>

                  {insight.actionLabel && insight.actionHref && (
                    <Link
                      href={insight.actionHref}
                      className="mt-3 inline-flex rounded-full px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-75"
                      style={{ background: tone.iconBg, color: tone.text, border: `1px solid ${tone.border}` }}
                    >
                      {insight.actionLabel}
                    </Link>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => dismiss(insight.title)}
                  aria-label="Tutup insight"
                  className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full transition-opacity hover:opacity-100"
                  style={{ background: tone.iconBg, color: tone.text, opacity: 0.76 }}
                >
                  <X size={12} strokeWidth={2.4} />
                </button>
              </div>
            </motion.article>
          )
        })}
      </AnimatePresence>

      {dismissedCount > 0 && visible.length > 0 && (
        <div className="flex justify-end px-1">
          <button type="button" onClick={restoreAll} className="text-xs font-medium" style={{ color: dashboardColors.muted }}>
            {dismissedCount} insight disembunyikan - Tampilkan
          </button>
        </div>
      )}
    </section>
  )
}
