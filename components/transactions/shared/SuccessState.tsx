'use client'

/**
 * components/transactions/shared/SuccessState.tsx
 * Full-screen success overlay shown after a transaction completes.
 * Auto-dismisses after `autoDismissMs` or when user taps the CTA.
 */

import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface TransactionSummaryRow {
  label: string
  value: string
}

interface SuccessStateProps {
  title: string
  subtitle?: string
  summaryRows?: TransactionSummaryRow[]
  ctaLabel?: string
  ctaHref?: string
  onDone?: () => void
  autoDismissMs?: number   // 0 = no auto-dismiss
  accentColor?: string
}

export function SuccessState({
  title,
  subtitle,
  summaryRows = [],
  ctaLabel = 'Selesai',
  ctaHref,
  onDone,
  autoDismissMs = 0,
  accentColor = 'var(--accent)',
}: SuccessStateProps) {
  const router = useRouter()

  const handleDone = () => {
    if (onDone) { onDone(); return }
    if (ctaHref) { router.push(ctaHref); return }
    router.back()
  }

  useEffect(() => {
    if (!autoDismissMs) return
    const t = setTimeout(handleDone, autoDismissMs)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDismissMs])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="fixed inset-0 flex flex-col items-center justify-center px-6 z-50"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Glow ring */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 280,
          height: 280,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentColor}1A 0%, transparent 70%)`,
        }}
      />

      {/* Check icon */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.1, duration: 0.45, ease: [0.175, 0.885, 0.32, 1.275] }}
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
        style={{ background: `${accentColor}18`, border: `2px solid ${accentColor}44` }}
      >
        <CheckCircle2 size={40} style={{ color: accentColor }} />
      </motion.div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center mb-6"
      >
        <h2
          className="text-[26px] font-bold tracking-tight mb-2"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-syne)' }}
        >
          {title}
        </h2>
        {subtitle && (
          <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
            {subtitle}
          </p>
        )}
      </motion.div>

      {/* Summary card */}
      {summaryRows.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="w-full max-w-sm rounded-2xl overflow-hidden mb-8"
          style={{ background: 'var(--surface-card)', border: '1px solid var(--border)' }}
        >
          {summaryRows.map((row, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-4 py-3"
              style={{
                borderBottom:
                  i < summaryRows.length - 1
                    ? '1px solid rgba(255,255,255,0.05)'
                    : 'none',
              }}
            >
              <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                {row.label}
              </span>
              <span
                className="text-[13px] font-bold"
                style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </motion.div>
      )}

      {/* CTA */}
      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.36 }}
        onClick={handleDone}
        whileTap={{ scale: 0.98 }}
        className="w-full max-w-sm py-4 rounded-2xl text-[15px] font-bold"
        style={{ background: accentColor, color: '#fff', boxShadow: '0 8px 24px rgba(34,197,94,0.25)' }}
      >
        {ctaLabel}
      </motion.button>

      {autoDismissMs > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 text-[11px]"
          style={{ color: 'var(--text-muted)' }}
        >
          Halaman akan otomatis kembali…
        </motion.p>
      )}
    </motion.div>
  )
}
