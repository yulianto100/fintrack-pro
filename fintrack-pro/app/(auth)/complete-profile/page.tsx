'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { User, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * Shown after first Google login to force username + password creation.
 * Once submitted, user can login via email+password or username+password.
 */
export default function CompleteProfilePage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm ] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading ] = useState(false)
  const [error,    setError   ] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login')
  }, [status, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username.trim())         { setError('Username wajib diisi'); return }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username.trim()))
      { setError('Username hanya huruf, angka, _ (3-20 karakter)'); return }
    if (!password)                 { setError('Password wajib diisi'); return }
    if (password.length < 8)       { setError('Password minimal 8 karakter'); return }
    if (password !== confirm)      { setError('Konfirmasi password tidak cocok'); return }

    setLoading(true)
    try {
      const res  = await fetch('/api/auth/complete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      const json = await res.json()
      if (!json.success) { setError(json.error || 'Gagal menyimpan'); return }

      await update({ name: username.trim() })
      toast.success('Profil berhasil dilengkapi! ✓')
      router.replace('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally { setLoading(false) }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: '#061510' }}>
        <div className="w-10 h-10 border-2 rounded-full animate-spin"
          style={{ borderColor: 'rgba(52,211,110,0.2)', borderTopColor: 'var(--accent)' }} />
      </div>
    )
  }

  const IS: React.CSSProperties = {
    background: 'rgba(22,60,35,0.80)',
    border: '1px solid rgba(52,211,110,0.22)',
    borderRadius: 10, color: 'var(--text-primary)',
    fontFamily: 'var(--font-space)', fontSize: '0.9rem',
    padding: '0.75rem 1rem 0.75rem 2.8rem',
    width: '100%', outline: 'none',
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-5 relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle,#34d36e,transparent)', top:'-5%', left:'-5%' }} />
      </div>

      <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }}
        transition={{ duration:.5 }} className="w-full max-w-sm relative z-10">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 text-3xl"
            style={{ background:'linear-gradient(135deg,rgba(52,211,110,.2),rgba(31,168,85,.1))', border:'1px solid rgba(52,211,110,.3)' }}>
            ✨
          </div>
          <h1 className="text-2xl font-display font-bold mb-1" style={{ color:'var(--text-primary)' }}>
            Lengkapi Profil
          </h1>
          <p className="text-sm" style={{ color:'var(--text-muted)' }}>
            Buat username & password untuk login lebih fleksibel
          </p>
        </div>

        <div className="glass-card p-6">
          {/* Google user info */}
          <div className="flex items-center gap-3 p-3 rounded-xl mb-5"
            style={{ background:'rgba(52,211,110,0.07)', border:'1px solid rgba(52,211,110,0.15)' }}>
            <CheckCircle size={16} color="var(--accent)" />
            <div>
              <p className="text-xs font-medium" style={{ color:'var(--accent)' }}>Login via Google berhasil</p>
              <p className="text-xs" style={{ color:'var(--text-muted)' }}>{session?.user?.email}</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 px-3 py-2.5 rounded-xl text-sm"
              style={{ background:'rgba(252,129,129,.1)', border:'1px solid rgba(252,129,129,.25)', color:'var(--red)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color:'var(--text-muted)' }} />
              <input type="text" placeholder="Buat username" required
                value={username} onChange={e=>setUsername(e.target.value)} style={IS}
                autoComplete="username" />
            </div>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color:'var(--text-muted)' }} />
              <input type={showPass?'text':'password'} placeholder="Buat password (min. 8 karakter)" required
                value={password} onChange={e=>setPassword(e.target.value)}
                style={{ ...IS, paddingRight:'3rem' }} autoComplete="new-password" />
              <button type="button" onClick={()=>setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color:'var(--text-muted)' }}>
                {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color:'var(--text-muted)' }} />
              <input type={showPass?'text':'password'} placeholder="Konfirmasi password" required
                value={confirm} onChange={e=>setConfirm(e.target.value)} style={IS} autoComplete="new-password" />
            </div>

            <div className="text-xs p-3 rounded-xl" style={{ background:'rgba(99,179,237,0.07)', color:'var(--text-muted)' }}>
              💡 Setelah ini kamu bisa login dengan email Google <strong>atau</strong> username + password
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3.5 flex items-center justify-center gap-2">
              {loading
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                : '✅ Simpan & Lanjutkan'
              }
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
