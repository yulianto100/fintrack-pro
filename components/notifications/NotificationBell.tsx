'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, CheckCheck } from 'lucide-react'
import {
  generateNotifications, loadNotifications, saveNotifications,
  dismissNotification, getDismissed, clearAllNotifications,
  type AppNotification,
} from '@/lib/notifications-engine'
import { useApiList } from '@/hooks/useApiData'
import type { Transaction, BudgetStatus } from '@/types'

export function NotificationBell() {
  const [open, setOpen]               = useState(false)
  const [notifications, setNotifs]    = useState<AppNotification[]>([])
  const [dismissed, setDismissed]     = useState<Set<string>>(new Set())
  const [mounted, setMounted]         = useState(false)
  const panelRef                      = useRef<HTMLDivElement>(null)

  const { data: transactions } = useApiList<Transaction>('/api/transactions?limit=200', { refreshMs: 60000 })
  const { data: budgets }      = useApiList<BudgetStatus>('/api/budget', { refreshMs: 60000 })

  useEffect(() => {
    setMounted(true)
    setDismissed(getDismissed())
  }, [])

  // Generate & store notifications when data arrives
  useEffect(() => {
    if (!mounted || (!transactions.length && !budgets.length)) return
    const generated = generateNotifications(transactions, budgets)
    const existing  = loadNotifications()
    // Merge: add new ones not already stored
    const existingIds = new Set(existing.map((n) => n.id))
    const merged = [...generated.filter((n) => !existingIds.has(n.id)), ...existing]
    saveNotifications(merged)
    setNotifs(merged)
  }, [transactions, budgets, mounted])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const visible    = notifications.filter((n) => !dismissed.has(n.id))
  const unreadHigh = visible.filter((n) => n.priority === 'high').length
  const unread     = visible.length

  const handleDismiss = useCallback((id: string) => {
    dismissNotification(id)
    setDismissed((prev) => new Set([...prev, id]))
  }, [])

  const handleClearAll = useCallback(() => {
    clearAllNotifications()
    setNotifs([])
    setDismissed(new Set())
    setOpen(false)
  }, [])

  if (!mounted) return null

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 rounded-full flex items-center justify-center transition-all"
        style={{
          background: open ? 'var(--accent-dim)' : 'transparent',
          color: open ? 'var(--accent)' : 'var(--text-muted)',
        }}
      >
        <Bell size={18} strokeWidth={open ? 2.5 : 1.8} />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-1"
            style={{ background: unreadHigh > 0 ? 'var(--red)' : 'var(--accent)' }}
          >
            {unread > 9 ? '9+' : unread}
          </motion.span>
        )}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="absolute right-0 top-12 w-80 rounded-2xl shadow-glass-lg overflow-hidden z-50"
            style={{
              background: 'var(--surface-0)',
              border: '1px solid var(--border)',
              maxHeight: '70dvh',
              overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 sticky top-0 z-10"
              style={{ background: 'var(--surface-0)', borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <Bell size={14} color="var(--accent)" />
                <p className="font-display font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Notifikasi
                </p>
                {unread > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                    {unread} baru
                  </span>
                )}
              </div>
              {notifications.length > 0 && (
                <button onClick={handleClearAll}
                  className="flex items-center gap-1 text-[10px] font-medium"
                  style={{ color: 'var(--text-muted)' }}>
                  <CheckCheck size={12} /> Hapus semua
                </button>
              )}
            </div>

            {/* Notifications list */}
            {visible.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-2xl mb-2">🎉</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Semua beres!
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Tidak ada notifikasi baru
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1.5">
                <AnimatePresence>
                  {visible.map((notif) => (
                    <motion.div
                      key={notif.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20, height: 0 }}
                      className="relative flex items-start gap-3 p-3 rounded-xl"
                      style={{
                        background: notif.priority === 'high'
                          ? 'rgba(239,68,68,0.06)'
                          : notif.priority === 'medium'
                          ? 'rgba(245,158,11,0.06)'
                          : 'rgba(34,197,94,0.04)',
                        border: `1px solid ${
                          notif.priority === 'high'
                            ? 'rgba(239,68,68,0.15)'
                            : notif.priority === 'medium'
                            ? 'rgba(245,158,11,0.15)'
                            : 'rgba(34,197,94,0.12)'
                        }`,
                      }}
                    >
                      <span className="text-base flex-shrink-0 mt-0.5">{notif.icon}</span>
                      <div className="flex-1 min-w-0 pr-5">
                        <p className="text-xs font-semibold leading-tight" style={{ color: notif.color }}>
                          {notif.title}
                        </p>
                        <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                          {notif.message}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDismiss(notif.id)}
                        className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.06)', color: 'var(--text-muted)' }}
                      >
                        <X size={10} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
