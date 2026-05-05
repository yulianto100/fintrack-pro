'use client'

/**
 * components/transactions/shared/CurrencyInput.tsx
 *
 * FIX: Cursor-jump bug — controlled input with toLocaleString() caused the
 * cursor to jump on every keystroke. Now uses local displayVal state:
 *  • While typing  → shows raw digits (no cursor jumping)
 *  • On blur / chip click → shows formatted "1.500.000"
 *  • onChange always receives clean number
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface CurrencyInputProps {
  value: number
  onChange: (value: number) => void
  placeholder?: string
  max?: number
  disabled?: boolean
  error?: string
  label?: string
  hint?: string
  autoFocus?: boolean
}

export function formatRp(n: number): string {
  return `Rp ${n.toLocaleString('id-ID')}`
}

export function parseRp(s: string): number {
  const digits = s.replace(/[^\d]/g, '')
  return digits ? Math.min(parseInt(digits, 10), 9_999_999_999) : 0
}

const CHIPS = [50_000, 100_000, 200_000, 500_000, 1_000_000]

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
  const focused  = useRef(false)

  // Local display value: raw digits while typing, formatted on blur
  const [displayVal, setDisplayVal] = useState(
    value > 0 ? value.toLocaleString('id-ID') : ''
  )

  // Sync when parent updates value externally (chip, clear, form reset)
  useEffect(() => {
    if (!focused.current) {
      setDisplayVal(value > 0 ? value.toLocaleString('id-ID') : '')
    }
  }, [value])

  const handleFocus = useCallback(() => {
    focused.current = true
    // Switch to raw digits so cursor never jumps mid-number
    setDisplayVal(value > 0 ? String(value) : '')
  }, [value])

  const handleBlur = useCallback(() => {
    focused.current = false
    setDisplayVal(value > 0 ? value.toLocaleString('id-ID') : '')
  }, [value])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Strip everything except digits — keep exactly what user typed
      const raw = e.target.value.replace(/[^\d]/g, '')
      const num = raw ? Math.min(parseInt(raw, 10), 9_999_999_999) : 0
      setDisplayVal(raw)   // raw string → no cursor jump
      onChange(num)
    },
    [onChange]
  )

  // Use onMouseDown (fires before onBlur) so focus state is still active
  const handleChip = useCallback(
    (chip: number) => {
      onChange(chip)
      setDisplayVal(focused.current ? String(chip) : chip.toLocaleString('id-ID'))
      inputRef.current?.focus()
    },
    [onChange]
  )

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onChange(0)
      setDisplayVal('')
      inputRef.current?.focus()
    },
    [onChange]
  )

  const exceeds     = max !== undefined && value > max
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

      <div
        className="flex items-center gap-3 rounded-2xl px-4 py-3.5"
        style={{
          background: 'var(--surface-card)',
          border:     `1.5px solid ${borderColor}`,
          opacity:    disabled ? 0.5 : 1,
          transition: 'border-color 200ms ease',
          cursor:     disabled ? 'not-allowed' : 'text',
        }}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        <span
          className="text-[18px] font-bold flex-shrink-0 select-none"
          style={{
            color:      value > 0 ? 'var(--accent)' : 'var(--text-muted)',
            fontFamily: 'var(--font-jetbrains, monospace)',
          }}
        >
          Rp
        </span>

        <input
          ref={inputRef}
          autoFocus={autoFocus}
          disabled={disabled}
          inputMode="numeric"
          value={displayVal}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-[22px] font-bold"
          style={{
            color:              'var(--text-primary)',
            fontFamily:         'var(--font-syne, sans-serif)',
            caretColor:         'var(--accent)',
            fontVariantNumeric: 'tabular-nums',
            minWidth:           0,
          }}
        />

        {value > 0 && !disabled && (
          <button
            type="button"
            onMouseDown={handleClear}
            className="flex-shrink-0 text-[10px] px-2 py-1 rounded-lg"
            style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)' }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Quick-amount chips */}
      {!disabled && (
        <div className="flex gap-1.5 flex-wrap mt-0.5">
          {CHIPS.map(chip => (
            <button
              key={chip}
              type="button"
              onMouseDown={() => handleChip(chip)}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
              style={{
                background: value === chip ? 'var(--accent)' : 'var(--surface-card)',
                color:      value === chip ? '#fff' : 'var(--text-muted)',
                border:     `1px solid ${value === chip ? 'var(--accent)' : 'var(--border)'}`,
                transition: 'all 150ms ease',
              }}
            >
              {chip >= 1_000_000
                ? `${chip / 1_000_000}jt`
                : `${chip / 1_000}rb`}
            </button>
          ))}

          {max !== undefined && max > 0 && (
            <button
              type="button"
              onMouseDown={() => handleChip(max)}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
              style={{
                background: value === max ? 'var(--accent)' : 'rgba(34,197,94,0.08)',
                color:      value === max ? '#fff' : 'var(--accent)',
                border:     `1px solid ${value === max ? 'var(--accent)' : 'rgba(34,197,94,0.25)'}`,
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
            key={error ?? 'hint'}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-[11px] font-medium px-1"
            style={{ color: error || exceeds ? '#ef4444' : 'var(--text-muted)' }}
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
