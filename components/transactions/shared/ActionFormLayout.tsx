'use client'

/**
 * components/transactions/shared/ActionFormLayout.tsx
 *
 * FIX: StyledSelect was invisible on many browsers because native <select>
 * ignores inline color/background on the element itself. Fixed by:
 *  • Removing `appearance-none` — keeps native OS picker (reliable)
 *  • Adding a custom-styled wrapper that renders consistently
 *  • All form fields now use explicit color values (no CSS var fallback issues)
 */

import React from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronDown, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ActionFormLayoutProps {
  title: string
  subtitle?: string
  accountName?: string
  accountBalance?: number
  hidden?: boolean
  children: React.ReactNode
  ctaLabel: string
  ctaDisabled?: boolean
  ctaLoading?: boolean
  onSubmit: () => void
  onBack?: () => void
  accentIcon?: React.ReactNode
  accentColor?: string
}

export function ActionFormLayout({
  title,
  subtitle,
  accountName,
  accountBalance,
  hidden = false,
  children,
  ctaLabel,
  ctaDisabled = false,
  ctaLoading = false,
  onSubmit,
  onBack,
  accentIcon,
  accentColor = 'var(--accent)',
}: ActionFormLayoutProps) {
  const router = useRouter()
  const handleBack = onBack ?? (() => router.back())

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
      className="min-h-screen flex flex-col"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 pt-3 pb-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 py-1"
          style={{ color: 'var(--accent)' }}
        >
          <ChevronLeft size={18} />
          <span className="text-[13px] font-semibold">Kembali</span>
        </button>

        {accentIcon && (
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: `color-mix(in srgb, var(--accent) 15%, transparent)`,
              color: 'var(--accent)',
            }}
          >
            {accentIcon}
          </div>
        )}
      </div>

      {/* Title */}
      <div className="px-4 pt-5 pb-4">
        <h1
          className="text-[24px] font-bold tracking-tight leading-tight"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-syne, sans-serif)' }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {subtitle}
          </p>
        )}

        {accountName && (
          <div
            className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full"
            style={{ background: 'var(--surface-card)', border: '1px solid var(--border)' }}
          >
            <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
              Dari:
            </span>
            <span className="text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>
              {accountName}
            </span>
            {accountBalance !== undefined && (
              <>
                <span style={{ color: 'var(--border)' }}>·</span>
                <span className="text-[11px] font-semibold" style={{ color: 'var(--accent)' }}>
                  {hidden
                    ? 'Rp ••••••'
                    : `Rp ${accountBalance.toLocaleString('id-ID')}`}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 pb-36">
        <div className="flex flex-col gap-5">{children}</div>
      </div>

      {/* Sticky CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-4"
        style={{
          background: 'linear-gradient(to top, var(--bg-base, #0a120d) 70%, transparent)',
          zIndex: 50,
        }}
      >
        <motion.button
          type="button"
          onClick={!ctaDisabled && !ctaLoading ? onSubmit : undefined}
          whileTap={!ctaDisabled && !ctaLoading ? { scale: 0.98 } : undefined}
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-[15px] font-bold"
          style={{
            background:  ctaDisabled || ctaLoading ? 'rgba(255,255,255,0.08)' : accentColor,
            color:       ctaDisabled || ctaLoading ? 'rgba(255,255,255,0.3)' : '#fff',
            cursor:      ctaDisabled || ctaLoading ? 'not-allowed' : 'pointer',
            transition:  'all 200ms ease',
            boxShadow:   ctaDisabled || ctaLoading ? 'none' : '0 8px 24px rgba(34,197,94,0.25)',
          }}
        >
          {ctaLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Memproses…
            </>
          ) : (
            ctaLabel
          )}
        </motion.button>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────
// FormSection
// ─────────────────────────────────────────────────────────────
export function FormSection({
  title,
  children,
}: {
  title?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      {title && (
        <p
          className="text-[10px] font-bold tracking-[0.14em] uppercase px-1"
          style={{ color: 'var(--text-muted)', opacity: 0.7 }}
        >
          {title}
        </p>
      )}
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// StyledSelect
// FIX: Replaced appearance-none + invisible text with a div-based
// custom selector that works reliably across all browsers/OS.
// ─────────────────────────────────────────────────────────────
export function StyledSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  disabled?: boolean
}) {
  const selected = options.find(o => o.value === value)

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          className="text-[11px] font-bold tracking-[0.12em] uppercase"
          style={{ color: 'var(--text-muted)' }}
        >
          {label}
        </label>
      )}

      {/*
        Custom wrapper: actual <select> is absolutely positioned over the
        styled div so the OS picker still opens on tap, but visuals are ours.
      */}
      <div className="relative" style={{ opacity: disabled ? 0.5 : 1 }}>
        {/* Visual layer */}
        <div
          className="flex items-center justify-between rounded-2xl px-4 py-3.5"
          style={{
            background:  'var(--surface-card)',
            border:      `1.5px solid ${value ? 'var(--accent)' : 'var(--border)'}`,
            pointerEvents: 'none',   // select sits on top
            transition:  'border-color 200ms ease',
          }}
        >
          <span
            className="text-[14px] font-semibold truncate flex-1"
            style={{
              color:      selected ? 'var(--text-primary)' : 'var(--text-muted)',
              fontFamily: 'var(--font-syne, sans-serif)',
            }}
          >
            {selected ? selected.label : (placeholder ?? 'Pilih…')}
          </span>
          <ChevronDown
            size={16}
            style={{ color: 'var(--text-muted)', flexShrink: 0 }}
          />
        </div>

        {/* Invisible native select on top — handles interaction */}
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          aria-label={label}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          style={{ fontSize: 16 }}   /* 16px prevents iOS zoom-on-focus */
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// StyledTextArea
// ─────────────────────────────────────────────────────────────
export function StyledTextArea({
  label,
  value,
  onChange,
  placeholder,
  maxLength = 120,
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  maxLength?: number
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          className="text-[11px] font-bold tracking-[0.12em] uppercase"
          style={{ color: 'var(--text-muted)' }}
        >
          {label}
        </label>
      )}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'var(--surface-card)',
          border: `1.5px solid ${value ? 'var(--accent)' : 'var(--border)'}`,
          transition: 'border-color 200ms ease',
        }}
      >
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={3}
          className="w-full bg-transparent px-4 pt-3 pb-1 text-[14px] outline-none resize-none"
          style={{
            color:      'var(--text-primary)',
            fontFamily: 'var(--font-syne, sans-serif)',
          }}
        />
        <div
          className="flex justify-end px-4 pb-2 text-[10px]"
          style={{ color: 'var(--text-muted)' }}
        >
          {value.length}/{maxLength}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// StyledInput
// ─────────────────────────────────────────────────────────────
export function StyledInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
  inputMode,
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  error?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          className="text-[11px] font-bold tracking-[0.12em] uppercase"
          style={{ color: 'var(--text-muted)' }}
        >
          {label}
        </label>
      )}
      <div
        className="rounded-2xl"
        style={{
          background: 'var(--surface-card)',
          border: `1.5px solid ${
            error ? 'rgba(239,68,68,0.6)' : value ? 'var(--accent)' : 'var(--border)'
          }`,
          transition: 'border-color 200ms ease',
        }}
      >
        <input
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent px-4 py-3.5 text-[14px] font-semibold outline-none"
          style={{
            color:      'var(--text-primary)',
            fontFamily: 'var(--font-syne, sans-serif)',
            fontSize:   16,   /* prevent iOS auto-zoom */
          }}
        />
      </div>
      {error && (
        <p className="text-[11px] font-medium px-1" style={{ color: '#ef4444' }}>
          {error}
        </p>
      )}
    </div>
  )
}
