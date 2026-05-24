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
            className="absolute right-1 top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold"
            style={{ background: 'var(--red)', color: '#fff' }}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </motion.button>
      <NotificationCenter open={open} onClose={() => setOpen(false)} />
    </>
  )
}
