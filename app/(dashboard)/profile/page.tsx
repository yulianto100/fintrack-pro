'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { User, Mail, Lock, Eye, EyeOff, ArrowLeft, Check, KeyRound } from 'lucide-react'
import toast from 'react-hot-toast'

interface ProfileData {
  name: string
  email: string
  image: string
  hasPassword: boolean
  isCredentials: boolean
}

export default function EditProfilePage() {
  const { data: session, update: updateSession } = useSession()
  const router = useRouter()

  const [profile,     setProfile    ] = useState<ProfileData | null>(null)
  const [name,        setName       ] = useState('')
  const [currentPass, setCurrentPass] = useState('')
  const [newPass,     setNewPass    ] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showPass,    setShowPass   ] = useState(false)
  const [savingInfo,  setSavingInfo ] = useState(false)
  const [savingPass,  setSavingPass ] = useState(false)

  // Fetch latest profile including hasPassword flag
  useEffect(() => {
    if (!session?.user?.id) return
    fetch('/api/profile/me')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setProfile(json.data)
          setName(json.data.name || session.user?.name || '')
        } else {
          setName(session?.user?.name || '')
        }
      })
      .catch(() => setName(session?.user?.name || ''))
  }, [session?.user?.id, session?.user?.name])

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error('Nama tidak boleh kosong'); return }
    setSavingInfo(true)
    try {
      const res  = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      await updateSession({ name: name.trim() })
      await fetch('/api/auth/session', { method: 'GET' })
      toast.success('Username berhasil diperbarui! ✓')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal memperbarui profil')
    } finally { setSavingInfo(false) }
  }

  // Change password: for users who ALREADY have a password (both credential & Google who set it)
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPass || !newPass || !confirmPass) { toast.error('Isi semua field password'); return }
    if (newPass.length < 8) { toast.error('Password baru minimal 8 karakter'); return }
    if (newPass !== confirmPass) { toast.error('Konfirmasi password tidak cocok'); return }
    setSavingPass(true)
    try {
      const res  = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Password berhasil diubah! ✓')
      setCurrentPass(''); setNewPass(''); setConfirmPass('')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengubah password')
    } finally { setSavingPass(false) }
  }

  // Set password: for Google users who have NO password yet
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPass || !confirmPass) { toast.error('Isi semua field password'); return }
    if (newPass.length < 8) { toast.error('Password minimal 8 karakter'); return }
    if (newPass !== confirmPass) { toast.error('Konfirmasi password tidak cocok'); return }
    setSavingPass(true)
    try {
      const res  = await fetch('/api/profile/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPass, confirmPassword: confirmPass }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Password berhasil di-set! ✓ Sekarang kamu bisa login dengan email & password.')
      setNewPass(''); setConfirmPass('')
      // Refresh profile data
      const updated = await fetch('/api/profile/me').then((r) => r.json())
      if (updated.success) setProfile(updated.data)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal set password')
    } finally { setSavingPass(false) }
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(22,60,35,0.80)',
    border: '1px solid rgba(34,197,94,0.18)',
    borderRadius: 10,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-space)',
    fontSize: '0.9rem',
    padding: '0.75rem 1rem 0.75rem 2.8rem',
    width: '100%',
    outline: 'none',
  }

  // KEY FIX: Use hasPassword from DB, NOT session.user.provider
  const hasPassword  = profile?.hasPassword ?? false
  const profileImage = profile?.image || session?.user?.image || null
  const displayName  = name || profile?.name || session?.user?.name || ''

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--surface-close)', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>
          Edit Profil
        </h1>
      </div>

      {/* Avatar */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 flex flex-col items-center gap-3">
        <div className="w-20 h-20 rounded-2xl overflow-hidden"
          style={{ boxShadow: '0 0 0 3px var(--accent)' }}>
          {profileImage ? (
            <Image src={profileImage} alt="avatar" width={80} height={80} className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl font-bold"
              style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
              {displayName?.[0]?.toUpperCase() || '?'}
            </div>
          )}
        </div>
        <div className="text-center">
          <p className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
            {displayName}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{profile?.email || session?.user?.email}</p>
          <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
            {session?.user?.image?.includes('googleusercontent') && (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(99,179,237,0.12)', color: '#63b3ed', border: '1px solid rgba(99,179,237,0.2)' }}>
                Google Account
              </span>
            )}
            {hasPassword && (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(34,197,94,0.10)', color: 'var(--accent)', border: '1px solid rgba(34,197,94,0.16)' }}>
                <KeyRound size={10} /> Password Set
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Update Username — ALWAYS shown */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="glass-card p-5">
        <h2 className="font-display font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Username
        </h2>
        <form onSubmit={handleUpdateInfo} className="space-y-3">
          <div className="relative">
            <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--text-muted)' }} />
            {profile ? (
              <input type="text"
                placeholder="Username"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle} />
            ) : (
              <div className="skeleton h-11 rounded-xl" />
            )}
          </div>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--text-muted)' }} />
            <input type="email" value={profile?.email || session?.user?.email || ''} disabled
              style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} />
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Email tidak dapat diubah</p>
          <button type="submit" disabled={savingInfo || !profile}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2">
            {savingInfo
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><Check size={15} /> Simpan</>
            }
          </button>
        </form>
      </motion.div>

      {/* Password section — logic based on hasPassword, NOT provider */}
      {profile && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card p-5">
          <h2 className="font-display font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            {hasPassword ? 'Ubah Password' : 'Set Password'}
          </h2>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            {hasPassword
              ? 'Ubah password akun kamu'
              : 'Tambahkan password agar bisa login dengan email & password'}
          </p>

          {/* CHANGE PASSWORD: user already has one */}
          {hasPassword && (
            <form onSubmit={handleChangePassword} className="space-y-3">
              {[
                { label: 'Password Saat Ini',              val: currentPass, set: setCurrentPass },
                { label: 'Password Baru (min. 8 karakter)', val: newPass,     set: setNewPass     },
                { label: 'Konfirmasi Password Baru',        val: confirmPass, set: setConfirmPass  },
              ].map(({ label, val, set }) => (
                <div key={label} className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--text-muted)' }} />
                  <input type={showPass ? 'text' : 'password'} placeholder={label} value={val}
                    onChange={(e) => set(e.target.value)}
                    style={{ ...inputStyle, paddingRight: '3rem' }} />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-muted)' }}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              ))}
              <button type="submit" disabled={savingPass}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                {savingPass
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><Lock size={15} /> Ubah Password</>
                }
              </button>
            </form>
          )}

          {/* SET PASSWORD: Google-only user, no password yet */}
          {!hasPassword && (
            <form onSubmit={handleSetPassword} className="space-y-3">
              {[
                { label: 'Password Baru (min. 8 karakter)', val: newPass,     set: setNewPass    },
                { label: 'Konfirmasi Password',              val: confirmPass, set: setConfirmPass },
              ].map(({ label, val, set }) => (
                <div key={label} className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--text-muted)' }} />
                  <input type={showPass ? 'text' : 'password'} placeholder={label} value={val}
                    onChange={(e) => set(e.target.value)}
                    style={{ ...inputStyle, paddingRight: '3rem' }} />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-muted)' }}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              ))}
              <button type="submit" disabled={savingPass}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                {savingPass
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><KeyRound size={15} /> Set Password</>
                }
              </button>
            </form>
          )}
        </motion.div>
      )}
    </div>
  )
}
