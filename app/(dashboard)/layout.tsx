'use client'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { LayoutDashboard, ArrowLeftRight, TrendingUp, Settings, Target, Wallet } from 'lucide-react'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { useDarkMode } from '@/hooks/useDarkMode'

/**
 * Navigation tabs.
 * NOTE: Budget is no longer a top-level nav item.
 * It lives as a tab inside /goals (the unified Financial Planning page).
 * The /budget route still works (it redirects to /goals?tab=budget).
 */
const NAV_TABS = [
  { href: '/',             icon: LayoutDashboard, label: 'Home'       },
  { href: '/transactions', icon: ArrowLeftRight,  label: 'Transaksi'  },
  { href: '/portfolio',    icon: TrendingUp,      label: 'Aset'       },
  { href: '/goals',        icon: Target,          label: 'Target'     },
  { href: '/akun',         icon: Wallet,          label: 'Akun'       },
  { href: '/settings',     icon: Settings,        label: 'Atur'       },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router   = useRouter()
  const pathname = usePathname()
  useDarkMode()

  // ── Scroll-aware sticky header ─────────────────────────────────────────
  const [scrolled, setScrolled] = useState(false)
  const [avatarFailed, setAvatarFailed] = useState(false)
  const mainRef = useRef<HTMLElement>(null)

  const handleScroll = useCallback(() => {
    setScrolled((mainRef.current?.scrollTop ?? 0) > 16)
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login')
  }, [status, router])
  useEffect(() => {
    setAvatarFailed(false)
  }, [session?.user?.image])

  if (status === 'loading') {
    return (
      <div
        className="min-h-dvh flex flex-col items-center justify-center"
        style={{ background: '#050E08' }}
      >
        <div className="relative flex items-center justify-center">
          <div
            className="absolute rounded-[36px] animate-pulse"
            style={{
              width: 180, height: 180,
              background: 'radial-gradient(circle, rgba(34,197,94,0.18) 0%, transparent 70%)',
            }}
          />
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
        <p
          className="mt-6 text-xl font-display font-bold"
          style={{ color: 'var(--accent)', letterSpacing: 0 }}
        >
          Finuvo
        </p>
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

  const sessionAvatar = avatarFailed ? '' : session.user?.image || ''
  const shouldSkipAvatarOptimization = sessionAvatar.startsWith('/api/profile/avatar') || sessionAvatar.startsWith('data:image/')

  return (
    <div className="h-dvh overflow-hidden flex flex-col" style={{ background: 'transparent' }}>
      {/* ── Top header — becomes more opaque + shadowed on scroll ── */}
      <header
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4"
        style={{
          height:              'calc(var(--nav-height) + env(safe-area-inset-top, 0px))',
          paddingTop:          'env(safe-area-inset-top, 0px)',
          background:          scrolled ? 'var(--surface-header)' : 'var(--surface-header)',
          backdropFilter:      scrolled ? 'blur(24px) saturate(1.8)' : 'blur(20px)',
          WebkitBackdropFilter:scrolled ? 'blur(24px) saturate(1.8)' : 'blur(20px)',
          borderBottom:        `1px solid ${scrolled ? 'var(--border-hover)' : 'var(--border)'}`,
          boxShadow:           scrolled ? '0 4px 24px rgba(0,0,0,0.08)' : 'none',
          transition:          'border-color 0.3s ease, box-shadow 0.3s ease, backdrop-filter 0.3s ease',
        }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 select-none">
          <div
            className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0"
            style={{ boxShadow: '0 0 0 1px rgba(34,197,94,0.25)' }}
          >
            <Image
              src="/icons/icon-header-64.png"
              alt="Finuvo"
              width={32}
              height={32}
              className="object-cover w-full h-full"
            />
          </div>
          <span
            className="font-display font-bold text-base"
            style={{ color: 'var(--accent)', letterSpacing: 0 }}
          >
            Finuvo
          </span>
        </Link>

        {/* Notification + Avatar */}
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Link href="/settings">
            <div
              className="w-9 h-9 rounded-full overflow-hidden transition-transform duration-150 active:scale-95"
              style={{ boxShadow: '0 0 0 2px var(--accent)' }}
            >
              {sessionAvatar ? (
                <Image
                  src={sessionAvatar}
                  alt="avatar"
                  width={36}
                  height={36}
                  unoptimized={shouldSkipAvatarOptimization}
                  onError={() => setAvatarFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-sm font-bold"
                  style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
                >
                  {session.user?.name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
            </div>
          </Link>
        </div>
      </header>

      {/* ── Main content ── */}
      <main
        ref={mainRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
        style={{
          paddingTop:    'calc(var(--nav-height) + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px) + 72px)',
        }}
      >
        <AnimatePresence mode="popLayout">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Bottom navigation ── */}
      <nav
        className="fixed left-0 right-0 z-40 px-3 pointer-events-none"
        style={{ bottom: 'max(10px, env(safe-area-inset-bottom, 0px))' }}
        aria-label="Navigasi utama"
      >
        <div
          className="mx-auto flex items-center justify-around gap-1 rounded-[28px] px-2 py-2 pointer-events-auto"
          style={{
            maxWidth: 430,
            minHeight: 76,
            background: 'color-mix(in srgb, var(--surface-nav) 82%, transparent)',
            border: '1px solid rgba(34,197,94,0.16)',
            boxShadow: '0 18px 48px rgba(15,23,42,0.16), inset 0 1px 0 rgba(255,255,255,0.36)',
            backdropFilter: 'blur(26px) saturate(1.45)',
            WebkitBackdropFilter: 'blur(26px) saturate(1.45)',
          }}
        >
          {NAV_TABS.map(({ href, icon: Icon, label }) => {
            const active =
              href === '/'
                ? pathname === '/'
                : pathname.startsWith(href)
                || (href === '/transactions' && pathname.startsWith('/transaksi'))
                || (href === '/goals' && pathname.startsWith('/budget'))
                || (href === '/akun'  && pathname.startsWith('/credit-card'))
            return (
              <Link
                key={href}
                href={href}
                onClick={() => {
                  // When tapping the already-active Akun tab, reset detail view
                  if (href === '/akun' && active) {
                    window.dispatchEvent(new Event('akun:reset'))
                  }
                }}
                className="relative flex-1 min-w-0"
                aria-current={active ? 'page' : undefined}
              >
                <motion.div
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.94 }}
                  className="relative h-[60px] rounded-2xl flex flex-col items-center justify-center gap-1 overflow-hidden"
                  style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}
                >
                  {active && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-2xl"
                      style={{
                        background: 'linear-gradient(180deg, rgba(34,197,94,0.20), rgba(34,197,94,0.10))',
                        boxShadow: '0 10px 24px rgba(34,197,94,0.20)',
                      }}
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    />
                  )}
                  <div
                    className="relative z-10 h-7 w-7 rounded-xl flex items-center justify-center"
                    style={{
                      background: active ? 'rgba(34,197,94,0.14)' : 'transparent',
                      color: active ? 'var(--accent)' : 'currentColor',
                    }}
                  >
                    <Icon size={20} strokeWidth={active ? 2.55 : 1.9} />
                  </div>
                  <span className="text-[11px] font-semibold leading-none relative z-10 whitespace-nowrap px-0.5">
                    {label}
                  </span>
                </motion.div>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
