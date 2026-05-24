'use client'

import { useCallback } from 'react'
import type { MouseEvent } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, Check, X, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApiList } from '@/hooks/useApiData'
import { usePushNotifications } from '@/hooks/usePushNotifications'
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
  const { data: notifications, refetch } = useApiList<Notification>('/api/notifications', {
    refreshMs: open ? 8000 : 60000,
  })
  const { supported, subscribed, loading, subscribe, unsubscribe } = usePushNotifications()

  const handleMarkAllRead = useCallback(async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      refetch()
    } catch {
      toast.error('Gagal menandai')
    }
  }, [refetch])

  const handleClick = useCallback(async (notification: Notification) => {
    if (!notification.read) {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [notification.id] }),
      })
      refetch()
    }
    if (notification.link) onClose()
  }, [refetch, onClose])

  const handleDelete = useCallback(async (id: string, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    event.preventDefault()

    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
      refetch()
    } catch {
      toast.error('Gagal hapus')
    }
  }, [refetch])

  const handleTogglePush = useCallback(async () => {
    try {
      if (subscribed) {
        await unsubscribe()
        toast.success('Push dimatikan')
      } else {
        await subscribe()
        toast.success('Push diaktifkan')
      }
    } catch {
      toast.error('Gagal mengubah push')
    }
  }, [subscribe, subscribed, unsubscribe])

  const hasUnread = notifications.some((notification) => !notification.read)

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
            style={{ background: 'var(--surface-modal)', borderLeft: '1px solid var(--border)' }}
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
              ) : (
                <div className="space-y-1 p-2">
                  {notifications.map((notification) => {
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

                    return notification.link ? (
                      <Link key={notification.id} href={notification.link} onClick={() => { void handleClick(notification) }}>
                        {content}
                      </Link>
                    ) : (
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

            {supported && (
              <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
                <button
                  type="button"
                  onClick={() => { void handleTogglePush() }}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold"
                  style={{
                    background: subscribed ? 'var(--surface-2)' : 'var(--accent-dim)',
                    color: subscribed ? 'var(--text-primary)' : 'var(--accent)',
                    border: '1px solid var(--border)',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? (
                    <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  ) : subscribed ? (
                    'Matikan push'
                  ) : (
                    'Aktifkan push'
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
