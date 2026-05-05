'use client'

/**
 * components/transactions/shared/CurrencyInput.tsx
 * Reusable IDR currency input with live Rp formatting.
 * Supports validation, disabled state, and max-amount guard.
 */

import React, { useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface CurrencyInputProps {
  value: number                // raw numeric value (0 = empty)
  onChange: (value: number) => void
  placeholder?: string
  max?: number                 // if set, show warning when exceeded
  disabled?: boolean
  error?: string               // inline error message
  label?: string
  hint?: string                // helper text below input
  autoFocus?: boolean
}

/** Format a number as "Rp 1.500.000" (id-ID locale). */
export function formatRp(n: number): string {
  return `Rp ${n.toLocaleString('id-ID')}`
}

/** Parse a Rp-formatted string back to a number. */
export function parseRp(s: string): number {
  // strip everything except digits
  const digits = s.replace(/[^\d]/g, '')
  return digits ? parseInt(digits, 10) : 0
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = '0',
  max,
  disabled = false,
  error,
  label,
  hint,
  autoFocus = false,
}: CurrencyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const exceeds = max !== undefined && value > max

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      const num = parseRp(raw)
      onChange(num)
    },
    [onChange]
  )

  // Quick-amount chips (common top-up/transfer amounts in IDR)
  const CHIPS = [50_000, 100_000, 200_000, 500_000, 1_000_000]

  const borderColor = error || exceeds
    ? 'rgba(239,68,68,0.60)'
    : value > 0
    ? 'var(--accent)'
    : 'var(--border)'

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

      {/* Input wrapper */}
      <div
        className="flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all"
        style={{
          background: 'var(--surface-card)',
          border: `1.5px solid ${borderColor}`,
          opacity: disabled ? 0.5 : 1,
          transition: 'border-color 200ms ease',
        }}
        onClick={() => inputRef.current?.focus()}
      >
        <span
          className="text-[18px] font-bold flex-shrink-0"
          style={{ color: value > 0 ? 'var(--accent)' : 'var(--text-muted)', fontFamily: 'var(--font-jetbrains)' }}
        >
          Rp
        </span>
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          disabled={disabled}
          inputMode="numeric"
          pattern="[0-9]*"
          value={value > 0 ? value.toLocaleString('id-ID') : ''}
          onChange={handleChange}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-[22px] font-bold tabular-nums"
          style={{
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-syne)',
            caretColor: 'var(--accent)',
          }}
        />
        {value > 0 && !disabled && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(0) }}
            className="text-[10px] px-2 py-1 rounded-lg"
            style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)' }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Quick chips */}
      {!disabled && (
        <div className="flex gap-1.5 flex-wrap mt-0.5">
          {CHIPS.map(chip => (
            <button
              key={chip}
              type="button"
              onClick={() => onChange(chip)}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all"
              style={{
                background: value === chip ? 'var(--accent)' : 'var(--surface-card)',
                color: value === chip ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${value === chip ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              {chip >= 1_000_000 ? `${chip / 1_000_000}jt` : `${chip / 1_000}rb`}
            </button>
          ))}
          {max !== undefined && max > 0 && (
            <button
              type="button"
              onClick={() => onChange(max)}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all"
              style={{
                background: value === max ? 'var(--accent)' : 'rgba(34,197,94,0.08)',
                color: value === max ? '#fff' : 'var(--accent)',
                border: `1px solid ${value === max ? 'var(--accent)' : 'rgba(34,197,94,0.25)'}`,
              }}
            >
              Maks
            </button>
          )}
        </div>
      )}

      {/* Error / hint */}
      <AnimatePresence>
        {(error || exceeds || hint) && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-[11px] font-medium px-1"
            style={{
              color: error || exceeds ? '#ef4444' : 'var(--text-muted)',
            }}
          >
            {error
              ? error
              : exceeds
              ? `Melebihi saldo tersedia (${formatRp(max!)})`
              : hint}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
