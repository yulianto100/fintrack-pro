export const ACCENTS = [
  { id: 'green', name: 'Hijau', base: '#22C55E', dark: '#16A34A', light: '#4ADE80' },
  { id: 'blue', name: 'Biru', base: '#3B82F6', dark: '#1D4ED8', light: '#60A5FA' },
  { id: 'purple', name: 'Ungu', base: '#A855F7', dark: '#7E22CE', light: '#C084FC' },
  { id: 'orange', name: 'Oranye', base: '#F97316', dark: '#C2410C', light: '#FB923C' },
  { id: 'rose', name: 'Rose', base: '#F43F5E', dark: '#BE123C', light: '#FB7185' },
] as const

export type AccentId = typeof ACCENTS[number]['id']

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `${r}, ${g}, ${b}`
}

export function applyAccent(id: AccentId | null) {
  if (typeof document === 'undefined') return

  const accent = ACCENTS.find((item) => item.id === id) || ACCENTS[0]
  const root = document.documentElement
  const isDark =
    root.classList.contains('dark') ||
    document.body.classList.contains('dark') ||
    window.matchMedia('(prefers-color-scheme: dark)').matches
  const rgb = hexToRgb(accent.base)

  root.style.setProperty('--accent', accent.base)
  root.style.setProperty('--accent-light', accent.light)
  root.style.setProperty('--accent-dark', accent.dark)
  root.style.setProperty('--accent-dim', `rgba(${rgb}, ${isDark ? '0.14' : '0.10'})`)
  root.style.setProperty('--accent-glow', `rgba(${rgb}, ${isDark ? '0.30' : '0.25'})`)
  root.style.setProperty('--accent-strong', `${accent.base}E6`)
  root.style.setProperty('--border', `rgba(${rgb}, ${isDark ? '0.18' : '0.14'})`)
  root.style.setProperty('--border-hover', `rgba(${rgb}, ${isDark ? '0.35' : '0.30'})`)
  root.style.setProperty('--income', accent.light)
}

export function getStoredAccent(): AccentId {
  if (typeof window === 'undefined') return 'green'

  const stored = window.localStorage.getItem('finuvo:accent')
  return ACCENTS.some((accent) => accent.id === stored) ? (stored as AccentId) : 'green'
}

export function storeAccent(id: AccentId) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem('finuvo:accent', id)
}
