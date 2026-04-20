'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { User, Mail, Lock, Eye, EyeOff, ArrowLeft, Camera, Check } from 'lucide-react'
import toast from 'react-hot-toast'

export default function EditProfilePage() {
  const { data: session, update } = useSession()
  const router = useRouter()

  const [name,       setName      ] = useState(session?.user?.name  || '')
  const [currentPass,setCurrentPass] = useState('')
  const [newPass,    setNewPass   ] = useState('')
  const [confirmPass,setConfirmPass] = useState('')
  const [showPass,   setShowPass  ] = useState(false)
  const [savingInfo, setSavingInfo] = useState(false)
  const [savingPass, setSavingPass] = useState(false)

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error('Nama tidak boleh kosong'); return }
    setSavingInfo(true)
    try {
      const res  = await fetch('/api/profile/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      await update({ name: name.trim() })
      toast.success('Profil berhasil diperbarui! ✓')
    } catch (err) {
      toast.error(String(err) || 'Gagal memperbarui profil')
    } finally { setSavingInfo(false) }
  }

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
    } catch (err) {
      toast.error(String(err) || 'Gagal mengubah password')
    } finally { setSavingPass(false) }
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(22,60,35,0.80)',
    border: '1px solid rgba(52,211,110,0.22)',
    borderRadius: 10,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-space)',
    fontSize: '0.9rem',
    padding: '0.75rem 1rem 0.75rem 2.8rem',
    width: '100%',
    outline: 'none',
  }

  const isGoogleUser = session?.user?.image?.includes('googleusercontent')

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>
          Edit Profil
        </h1>
      </div>

      {/* Avatar section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 0 0 3px var(--accent)', boxSizing: 'content-box' }}>
            {session?.user?.image ? (
              <Image src={session.user.image} alt="avatar" width={80} height={80} className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-bold"
                style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                {session?.user?.name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
          </div>
          {isGoogleUser && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px]"
              style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
              G
            </div>
          )}
        </div>
        <div className="text-center">
          <p className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
            {session?.user?.name}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{session?.user?.email}</p>
          {isGoogleUser && (
            <span className="inline-flex items-center gap-1 mt-2 text-xs px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(96,165,250,0.12)', color: '#63b3ed', border: '1px solid rgba(96,165,250,0.2)' }}>
              Login via Google
            </span>
          )}
        </div>
      </motion.div>

      {/* Update display name */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="glass-card p-5">
        <h2 className="font-display font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Informasi Profil
        </h2>
        <form onSubmit={handleUpdateInfo} className="space-y-3">
          <div className="relative">
            <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--text-muted)' }} />
            <input type="text" placeholder="Nama tampilan" value={name}
              onChange={(e) => setName(e.target.value)} style={inputStyle} />
          </div>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--text-muted)' }} />
            <input type="email" value={session?.user?.email || ''} disabled
              style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} />
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Email tidak dapat diubah</p>
          <button type="submit" disabled={savingInfo} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
            {savingInfo
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><Check size={15} /> Simpan Perubahan</>
            }
          </button>
        </form>
      </motion.div>

      {/* Change password — only for credentials users */}
      {!isGoogleUser && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card p-5">
          <h2 className="font-display font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Ubah Password
          </h2>
          <form onSubmit={handleChangePassword} className="space-y-3">
            {[
              { label: 'Password Saat Ini', val: currentPass, set: setCurrentPass },
              { label: 'Password Baru (min. 8 karakter)', val: newPass, set: setNewPass },
              { label: 'Konfirmasi Password Baru', val: confirmPass, set: setConfirmPass },
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
            <button type="submit" disabled={savingPass} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
              {savingPass
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><Lock size={15} /> Ubah Password</>
              }
            </button>
          </form>
        </motion.div>
      )}
    </div>
  )
}
