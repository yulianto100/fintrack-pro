'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeftRight,
  CreditCard,
  Download,
  LayoutDashboard,
  Plus,
  Search,
  Settings,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useApiList } from '@/hooks/useApiData'
import { formatCurrency } from '@/lib/utils'
import type { Transaction } from '@/types'

interface CommandItem {
  id: string
  group: string
  label: string
  hint?: string
  icon?: ReactNode
  action: () => void
  keywords?: string
}

function fuzzyScore(query: string, target: string): number {
  if (!query) return 0
  const q = query.toLowerCase()
  const t = target.toLowerCase()
  if (t.includes(q)) return 100 - t.indexOf(q)

  let queryIndex = 0
  let score = 0
  for (let i = 0; i < t.length && queryIndex < q.length; i++) {
    if (t[i] === q[queryIndex]) {
      score += 5
      queryIndex++
    }
  }
  return queryIndex === q.length ? score : 0
}

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const { data: transactions } = useApiList<Transaction>('/api/transactions?limit=200', { refreshMs: 60000 })

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((current) => !current)
      } else if (event.key === 'Escape' && open) {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (open) {
      const timer = window.setTimeout(() => inputRef.current?.focus(), 50)
      return () => window.clearTimeout(timer)
    }

    setQuery('')
    setActiveIndex(0)
    return undefined
  }, [open])

  const close = useCallback(() => setOpen(false), [])

  const navItems = useMemo<CommandItem[]>(() => [
    {
      id: 'nav-home',
      group: 'Navigasi',
      label: 'Dashboard',
      icon: <LayoutDashboard size={15} />,
      action: () => { router.push('/'); close() },
    },
    {
      id: 'nav-tx',
      group: 'Navigasi',
      label: 'Transaksi',
      icon: <ArrowLeftRight size={15} />,
      action: () => { router.push('/transactions'); close() },
    },
    {
      id: 'nav-pf',
      group: 'Navigasi',
      label: 'Portofolio',
      icon: <TrendingUp size={15} />,
      action: () => { router.push('/portfolio'); close() },
    },
    {
      id: 'nav-goals',
      group: 'Navigasi',
      label: 'Goals & Budget',
      icon: <Target size={15} />,
      action: () => { router.push('/goals'); close() },
    },
    {
      id: 'nav-akun',
      group: 'Navigasi',
      label: 'Akun',
      icon: <Wallet size={15} />,
      action: () => { router.push('/akun'); close() },
    },
    {
      id: 'nav-cc',
      group: 'Navigasi',
      label: 'Kartu Kredit',
      icon: <CreditCard size={15} />,
      action: () => { router.push('/credit-card'); close() },
    },
    {
      id: 'nav-settings',
      group: 'Navigasi',
      label: 'Pengaturan',
      icon: <Settings size={15} />,
      action: () => { router.push('/settings'); close() },
    },
  ], [close, router])

  const actionItems = useMemo<CommandItem[]>(() => [
    {
      id: 'act-add-tx',
      group: 'Aksi',
      label: 'Tambah Transaksi',
      icon: <Plus size={15} />,
      action: () => {
        window.dispatchEvent(new Event('finuvo:open-add-transaction'))
        close()
      },
    },
    {
      id: 'act-export-xlsx',
      group: 'Aksi',
      label: 'Export ke Excel',
      icon: <Download size={15} />,
      action: () => {
        const anchor = document.createElement('a')
        anchor.href = '/api/export'
        anchor.click()
        close()
      },
    },
    {
      id: 'act-export-json',
      group: 'Aksi',
      label: 'Backup JSON',
      icon: <Download size={15} />,
      action: () => {
        void (async () => {
          const res = await fetch('/api/export?format=json')
          const json = await res.json() as { data?: unknown }
          const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const anchor = document.createElement('a')
          anchor.href = url
          anchor.download = `finuvo-backup-${new Date().toISOString().split('T')[0]}.json`
          anchor.click()
          URL.revokeObjectURL(url)
          close()
        })()
      },
    },
  ], [close])

  const txItems = useMemo<CommandItem[]>(() => transactions.slice(0, 50).map((transaction) => ({
    id: `tx-${transaction.id}`,
    group: 'Cari Transaksi',
    label: transaction.description || transaction.categoryName || 'Transaksi',
    hint: `${transaction.categoryName || 'Tanpa kategori'} • ${formatCurrency(transaction.amount)}`,
    keywords: [transaction.description, transaction.categoryName, transaction.amount.toString()].filter(Boolean).join(' '),
    action: () => {
      router.push(`/transactions?focus=${transaction.id}`)
      close()
    },
  })), [close, router, transactions])

  const allItems = useMemo(
    () => [...navItems, ...actionItems, ...txItems],
    [actionItems, navItems, txItems],
  )

  const filtered = useMemo(() => {
    if (!query) return allItems
    return allItems
      .map((item) => ({ ...item, score: fuzzyScore(query, `${item.label} ${item.keywords || ''}`) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
  }, [allItems, query])

  const grouped = useMemo(() => {
    const map = new Map<string, CommandItem[]>()
    filtered.forEach((item) => {
      if (!map.has(item.group)) map.set(item.group, [])
      map.get(item.group)?.push(item)
    })
    return Array.from(map.entries())
  }, [filtered])

  const onInputKey = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => Math.min(current + 1, filtered.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => Math.max(current - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      filtered[activeIndex]?.action()
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[80]"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
            onClick={close}
          />
          <motion.div
            initial={{ y: -20, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="fixed left-1/2 top-[10vh] z-[81] w-[92vw] max-w-[480px] -translate-x-1/2 overflow-hidden rounded-2xl"
            style={{ background: 'var(--surface-modal)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <Search size={16} style={{ color: 'var(--text-muted)' }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setActiveIndex(0)
                }}
                onKeyDown={onInputKey}
                placeholder="Cari atau jalankan perintah..."
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: 'var(--text-primary)' }}
              />
              <button
                type="button"
                onClick={close}
                className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
              >
                ESC
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                  Tidak ada hasil
                </p>
              ) : (
                grouped.map(([group, items]) => (
                  <div key={group}>
                    <p
                      className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {group}
                    </p>
                    {items.map((item) => {
                      const index = filtered.indexOf(item)
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={item.action}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
                          style={{
                            background: index === activeIndex ? 'var(--accent-dim)' : 'transparent',
                            color: index === activeIndex ? 'var(--accent)' : 'var(--text-primary)',
                          }}
                        >
                          {item.icon}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{item.label}</p>
                            {item.hint && (
                              <p className="truncate text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                {item.hint}
                              </p>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
