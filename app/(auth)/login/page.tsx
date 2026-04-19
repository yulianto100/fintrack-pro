'use client'

import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, RefreshCw } from 'lucide-react'

type Tab = 'login' | 'register'
type LoginStep = 'form' | 'otp'

function getDeviceId(): string {
  if (typeof window === 'undefined') return 'ssr'
  let id = localStorage.getItem('fintrack_device_id')
  if (!id) {
    id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem('fintrack_device_id', id)
  }
  return id
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

export default function LoginPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [tab,       setTab      ] = useState<Tab>('login')
  const [step,      setStep     ] = useState<LoginStep>('form')
  const [loading,   setLoading  ] = useState(false)
  const [showPass,  setShowPass ] = useState(false)
  const [error,     setError    ] = useState('')
  const [success,   setSuccess  ] = useState('')
  const [otpTimer,  setOtpTimer ] = useState(0)

  // Login fields
  const [loginEmail,  setLoginEmail ] = useState('')
  const [loginPass,   setLoginPass  ] = useState('')
  const [loginOtp,    setLoginOtp   ] = useState('')

  // Register fields
  const [regUsername, setRegUsername] = useState('')
  const [regEmail,    setRegEmail   ] = useState('')
  const [regPass,     setRegPass    ] = useState('')
  const [regPass2,    setRegPass2   ] = useState('')

  useEffect(() => { if (session) router.replace('/') }, [session, router])
  useEffect(() => {
    if (otpTimer <= 0) return
    const t = setInterval(() => setOtpTimer((v) => v - 1), 1000)
    return () => clearInterval(t)
  }, [otpTimer])

  if (status === 'loading') {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="w-10 h-10 border-2 rounded-full animate-spin"
          style={{ borderColor: 'rgba(52,211,110,.3)', borderTopColor: 'var(--accent)' }} />
      </div>
    )
  }

  // ── Google login ──────────────────────────────────────────
  const handleGoogle = async () => {
    setLoading(true); setError('')
    await signIn('google', { callbackUrl: '/' })
  }

  // ── Credentials login ─────────────────────────────────────
  const handleCredLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const deviceId = getDeviceId()
      const result = await signIn('credentials', {
        redirect: false,
        email: loginEmail, password: loginPass,
        otp: step === 'otp' ? loginOtp : '',
        deviceId,
      })
      if (result?.error === 'OTP_REQUIRED') {
        // Trigger OTP send
        await sendOtp()
        setStep('otp')
      } else if (result?.error) {
        setError(result.error)
      } else {
        router.replace('/')
      }
    } finally { setLoading(false) }
  }

  const sendOtp = async () => {
    setError(''); setSuccess('')
    const res  = await fetch('/api/auth/send-otp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginEmail }),
    })
    const json = await res.json()
    if (json.success) {
      setSuccess('Kode OTP telah dikirim ke email Anda (berlaku 10 menit)')
      setOtpTimer(60)
    } else {
      setError(json.error || 'Gagal mengirim OTP')
    }
  }

  // ── Register ──────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    if (regPass !== regPass2) { setError('Password tidak cocok'); setLoading(false); return }
    try {
      const res  = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: regUsername, email: regEmail, password: regPass }),
      })
      const json = await res.json()
      if (json.success) {
        setSuccess(json.message)
        setTab('login')
        setLoginEmail(regEmail)
      } else { setError(json.error) }
    } finally { setLoading(false) }
  }

  // ── UI helpers ────────────────────────────────────────────
  const inputStyle = {
    background: 'rgba(22,60,35,0.80)',
    border: '1px solid rgba(52,211,110,0.25)',
    borderRadius: 10, color: 'var(--text-primary)',
    fontFamily: 'var(--font-space)', fontSize: '0.9rem',
    padding: '0.75rem 1rem 0.75rem 2.8rem',
    width: '100%', outline: 'none',
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-5 relative overflow-hidden">
      {/* BG orbs */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute w-96 h-96 rounded-full blur-3xl opacity-20 animate-float"
          style={{ background:'radial-gradient(circle,#34d36e,transparent)', top:'5%', left:'10%' }} />
        <div className="absolute w-72 h-72 rounded-full blur-3xl opacity-10"
          style={{ background:'radial-gradient(circle,#1fa855,transparent)', bottom:'10%', right:'8%' }} />
      </div>

      <motion.div initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }}
        transition={{ duration:.5, ease:[.16,1,.3,1] }}
        className="w-full max-w-sm relative z-10">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background:'linear-gradient(135deg,rgba(52,211,110,.25),rgba(31,168,85,.15))', border:'1px solid rgba(52,211,110,.35)', boxShadow:'0 0 32px rgba(52,211,110,.2)' }}>
            <span className="text-3xl">💰</span>
          </div>
          <h1 className="text-2xl font-display font-bold mb-1" style={{ color:'var(--text-primary)' }}>FinTrack Pro</h1>
          <p className="text-sm" style={{ color:'var(--text-muted)' }}>Kelola keuangan & investasi Anda</p>
        </div>

        {/* Card */}
        <div className="glass-card p-6">
          {/* Tabs */}
          {step === 'form' && (
            <div className="flex mb-6 p-1 rounded-xl gap-1" style={{ background:'rgba(22,60,35,.6)' }}>
              {(['login','register'] as Tab[]).map((t) => (
                <button key={t} onClick={() => { setTab(t); setError(''); setSuccess('') }}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: tab===t ? 'var(--accent-dim)' : 'transparent',
                    color:      tab===t ? 'var(--accent)'     : 'var(--text-muted)',
                    border:    `1px solid ${tab===t ? 'rgba(52,211,110,.3)' : 'transparent'}`,
                  }}>
                  {t === 'login' ? 'Masuk' : 'Daftar'}
                </button>
              ))}
            </div>
          )}

          {/* OTP step back button */}
          {step === 'otp' && (
            <button onClick={() => { setStep('form'); setLoginOtp(''); setError(''); setSuccess('') }}
              className="flex items-center gap-2 mb-5 text-sm" style={{ color:'var(--text-muted)' }}>
              <ArrowLeft size={15}/> Kembali
            </button>
          )}

          {/* Error / Success */}
          <AnimatePresence>
            {(error || success) && (
              <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                className="mb-4 px-3 py-2.5 rounded-xl text-sm"
                style={{
                  background: error ? 'rgba(252,129,129,.1)' : 'rgba(52,211,110,.1)',
                  border:    `1px solid ${error ? 'rgba(252,129,129,.25)' : 'rgba(52,211,110,.25)'}`,
                  color:      error ? 'var(--red)' : 'var(--accent)',
                }}>
                {error || success}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── LOGIN FORM ─────────────────────────── */}
          <AnimatePresence mode="wait">
            {tab === 'login' && step === 'form' && (
              <motion.form key="login" onSubmit={handleCredLogin}
                initial={{ opacity:0, x:-15 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:15 }}>

                {/* Google */}
                <button type="button" onClick={handleGoogle} disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3 rounded-xl mb-5 font-medium text-sm transition-all"
                  style={{ background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.12)', color:'var(--text-primary)' }}>
                  {loading ? <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor:'rgba(255,255,255,.3)', borderTopColor:'#fff' }}/> : <><GoogleIcon/> Masuk dengan Google</>}
                </button>

                <div className="flex items-center gap-3 mb-5">
                  <div className="flex-1 h-px" style={{ background:'var(--border)' }}/>
                  <span className="text-xs" style={{ color:'var(--text-muted)' }}>atau</span>
                  <div className="flex-1 h-px" style={{ background:'var(--border)' }}/>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:'var(--text-muted)' }}/>
                    <input type="email" placeholder="Email" required value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)} style={inputStyle}/>
                  </div>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:'var(--text-muted)' }}/>
                    <input type={showPass ? 'text' : 'password'} placeholder="Password" required value={loginPass}
                      onChange={(e) => setLoginPass(e.target.value)}
                      style={{ ...inputStyle, paddingRight:'2.8rem' }}/>
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color:'var(--text-muted)' }}>
                      {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full mt-4 py-3.5">
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"/> : 'Masuk'}
                </button>
              </motion.form>
            )}

            {/* ── OTP STEP ───────────────────────────── */}
            {tab === 'login' && step === 'otp' && (
              <motion.div key="otp" initial={{ opacity:0, x:15 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-15 }}>
                <div className="text-center mb-5">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3"
                    style={{ background:'rgba(52,211,110,.12)', border:'1px solid rgba(52,211,110,.25)' }}>🔐</div>
                  <p className="font-semibold mb-1" style={{ color:'var(--text-primary)' }}>Verifikasi OTP</p>
                  <p className="text-xs" style={{ color:'var(--text-muted)' }}>
                    Kode 6 digit telah dikirim ke<br/>
                    <strong style={{ color:'var(--text-secondary)' }}>{loginEmail}</strong>
                  </p>
                </div>

                <div className="relative mb-3">
                  <input type="text" inputMode="numeric" maxLength={6} placeholder="______"
                    className="input-glass text-center text-2xl font-bold tracking-[.5rem]"
                    value={loginOtp} onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g,'').slice(0,6))}/>
                </div>

                <button onClick={handleCredLogin} disabled={loading || loginOtp.length < 6}
                  className="btn-primary w-full py-3.5 mb-3">
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"/> : 'Verifikasi & Masuk'}
                </button>

                <button onClick={() => { if (otpTimer <= 0) sendOtp() }} disabled={otpTimer > 0}
                  className="w-full py-2 text-xs flex items-center justify-center gap-1.5 rounded-xl transition-all"
                  style={{ color: otpTimer>0 ? 'var(--text-muted)' : 'var(--accent)', background:'transparent' }}>
                  <RefreshCw size={13}/>
                  {otpTimer > 0 ? `Kirim ulang (${otpTimer}s)` : 'Kirim ulang OTP'}
                </button>
              </motion.div>
            )}

            {/* ── REGISTER FORM ──────────────────────── */}
            {tab === 'register' && (
              <motion.form key="register" onSubmit={handleRegister}
                initial={{ opacity:0, x:15 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-15 }}
                className="space-y-3">

                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:'var(--text-muted)' }}/>
                  <input type="text" placeholder="Username" required value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)} style={inputStyle}/>
                </div>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:'var(--text-muted)' }}/>
                  <input type="email" placeholder="Email" required value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)} style={inputStyle}/>
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:'var(--text-muted)' }}/>
                  <input type={showPass ? 'text' : 'password'} placeholder="Password (min. 8 karakter)" required value={regPass}
                    onChange={(e) => setRegPass(e.target.value)} style={{ ...inputStyle, paddingRight:'2.8rem' }}/>
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color:'var(--text-muted)' }}>
                    {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:'var(--text-muted)' }}/>
                  <input type={showPass ? 'text' : 'password'} placeholder="Konfirmasi Password" required value={regPass2}
                    onChange={(e) => setRegPass2(e.target.value)} style={inputStyle}/>
                </div>

                <div className="p-3 rounded-xl text-xs" style={{ background:'rgba(52,211,110,.06)', border:'1px solid rgba(52,211,110,.15)', color:'var(--text-muted)' }}>
                  🔐 Login dari perangkat baru memerlukan verifikasi OTP via email
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"/> : 'Buat Akun'}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-xs mt-4" style={{ color:'var(--text-muted)' }}>
          Data Anda terenkripsi & aman
        </p>
      </motion.div>
    </div>
  )
}
