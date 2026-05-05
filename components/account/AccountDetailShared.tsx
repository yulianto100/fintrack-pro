'use client'

/**
 * components/account/AccountDetailShared.tsx
 * Reusable UI blocks for WalletDetailSheet & CreditDetailSheet.
 * Uses fintrack-pro design tokens: --accent, --surface-card, --border, etc.
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight, TrendingUp, TrendingDown,
  Info, AlertTriangle, Zap,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export type BadgeVariant = 'safe' | 'warn' | 'danger'

export interface InsightLine {
  icon: React.ReactNode
  text: string
  cta?: string
  onCta?: () => void
}

export interface QuickActionItem {
  label: string
  icon: React.ReactNode
  primary?: boolean
  onClick?: () => void
}

export interface InfoRowData {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}

export interface InfoGroupData {
  title: string
  rows: InfoRowData[]
}

// ─────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────
export function fmtRp(n: number, hidden = false): string {
  if (hidden) return 'Rp ••••••'
  const safe = typeof n === 'number' && isFinite(n) ? n : 0
  return `Rp ${safe.toLocaleString('id-ID')}`
}

export function getCreditUsageColor(pct: number): string {
  if (pct >= 85) return '#ef4444'
  if (pct >= 65) return '#f59e0b'
  return 'var(--accent)'
}

export function getBillingStatus(usagePct: number, daysUntilDue: number): BadgeVariant {
  if (usagePct >= 90 || daysUntilDue <= 3) return 'danger'
  if (usagePct >= 65 || daysUntilDue <= 7) return 'warn'
  return 'safe'
}

// Always returns InsightLine[] — never undefined/null
export function getAccountInsights(account: {
  type: string   // loosened to string so unexpected values don't throw
  usagePercent?: number
  monthlyChangePct?: number
  biggestCategory?: string
  lastTopUpDays?: number
  topCategory?: string
}): InsightLine[] {
  try {
    if (account.type === 'bank') {
      const lines: InsightLine[] = []
      if (account.biggestCategory) {
        lines.push({
          icon: <TrendingUp size={13} />,
          text: `Pengeluaran terbesar: <strong>${account.biggestCategory}</strong>`,
        })
      }
      if (account.monthlyChangePct !== undefined) {
        const turun = account.monthlyChangePct < 0
        lines.push({
          icon: turun ? <TrendingDown size={13} /> : <TrendingUp size={13} />,
          text: `Saldo ${turun ? 'turun' : 'naik'} <strong>${Math.abs(account.monthlyChangePct)}%</strong> dari bulan lalu`,
        })
      }
      return lines.slice(0, 2)
    }

    if (account.type === 'credit') {
      const lines: InsightLine[] = []
      if (account.usagePercent !== undefined) {
        lines.push({
          icon: <AlertTriangle size={13} />,
          text: `Kamu sudah memakai <strong>${account.usagePercent}% dari limit</strong>`,
        })
      }
      if (account.monthlyChangePct !== undefined) {
        const naik = account.monthlyChangePct > 0
        lines.push({
          icon: naik ? <TrendingUp size={13} /> : <TrendingDown size={13} />,
          text: `Tagihan ${naik ? 'naik' : 'turun'} <strong>${Math.abs(account.monthlyChangePct)}%</strong> dari bulan lalu`,
        })
      }
      return lines.slice(0, 2)
    }

    if (account.type === 'ewallet') {
      const lines: InsightLine[] = []
      if (account.lastTopUpDays !== undefined) {
        lines.push({
          icon: <Zap size={13} />,
          text: `Top up terakhir <strong>${account.lastTopUpDays} hari lalu</strong>`,
        })
      }
      if (account.topCategory) {
        lines.push({
          icon: <Info size={13} />,
          text: `Sering digunakan untuk <strong>${account.topCategory}</strong>`,
        })
      }
      return lines.slice(0, 2)
    }

    // unknown type — return empty, no crash
    return []
  } catch {
    return []
  }
}

// ─────────────────────────────────────────────────────────────
// LiveIndicator
// ─────────────────────────────────────────────────────────────
export function LiveIndicator({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="rounded-full flex-shrink-0"
        style={{ width: 6, height: 6, background: '#4ade80', animation: 'livePulse 2s infinite' }}
      />
      <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.60)' }}>{text}</span>
      <style>{`@keyframes livePulse{0%,100%{opacity:1}50%{opacity:0.35}}`}</style>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// DailyDelta
// ─────────────────────────────────────────────────────────────
export function DailyDelta({ amount, hidden }: { amount: number; hidden: boolean }) {
  if (hidden || !amount || amount === 0) return null
  const positive = amount > 0
  return (
    <p className="text-[12px] mt-1" style={{ color: positive ? '#4ade80' : '#fca5a5' }}>
      {positive ? '+' : '-'}{fmtRp(Math.abs(amount))} hari ini
    </p>
  )
}

// ─────────────────────────────────────────────────────────────
// InsightStrip — safe against empty/undefined lines
// ─────────────────────────────────────────────────────────────
export function InsightStrip({ lines }: { lines: InsightLine[] }) {
  const safeLines = Array.isArray(lines) ? lines.filter(Boolean) : []
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (safeLines.length <= 1) return
    const t = setInterval(() => setIdx(i => (i + 1) % safeLines.length), 4000)
    return () => clearInterval(t)
  }, [safeLines.length])

  // Reset idx when lines shrink
  useEffect(() => {
    if (idx >= safeLines.length) setIdx(0)
  }, [safeLines.length, idx])

  if (safeLines.length === 0) return null

  const safeIdx = Math.min(idx, safeLines.length - 1)
  const current = safeLines[safeIdx]
  if (!current) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-3 rounded-2xl px-3.5 py-2.5"
      style={{ background: 'var(--surface-card)', border: '1px solid var(--border)' }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={safeIdx}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.18 }}
          className="flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex-shrink-0" style={{ color: 'var(--accent)' }}>
              {current.icon}
            </span>
            <p
              className="text-[12px] font-medium leading-snug truncate"
              style={{ color: 'var(--text-muted)' }}
              dangerouslySetInnerHTML={{ __html: current.text ?? '' }}
            />
          </div>
          {current.cta && (
            <button
              onClick={current.onCta}
              className="flex-shrink-0 flex items-center gap-0.5 text-[11px] font-semibold"
              style={{ color: 'var(--accent)' }}
            >
              {current.cta} <ChevronRight size={11} />
            </button>
          )}
        </motion.div>
      </AnimatePresence>
      {safeLines.length > 1 && (
        <div className="flex gap-1 mt-2">
          {safeLines.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className="rounded-full"
              style={{
                height: 4,
                width: i === safeIdx ? 14 : 4,
                background: i === safeIdx ? 'var(--accent)' : 'rgba(255,255,255,0.15)',
                transition: 'width 250ms ease, background 200ms ease',
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────
// QuickActionsRow
// ─────────────────────────────────────────────────────────────
export function QuickActionsRow({ actions }: { actions: QuickActionItem[] }) {
  const safeActions = Array.isArray(actions) ? actions : []
  if (safeActions.length === 0) return null
  return (
    <div
      className="mx-4 mb-4 grid gap-2"
      style={{ gridTemplateColumns: `repeat(${safeActions.length}, 1fr)` }}
    >
      {safeActions.map((action, i) => (
        <motion.button
          key={i}
          onClick={action.onClick}
          whileTap={{ scale: 0.97 }}
          className="flex items-center justify-center gap-2 py-3 rounded-2xl text-[13px] font-bold"
          style={
            action.primary
              ? { background: 'var(--accent)', color: '#fff', border: 'none' }
              : { background: 'var(--surface-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
          }
        >
          <span
            className="flex items-center justify-center w-6 h-6 rounded-lg text-[13px]"
            style={{
              background: action.primary ? 'rgba(255,255,255,0.18)' : 'var(--accent-dim)',
              color: action.primary ? '#fff' : 'var(--accent)',
            }}
          >
            {action.icon}
          </span>
          {action.label}
        </motion.button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// StatusBadge
// ─────────────────────────────────────────────────────────────
const BADGE_CFG: Record<BadgeVariant, { bg: string; color: string }> = {
  safe:   { bg: 'rgba(34,197,94,0.12)',  color: '#16a34a' },
  warn:   { bg: 'rgba(245,158,11,0.12)', color: '#b45309' },
  danger: { bg: 'rgba(239,68,68,0.12)',  color: '#dc2626' },
}
export function StatusBadge({ label, variant }: { label: string; variant: BadgeVariant }) {
  const cfg = BADGE_CFG[variant] ?? BADGE_CFG.safe
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────
// CreditUsageBar
// ─────────────────────────────────────────────────────────────
export function CreditUsageBar({ used, limit, hidden, billingStatus }: {
  used: number; limit: number; hidden: boolean; billingStatus: BadgeVariant
}) {
  const safeUsed  = typeof used  === 'number' && isFinite(used)  ? used  : 0
  const safeLimit = typeof limit === 'number' && isFinite(limit) ? limit : 0
  const pct       = safeLimit > 0 ? Math.min((safeUsed / safeLimit) * 100, 100) : 0
  const remaining = safeLimit - safeUsed
  const fillColor = getCreditUsageColor(pct)
  const safeStatus = billingStatus ?? 'safe'
  const statusLabel = { safe: '✓ Aman', warn: '⚠ Perlu Perhatian', danger: '⚡ Hampir Habis' }[safeStatus]

  return (
    <div className="mx-4 mb-3 rounded-2xl p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-semibold" style={{ color: 'var(--text-muted)' }}>Limit Terpakai</span>
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold" style={{ color: fillColor, fontFamily: 'var(--font-jetbrains)' }}>
            {pct.toFixed(0)}%
          </span>
          <StatusBadge label={statusLabel} variant={safeStatus} />
        </div>
      </div>
      <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(255,255,255,0.10)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1], delay: 0.15 }}
          className="h-full rounded-full"
          style={{ background: fillColor }}
        />
      </div>
      <div className="flex gap-4">
        {[
          { label: 'TERPAKAI',    val: safeUsed,     color: fillColor },
          { label: 'SISA LIMIT',  val: remaining,    color: 'var(--text-muted)' },
          { label: 'TOTAL LIMIT', val: safeLimit,    color: 'var(--text-muted)' },
        ].map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 && <div className="w-px" style={{ background: 'var(--border)' }} />}
            <div>
              <p className="text-[9px] font-bold tracking-widest mb-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              <p className="text-[11px] font-bold" style={{ color: s.color, fontFamily: 'var(--font-jetbrains)' }}>
                {fmtRp(s.val, hidden)}
              </p>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// BillingStatusCard
// ─────────────────────────────────────────────────────────────
export function BillingStatusCard({ dueLabel, daysLeft, urgent, minimumPayment, totalBill, hidden }: {
  dueLabel: string; daysLeft: number; urgent: boolean
  minimumPayment: number; totalBill: number; hidden: boolean
}) {
  const safeDays = typeof daysLeft === 'number' && isFinite(daysLeft) ? daysLeft : 0
  const sv: BadgeVariant = safeDays <= 3 ? 'danger' : safeDays <= 7 ? 'warn' : 'safe'
  const sl = safeDays === 0 ? 'Hari ini!' : safeDays === 1 ? 'Besok' : `${safeDays} hari lagi`

  return (
    <div
      className="mx-4 mb-3 rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface-card)', border: '1px solid var(--border)' }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          background: urgent ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.04)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div>
          <p className="text-[10px] font-bold tracking-widest mb-0.5" style={{ color: urgent ? '#ef4444' : 'var(--accent)' }}>
            JATUH TEMPO
          </p>
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{dueLabel || '-'}</p>
        </div>
        <StatusBadge label={sl} variant={sv} />
      </div>
      <div className="flex px-4 py-3 gap-4">
        <div className="flex-1">
          <p className="text-[9px] font-bold tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>TOTAL TAGIHAN</p>
          <p className="text-[15px] font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-syne)' }}>
            {fmtRp(totalBill ?? 0, hidden)}
          </p>
        </div>
        <div className="w-px" style={{ background: 'var(--border)' }} />
        <div className="flex-1">
          <p className="text-[9px] font-bold tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>BAYAR MINIMUM</p>
          <p className="text-[15px] font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-syne)' }}>
            {fmtRp(minimumPayment ?? 0, hidden)}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>10% dari tagihan</p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// InfoSection — grouped info rows with icons
// ─────────────────────────────────────────────────────────────
export function InfoSection({ groups }: { groups: InfoGroupData[] }) {
  const safeGroups = Array.isArray(groups) ? groups : []
  return (
    <>
      {safeGroups.map((group, gi) => (
        <div key={gi} className="mx-4 mb-4">
          <p
            className="text-[10px] font-bold tracking-[0.15em] uppercase mb-2 px-1"
            style={{ color: 'var(--text-muted)', opacity: 0.7 }}
          >
            {group.title}
          </p>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface-card)', border: '1px solid var(--border)' }}
          >
            {(group.rows ?? []).map((row, ri) => (
              <div
                key={ri}
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  borderBottom:
                    ri < (group.rows?.length ?? 0) - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
                >
                  {row.icon}
                </div>
                <span className="text-[12px] flex-1" style={{ color: 'var(--text-muted)' }}>
                  {row.label}
                </span>
                <span
                  className="text-[12px] font-semibold text-right"
                  style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// SectionLabel
// ─────────────────────────────────────────────────────────────
export function SectionLabel({
  title, action, onAction,
}: {
  title: string; action?: string; onAction?: () => void
}) {
  return (
    <div className="flex items-center justify-between px-4 mb-2">
      <p
        className="text-[10px] font-bold tracking-[0.15em] uppercase"
        style={{ color: 'var(--text-muted)', opacity: 0.7 }}
      >
        {title}
      </p>
      {action && (
        <button
          onClick={onAction}
          className="flex items-center gap-1 text-[11px] font-semibold"
          style={{ color: 'var(--accent)' }}
        >
          {action} <ChevronRight size={11} />
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// EmptyTransactionState
// ─────────────────────────────────────────────────────────────
const EMPTY_CFG: Record<string, { emoji: string; title: string; sub: string; cta: string }> = {
  bank:    { emoji: '🏦', title: 'Belum ada transaksi di akun ini', sub: 'Transaksi rekening kamu akan muncul di sini.', cta: 'Mulai transaksi' },
  credit:  { emoji: '💳', title: 'Belum ada tagihan pada kartu ini', sub: 'Gunakan kartu untuk mulai melacak pengeluaran.', cta: 'Gunakan kartu' },
  ewallet: { emoji: '👛', title: 'Belum ada aktivitas', sub: 'Top up dompetmu untuk mulai bertransaksi.', cta: 'Top Up Sekarang' },
}

export function EmptyTransactionState({
  type, onCta,
}: {
  type: string; onCta?: () => void
}) {
  const cfg = EMPTY_CFG[type] ?? EMPTY_CFG.bank
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-4 rounded-2xl flex flex-col items-center py-10 px-6 text-center"
      style={{ background: 'var(--surface-card)', border: '1px solid var(--border)' }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 text-3xl"
        style={{ background: 'var(--accent-dim)' }}
      >
        {cfg.emoji}
      </div>
      <p className="text-[14px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
        {cfg.title}
      </p>
      <p className="text-[12px] mb-5 max-w-xs" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
        {cfg.sub}
      </p>
      <button
        onClick={onCta}
        className="px-5 py-2 rounded-full text-[12px] font-bold"
        style={{ background: 'var(--accent)', color: '#fff' }}
      >
        {cfg.cta}
      </button>
    </motion.div>
  )
}
