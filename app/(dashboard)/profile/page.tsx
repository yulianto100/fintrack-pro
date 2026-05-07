'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { User, Mail, Lock, Eye, EyeOff, ArrowLeft, Check, KeyRound, Camera } from 'lucide-react'
import toast from 'react-hot-toast'

interface ProfileData {
  name: string
  email: string
  image: string
  hasPassword: boolean
  isCredentials: boolean
}

const MAX_AVATAR_SIZE = 5 * 1024 * 1024

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
  const [savingAvatar, setSavingAvatar] = useState(false)
  const [avatarUri,   setAvatarUri  ] = useState<string | null>(null)
  const [avatarFile,  setAvatarFile ] = useState<File | null>(null)
  const avatarInputRef = useRef<HTMLInputElement | null>(null)

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

  const showAvatarPickerError = () => {
    window.alert('Gagal\nTidak dapat memilih foto. Silakan coba lagi.')
  }

  const handlePickAvatar = () => {
    avatarInputRef.current?.click()
  }

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith('image/')) {
      showAvatarPickerError()
      event.currentTarget.value = ''
      return
    }

    if (file.size > MAX_AVATAR_SIZE) {
      showAvatarPickerError()
      event.currentTarget.value = ''
      return
    }

    try {
      const reader = new FileReader()

      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAvatarFile(file)
          setAvatarUri(reader.result)
          return
        }

        showAvatarPickerError()
      }

      reader.onerror = () => {
        showAvatarPickerError()
      }

      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Failed to pick avatar:', error)
      showAvatarPickerError()
    } finally {
      event.currentTarget.value = ''
    }
  }

  const uploadAvatar = async (file: File) => {
    const formData = new FormData()
    formData.append('avatar', file)

    const res = await fetch('/api/profile/avatar', {
      method: 'POST',
      body: formData,
    })
    const json = await res.json()

    if (!json.success || !json.data?.image) {
      throw new Error(json.error || 'Gagal menyimpan foto profil')
    }

    return json.data.image as string
  }

  const handleSaveAvatar = async () => {
    if (!avatarFile) return

    setSavingAvatar(true)
    try {
      const uploadedImage = await uploadAvatar(avatarFile)
      const nextName = name.trim() || profile?.name || session?.user?.name || ''

      await updateSession({ name: nextName, image: uploadedImage })
      await fetch('/api/auth/session', { method: 'GET' })
      setProfile((prev) => prev ? { ...prev, name: nextName || prev.name, image: uploadedImage } : prev)
      setAvatarFile(null)
      setAvatarUri(null)
      toast.success('Foto profil berhasil disimpan')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan foto profil')
    } finally {
      setSavingAvatar(false)
    }
  }

  const handleCancelAvatar = () => {
    setAvatarFile(null)
    setAvatarUri(null)
  }

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error('Nama tidak boleh kosong'); return }
    setSavingInfo(true)
    try {
      const uploadedImage = avatarFile ? await uploadAvatar(avatarFile) : null
      const res  = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      const nextImage = uploadedImage ?? profile?.image ?? session?.user?.image ?? null
      await updateSession({ name: name.trim(), image: nextImage })
      await fetch('/api/auth/session', { method: 'GET' })
      setProfile((prev) => prev ? { ...prev, name: name.trim(), image: nextImage || '' } : prev)
      if (uploadedImage) {
        setAvatarFile(null)
        setAvatarUri(null)
      }
      toast.success(uploadedImage ? 'Profil dan foto berhasil diperbarui' : 'Username berhasil diperbarui')
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
      toast.success('Password berhasil diubah')
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
      toast.success('Password berhasil diset. Sekarang kamu bisa login dengan email & password.')
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
    <div className="px-4 pt-6 pb-28 max-w-lg mx-auto space-y-5">
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
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={handlePickAvatar}
            aria-label="Ganti foto profil"
            className="group relative w-24 h-24 rounded-3xl outline-none transition-transform duration-200 hover:scale-[1.02] active:scale-95 focus-visible:ring-2 focus-visible:ring-emerald-400/80"
            style={{
              background: 'var(--accent-dim)',
              boxShadow: '0 0 0 3px var(--accent), 0 18px 40px rgba(0,0,0,0.22)',
            }}
          >
            <span className="absolute inset-0 overflow-hidden rounded-3xl">
              {avatarUri ? (
                <Image
                  src={avatarUri}
                  alt="Foto profil"
                  width={96}
                  height={96}
                  unoptimized
                  className="w-full h-full object-cover"
                />
              ) : profileImage ? (
                <Image
                  src={profileImage}
                  alt="Avatar profil"
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-4xl font-bold"
                  style={{ color: 'var(--accent)' }}>
                  {displayName?.[0]?.toUpperCase() || '?'}
                </span>
              )}
            </span>

            <span
              className="absolute -right-2 -bottom-2 w-9 h-9 rounded-full flex items-center justify-center border-[3px] transition-transform duration-200 group-hover:scale-105"
              style={{
                background: 'var(--accent)',
                borderColor: 'var(--surface)',
                color: '#02130a',
              }}
            >
              <Camera size={16} strokeWidth={2.4} />
            </span>
          </button>

          <button
            type="button"
            onClick={handlePickAvatar}
            disabled={savingAvatar}
            className="mt-3 text-xs font-semibold tracking-wide transition-colors hover:opacity-80"
            style={{ color: 'var(--accent)' }}
          >
            Ganti Foto
          </button>
          {avatarFile && (
            <div className="mt-3 flex w-full flex-col items-center gap-2">
              <p className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
                Foto siap disimpan.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveAvatar}
                  disabled={savingAvatar}
                  className="min-w-[132px] rounded-2xl px-4 py-2 text-sm font-bold transition-transform duration-150 active:scale-95 disabled:opacity-70"
                  style={{
                    background: 'var(--accent)',
                    color: '#02130a',
                    boxShadow: '0 14px 32px rgba(34,197,94,0.22)',
                  }}
                >
                  {savingAvatar ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-black/20 border-t-black animate-spin" />
                      Simpan
                    </span>
                  ) : 'Simpan Foto'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelAvatar}
                  disabled={savingAvatar}
                  className="rounded-2xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarFileChange}
          />
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
          <button type="submit" disabled={savingInfo || savingAvatar || !profile}
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
