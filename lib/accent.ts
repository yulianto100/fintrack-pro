export const ACCENTS = [
  { id: 'green', name: 'Hijau', base: '#22c55e' },
  { id: 'blue', name: 'Biru', base: '#3b82f6' },
  { id: 'purple', name: 'Ungu', base: '#a855f7' },
  { id: 'orange', name: 'Oranye', base: '#f97316' },
  { id: 'rose', name: 'Rose', base: '#f43f5e' },
] as const

export type AccentId = typeof ACCENTS[number]['id']

export function applyAccent(id: AccentId | null) {
  if (typeof document === 'undefined') return

  const accent = ACCENTS.find((item) => item.id === id) || ACCENTS[0]
  const root = document.documentElement
  root.style.setProperty('--accent', accent.base)
  root.style.setProperty('--accent-dim', `${accent.base}1F`)
  root.style.setProperty('--accent-strong', `${accent.base}E6`)
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
