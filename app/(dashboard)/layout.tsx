'use client'

import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import {
  LayoutDashboard, ArrowLeftRight, TrendingUp, Settings, ChevronRight
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/transactions', icon: ArrowLeftRight, label: 'Transaksi' },
  { href: '/portfolio', icon: TrendingUp, label: 'Portofolio' },
  { href: '/settings', icon: Settings, label: 'Pengaturan' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login')
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--surface-0)' }}>
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Memuat...</p>
        </div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-dvh flex flex-col relative" style={{ background: 'var(--surface-0)' }}>
      {/* Top header */}
      <header
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14"
        style={{
          background: 'rgba(10,15,26,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">💰</span>
          <span className="font-display font-bold text-base" style={{ color: 'var(--text-primary)' }}>
            FinTrack Pro
          </span>
        </div>

        {/* Breadcrumb for current section */}
        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          {pathname !== '/' && (
            <>
              <ChevronRight size={12} />
              <span>{NAV_ITEMS.find((n) => n.href === pathname)?.label ||
                pathname.split('/').pop()?.charAt(0).toUpperCase()! +
                pathname.split('/').pop()?.slice(1)!}</span>
            </>
          )}
        </div>

        {/* Avatar */}
        <Link href="/settings">
          <div className="w-8 h-8 rounded-full overflow-hidden border-2"
            style={{ borderColor: 'var(--accent)' }}>
            {session.user?.image ? (
              <Image src={session.user.image} alt="avatar" width={32} height={32} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-bold"
                style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                {session.user?.name?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 pt-14 pb-safe overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around"
        style={{
          background: 'rgba(10,15,26,0.92)',
          backdropFilter: 'blur(24px)',
          borderTop: '1px solid var(--border)',
          height: 'var(--bottom-nav-height)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200"
              style={{
                color: active ? 'var(--accent)' : 'var(--text-muted)',
                background: active ? 'var(--accent-dim)' : 'transparent',
              }}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
