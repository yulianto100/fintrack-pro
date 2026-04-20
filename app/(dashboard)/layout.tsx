'use client'

import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { LayoutDashboard, ArrowLeftRight, TrendingUp, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/',             icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/transactions', icon: ArrowLeftRight,  label: 'Transaksi' },
  { href: '/portfolio',    icon: TrendingUp,      label: 'Portofolio' },
  { href: '/settings',     icon: Settings,        label: 'Pengaturan' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login')
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: '#061510' }}>
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2" style={{ borderColor: 'rgba(52,211,110,0.15)' }} />
          <div className="absolute inset-0 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--accent)' }} />
        </div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'transparent' }}>

      {/* ─── Top header ─── */}
      <header
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4"
        style={{
          height: 'calc(var(--nav-height) + env(safe-area-inset-top, 0px))',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          background: 'rgba(6,21,16,0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{ background: 'linear-gradient(135deg,#34d36e,#22a855)', boxShadow: '0 0 10px rgba(52,211,110,0.35)' }}>
            ₣
          </div>
          <span className="font-display font-bold text-base"
            style={{ background: 'linear-gradient(90deg,#6ee89a,#34d36e)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            FinTrack Pro
          </span>
        </div>

        <Link href="/settings">
          <div className="w-8 h-8 rounded-full overflow-hidden" style={{ boxShadow: '0 0 0 2px var(--accent)' }}>
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

      {/* ─── Main content — padded for header + bottom nav + safe area ─── */}
      <main
        className="flex-1 overflow-y-auto"
        style={{
          paddingTop: 'calc(var(--nav-height) + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px) + 16px)',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.16,1,0.3,1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ─── Bottom nav with safe-area ─── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around"
        style={{
          height: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          background: 'rgba(6,21,16,0.94)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid var(--border)',
        }}
      >
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl relative transition-all"
              style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}
            >
              {active && (
                <motion.div layoutId="nav-pill" className="absolute inset-0 rounded-xl"
                  style={{ background: 'var(--accent-dim)' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
              )}
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} className="relative z-10" />
              <span className="text-[10px] font-medium relative z-10">{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
