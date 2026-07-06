'use client'

import { useCallback, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, Check, X, Trash2 } from 'lucide-react'
import { useApiList } from '@/hooks/useApiData'
import type { Notification } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Baru saja'
  if (minutes < 60) return `${minutes} mnt lalu`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} hari lalu`

  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

export function NotificationCenter({ open, onClose }: Props) {
  const [filter, setFilter] = useState<'all' | 'unread' | 'money' | 'bills'>('all')
  const { data: notifications, refetch } = useApiList<Notification>('/api/notifications', {
    refreshMs: open ? 8000 : 60000,
  })

  const handleMarkAllRead = useCallback(async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      refetch()
    } catch {
      console.error('Failed to mark notifications as read')
    }
  }, [refetch])

  const handleClick = useCallback(async (notification: Notification) => {
    onClose()
    if (!notification.read) {
      fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [notification.id] }),
      }).catch(() => {})
      refetch()
    }
  }, [refetch, onClose])

  const handleDelete = useCallback(async (id: string, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    event.preventDefault()

    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
      refetch()
    } catch {
      console.error('Failed to delete notification')
    }
  }, [refetch])

  const hasUnread = notifications.some((notification) => !notification.read)
  const visibleNotifications = useMemo(() => notifications.filter((notification) => {
    if (filter === 'unread') return !notification.read
    if (filter === 'money') return notification.type === 'budget_warning' || notification.type === 'price_alert'
    if (filter === 'bills') return notification.type === 'bill_due' || notification.type === 'cc_due' || notification.type === 'deposit_maturity'
    return true
  }), [filter, notifications])
  const filters = [
    { key: 'all' as const, label: 'Semua' },
    { key: 'unread' as const, label: 'Belum dibaca' },
    { key: 'money' as const, label: 'Uang' },
    { key: 'bills' as const, label: 'Jatuh tempo' },
  ]

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed bottom-0 right-0 top-0 z-50 flex w-full flex-col sm:max-w-sm"
            style={{
              paddingTop: 'env(safe-area-inset-top, 0px)',
              background: 'var(--surface-modal)',
              borderLeft: '1px solid var(--border)',
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-4"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                Aktivitas
              </h2>
              <div className="flex items-center gap-2">
                {hasUnread && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 text-xs font-semibold"
                    style={{ color: 'var(--accent)' }}
                  >
                    <Check size={13} /> Semua dibaca
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}
                  aria-label="Tutup aktivitas"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {notifications.length > 0 && (
              <div className="flex gap-2 overflow-x-auto px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                {filters.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilter(item.key)}
                    className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold"
                    style={{
                      background: filter === item.key ? 'var(--accent-dim)' : 'var(--surface-2)',
                      color: filter === item.key ? 'var(--accent)' : 'var(--text-muted)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-10 text-center">
                  <Bell size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Belum ada notifikasi
                  </p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    Aktivitas akan muncul di sini
                  </p>
                </div>
              ) : visibleNotifications.length === 0 ? (
                <div className="p-10 text-center">
                  <Bell size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Kosong di filter ini
                  </p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    Coba pilih Semua
                  </p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {visibleNotifications.map((notification) => {
                    const content = (
                      <div
                        className="group flex items-start gap-3 rounded-xl p-3"
                        style={{
                          background: notification.read ? 'transparent' : 'rgba(34,197,94,0.07)',
                          border: '1px solid var(--border)',
                          cursor: 'pointer',
                        }}
                      >
                        <div
                          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-base"
                          style={{ background: 'var(--surface-2)' }}
                        >
                          {notification.icon || '🔔'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            {!notification.read && (
                              <span
                                style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }}
                              />
                            )}
                            <p
                              className="truncate text-[13px] font-bold leading-tight"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {notification.title}
                            </p>
                          </div>
                          {notification.message && (
                            <p
                              className="mt-0.5 line-clamp-2 text-[11px] leading-snug"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              {notification.message}
                            </p>
                          )}
                          <p className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            {relativeTime(notification.createdAt)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => handleDelete(notification.id, event)}
                          className="p-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                          style={{ color: 'var(--red)' }}
                          aria-label="Hapus notifikasi"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )

                    return (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => { void handleClick(notification) }}
                        className="w-full text-left"
                      >
                        {content}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
