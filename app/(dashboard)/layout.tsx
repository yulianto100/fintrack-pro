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
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login')
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--surface-0)' }}>
        <div className="text-center">
          <div className="relative mx-auto w-12 h-12 mb-4">
            <div className="w-12 h-12 rounded-full border-2 absolute" style={{ borderColor: 'rgba(34,197,94,0.2)' }} />
            <div className="w-12 h-12 rounded-full border-2 border-t-green-500 animate-spin absolute" />
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Memuat...</p>
        </div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--surface-0)' }}>
      <header
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14"
        style={{ background: 'rgba(5,13,10,0.90)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
            style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: '0 0 12px rgba(34,197,94,0.4)' }}>
            ₿
          </div>
          <span className="font-display font-bold text-base"
            style={{ background: 'linear-gradient(90deg,#4ade80,#22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
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

      <main className="flex-1 pt-14 pb-safe overflow-y-auto">
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

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around"
        style={{
          background: 'rgba(5,13,10,0.94)',
          backdropFilter: 'blur(24px)',
          borderTop: '1px solid var(--border)',
          height: 'var(--bottom-nav-height)',
          paddingBottom: 'env(safe-area-inset-bottom,0px)',
        }}
      >
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 relative"
              style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}
            >
              {active && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: 'var(--accent-dim)' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
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
