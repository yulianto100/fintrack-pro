'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Bell } from 'lucide-react'
import { useApiList } from '@/hooks/useApiData'
import { NotificationCenter } from './NotificationCenter'
import type { Notification } from '@/types'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { data: notifications } = useApiList<Notification>('/api/notifications', { refreshMs: 30000 })
  const unread = notifications.filter((notification) => !notification.read).length

  return (
    <>
      <motion.button
        type="button"
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen(true)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full"
        style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}
        aria-label="Buka aktivitas"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full px-1 text-[9px] font-bold ring-2"
            style={{ background: 'var(--red)', color: '#fff', ['--tw-ring-color' as string]: 'var(--surface-header)' }}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </motion.button>
      <NotificationCenter open={open} onClose={() => setOpen(false)} />
    </>
  )
}
