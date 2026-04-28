'use client'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { LayoutDashboard, ArrowLeftRight, TrendingUp, Settings, Target, PiggyBank } from 'lucide-react'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { useDarkMode } from '@/hooks/useDarkMode'

const NAV_TABS = [
  { href: '/',             icon: LayoutDashboard, label: 'Dashboard'  },
  { href: '/transactions', icon: ArrowLeftRight,  label: 'Transaksi'  },
  { href: '/goals',        icon: Target,          label: 'Goals'      },
  { href: '/portfolio',    icon: TrendingUp,      label: 'Portofolio' },
  { href: '/budget',       icon: PiggyBank,       label: 'Budget'     },
  { href: '/settings',     icon: Settings,        label: 'Pengaturan' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router   = useRouter()
  const pathname = usePathname()
  useDarkMode() // Initialize dark mode from localStorage on mount

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login')
  }, [status, router])

  if (status === 'loading') {
    return (
      <div
        className="min-h-dvh flex flex-col items-center justify-center"
        style={{ background: '#050E08' }}
      >
        {/* Glow ring behind icon */}
        <div className="relative flex items-center justify-center">
          {/* Outer glow pulse */}
          <div
            className="absolute rounded-[36px] animate-pulse"
            style={{
              width: 180, height: 180,
              background: 'radial-gradient(circle, rgba(34,197,94,0.18) 0%, transparent 70%)',
            }}
          />
          {/* Icon */}
          <div
            className="relative rounded-[32px] overflow-hidden"
            style={{
              width: 140, height: 140,
              boxShadow: '0 0 60px rgba(34,197,94,0.25), 0 0 120px rgba(34,197,94,0.10)',
            }}
          >
            <Image
              src="/icons/icon-512x512.png"
              alt="Finuvo"
              width={140}
              height={140}
              className="object-cover w-full h-full"
              priority
            />
          </div>
        </div>

        {/* App name */}
        <p
          className="mt-6 text-xl font-display font-bold tracking-tight"
          style={{ color: 'var(--accent)', letterSpacing: '-0.02em' }}
        >
          Finuvo
        </p>

        {/* Spinner */}
        <div className="relative w-6 h-6 mt-5">
          <div className="absolute inset-0 rounded-full border-2" style={{ borderColor: 'rgba(34,197,94,0.12)' }} />
          <div
            className="absolute inset-0 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--accent)' }}
          />
        </div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'transparent' }}>
      <header
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4"
        style={{
          height: 'calc(var(--nav-height) + env(safe-area-inset-top, 0px))',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          background: 'var(--surface-header)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {/* ── Left: App logo + name ── */}
        <Link href="/" className="flex items-center gap-2 select-none">
          <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0"
            style={{ boxShadow: '0 0 0 1px rgba(34,197,94,0.25)' }}>
            <Image
              src="/icons/icon-header-64.png"
              alt="Finuvo"
              width={32}
              height={32}
              className="object-cover w-full h-full"
            />
          </div>
          <span
            className="font-display font-bold text-base tracking-tight"
            style={{ color: 'var(--accent)', letterSpacing: '-0.02em' }}
          >
            Finuvo
          </span>
        </Link>

        {/* ── Right: Notification + Avatar ── */}
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Link href="/settings">
            <div className="w-9 h-9 rounded-full overflow-hidden" style={{ boxShadow: '0 0 0 2px var(--accent)' }}>
              {session.user?.image ? (
                <Image src={session.user.image} alt="avatar" width={36} height={36} className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-bold"
                  style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                  {session.user?.name?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
          </Link>
        </div>
      </header>

      <main
        className="flex-1 overflow-y-auto"
        style={{
          paddingTop:    'calc(var(--nav-height) + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px) + 12px)',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div key={pathname}
            initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around"
        style={{
          height: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          background: 'var(--surface-nav)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid var(--border)',
        }}
      >
        {NAV_TABS.map(({ href, icon: Icon, label }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl relative transition-all"
              style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}>
              {active && (
                <motion.div layoutId="nav-pill" className="absolute inset-0 rounded-xl"
                  style={{ background: 'var(--accent-dim)' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
              )}
              <Icon size={19} strokeWidth={active ? 2.5 : 1.8} className="relative z-10" />
              <span className="text-[9px] font-medium relative z-10">{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
