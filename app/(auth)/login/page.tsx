'use client'

import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (session) router.replace('/')
  }, [session, router])

  const handleGoogleLogin = async () => {
    setLoading(true)
    await signIn('google', { callbackUrl: '/' })
  }

  if (status === 'loading') {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--surface-0)' }}>
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'var(--surface-0)' }}>

      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl animate-float"
          style={{ background: 'radial-gradient(circle, #22c55e, transparent)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-8 blur-3xl"
          style={{ background: 'radial-gradient(circle, #3b82f6, transparent)', animationDelay: '3s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6 relative"
            style={{
              background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(16,163,74,0.1))',
              border: '1px solid rgba(34,197,94,0.3)',
            }}>
            <span className="text-4xl">💰</span>
            <div className="absolute inset-0 rounded-3xl"
              style={{ boxShadow: '0 0 30px rgba(34,197,94,0.2)' }} />
          </div>
          <h1 className="text-3xl font-display font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            FinTrack Pro
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Kendali penuh atas keuangan & investasi Anda
          </p>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="glass-card p-8"
        >
          <h2 className="font-display font-semibold text-xl mb-2" style={{ color: 'var(--text-primary)' }}>
            Selamat datang
          </h2>
          <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
            Masuk untuk melanjutkan ke dashboard Anda
          </p>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl font-medium text-sm transition-all duration-200 relative overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'var(--text-primary)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
            }}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <GoogleIcon />
                <span>Masuk dengan Google</span>
              </>
            )}
          </button>

          <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { icon: '🔒', label: 'Data Aman' },
                { icon: '📱', label: 'Mobile First' },
                { icon: '⚡', label: 'Realtime' },
              ].map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-1">
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
          Data Anda terenkripsi & aman. Hanya Anda yang bisa melihatnya.
        </p>
      </motion.div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
