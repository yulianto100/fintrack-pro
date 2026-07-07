'use client'

import { Moon, Sun, Monitor } from 'lucide-react'
import { useDarkMode } from '@/hooks/useDarkMode'

interface Props {
  compact?: boolean
}

export function ThemeToggle({ compact = false }: Props) {
  const { isDark, toggle, mounted } = useDarkMode()
  const theme = isDark ? 'dark' : 'light'

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label="Toggle dark mode"
        className="flex h-9 w-9 items-center justify-center rounded-xl transition-all"
        style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
      >
        {isDark ? <Sun size={16} strokeWidth={2.2} /> : <Moon size={16} strokeWidth={2.2} />}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        className="inline-flex items-center rounded-xl p-1 transition-all"
        style={{ background: 'var(--surface-btn)', border: '1px solid var(--border)' }}
      >
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-all"
          style={{
            background: !isDark ? 'var(--accent-dim)' : 'transparent',
            color: !isDark ? 'var(--accent)' : 'var(--text-muted)',
          }}
        >
          <Sun size={15} strokeWidth={2} />
        </span>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-all"
          style={{
            background: isDark ? 'var(--accent-dim)' : 'transparent',
            color: isDark ? 'var(--accent)' : 'var(--text-muted)',
          }}
        >
          <Moon size={15} strokeWidth={2} />
        </span>
      </button>
      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
        {isDark ? 'Mode gelap' : 'Mode terang'}
      </p>
    </div>
  )
}