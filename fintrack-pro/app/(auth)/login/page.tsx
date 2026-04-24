'use client'

import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, User, AtSign } from 'lucide-react'

type Tab = 'login' | 'register'

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

export default function LoginPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [tab,      setTab     ] = useState<Tab>('login')
  const [loading,  setLoading ] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [error,    setError   ] = useState('')
  const [success,  setSuccess ] = useState('')

  // Login
  const [loginId,   setLoginId  ] = useState('')   // email or username
  const [loginPass, setLoginPass] = useState('')

  // Register
  const [regUser,  setRegUser ] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPass,  setRegPass ] = useState('')
  const [regPass2, setRegPass2] = useState('')

  useEffect(() => {
    if (status === 'authenticated') router.replace('/')
  }, [status, router])

  const switchTab = (t: Tab) => { setTab(t); setError(''); setSuccess('') }

  // ── Google ───────────────────────────────────────────────
  const handleGoogle = async () => {
    setLoading(true); setError('')
    await signIn('google', { callbackUrl: '/' })
  }

  // ── Credentials login ────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginId.trim() || !loginPass) { setError('Isi semua field'); return }
    setLoading(true); setError('')
    try {
      const res = await signIn('credentials', {
        redirect:   false,
        identifier: loginId.trim(),
        password:   loginPass,
      })
      if (res?.error) {
        setError(res.error === 'CredentialsSignin' ? 'Email/username atau password salah' : res.error)
      } else {
        router.replace('/')
      }
    } finally { setLoading(false) }
  }

  // ── Register ─────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSuccess('')
    if (regPass !== regPass2) { setError('Password tidak cocok'); return }
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: regUser, email: regEmail, password: regPass }),
      })
      const json = await res.json()
      if (json.success) {
        setSuccess(json.message)
        switchTab('login')
        setLoginId(regEmail)
      } else {
        setError(json.error)
      }
    } finally { setLoading(false) }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="w-10 h-10 border-2 rounded-full animate-spin"
          style={{ borderColor: 'rgba(52,211,110,.2)', borderTopColor: 'var(--accent)' }} />
      </div>
    )
  }

  // Shared input style
  const IS: React.CSSProperties = {
    background: 'rgba(22,60,35,0.80)',
    border: '1px solid rgba(52,211,110,0.25)',
    borderRadius: 10,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-space)',
    fontSize: '0.9rem',
    padding: '0.8rem 1rem 0.8rem 2.8rem',
    width: '100%',
    outline: 'none',
    transition: 'all .2s',
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-5 relative overflow-hidden">
      {/* BG orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute w-[500px] h-[500px] rounded-full blur-[80px] opacity-20"
          style={{ background: 'radial-gradient(circle,#34d36e,transparent)', top: '-10%', left: '-5%' }} />
        <div className="absolute w-80 h-80 rounded-full blur-3xl opacity-10"
          style={{ background: 'radial-gradient(circle,#22a855,transparent)', bottom: '-5%', right: '0%' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: .5, ease: [.16,1,.3,1] }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 text-3xl"
            style={{
              background: 'linear-gradient(135deg,rgba(52,211,110,.2),rgba(31,168,85,.1))',
              border: '1px solid rgba(52,211,110,.3)',
              boxShadow: '0 0 32px rgba(52,211,110,.15)',
            }}>💰</div>
          <h1 className="text-2xl font-display font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            FinTrack Pro
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Kelola keuangan & investasi Anda</p>
        </div>

        {/* Card */}
        <div className="glass-card p-6">

          {/* Tabs */}
          <div className="flex p-1 rounded-xl gap-1 mb-6" style={{ background: 'rgba(15,46,25,.7)' }}>
            {(['login','register'] as Tab[]).map((t) => (
              <button key={t} onClick={() => switchTab(t)}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: tab === t ? 'var(--accent-dim)' : 'transparent',
                  color:      tab === t ? 'var(--accent)'     : 'var(--text-muted)',
                  border:    `1px solid ${tab === t ? 'rgba(52,211,110,.3)' : 'transparent'}`,
                }}>
                {t === 'login' ? 'Masuk' : 'Daftar'}
              </button>
            ))}
          </div>

          {/* Alert */}
          <AnimatePresence>
            {(error || success) && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-4 px-3 py-2.5 rounded-xl text-sm"
                style={{
                  background: error ? 'rgba(252,129,129,.1)' : 'rgba(52,211,110,.1)',
                  border:    `1px solid ${error ? 'rgba(252,129,129,.25)' : 'rgba(52,211,110,.25)'}`,
                  color:      error ? 'var(--red)'           : 'var(--accent)',
                }}>
                {error || success}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">

            {/* ─── LOGIN ─────────────────────────────── */}
            {tab === 'login' && (
              <motion.form key="login" onSubmit={handleLogin}
                initial={{ opacity:0, x:-12 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:12 }}
                className="space-y-0">

                {/* Google */}
                <button type="button" onClick={handleGoogle} disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3 rounded-xl mb-4 font-medium text-sm transition-all"
                  style={{
                    background: 'rgba(255,255,255,.04)',
                    border: '1px solid rgba(255,255,255,.10)',
                    color: 'var(--text-primary)',
                  }}>
                  {loading
                    ? <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor:'rgba(255,255,255,.3)', borderTopColor:'#fff' }}/>
                    : <><GoogleIcon/> Masuk dengan Google</>
                  }
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px" style={{ background: 'var(--border)' }}/>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>atau</span>
                  <div className="flex-1 h-px" style={{ background: 'var(--border)' }}/>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <AtSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: 'var(--text-muted)' }}/>
                    <input type="text" placeholder="Email atau Username" required
                      value={loginId} onChange={(e) => setLoginId(e.target.value)}
                      style={IS} autoComplete="username"/>
                  </div>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: 'var(--text-muted)' }}/>
                    <input type={showPass ? 'text' : 'password'} placeholder="Password" required
                      value={loginPass} onChange={(e) => setLoginPass(e.target.value)}
                      style={{ ...IS, paddingRight: '3rem' }} autoComplete="current-password"/>
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--text-muted)' }}>
                      {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 mt-4">
                  {loading
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"/>
                    : 'Masuk'
                  }
                </button>
              </motion.form>
            )}

            {/* ─── REGISTER ──────────────────────────── */}
            {tab === 'register' && (
              <motion.form key="register" onSubmit={handleRegister}
                initial={{ opacity:0, x:12 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-12 }}
                className="space-y-3">

                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--text-muted)' }}/>
                  <input type="text" placeholder="Username (huruf, angka, _)" required
                    value={regUser} onChange={(e) => setRegUser(e.target.value)}
                    style={IS} autoComplete="username"/>
                </div>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--text-muted)' }}/>
                  <input type="email" placeholder="Email" required
                    value={regEmail} onChange={(e) => setRegEmail(e.target.value)}
                    style={IS} autoComplete="email"/>
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--text-muted)' }}/>
                  <input type={showPass ? 'text' : 'password'} placeholder="Password (min. 8 karakter)" required
                    value={regPass} onChange={(e) => setRegPass(e.target.value)}
                    style={{ ...IS, paddingRight: '3rem' }} autoComplete="new-password"/>
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-muted)' }}>
                    {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--text-muted)' }}/>
                  <input type={showPass ? 'text' : 'password'} placeholder="Konfirmasi Password" required
                    value={regPass2} onChange={(e) => setRegPass2(e.target.value)}
                    style={IS} autoComplete="new-password"/>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
                  {loading
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"/>
                    : 'Buat Akun'
                  }
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
          Data Anda terenkripsi & aman 🔒
        </p>
      </motion.div>
    </div>
  )
}
