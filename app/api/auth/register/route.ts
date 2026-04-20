import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getAdminDatabase } from '@/lib/firebase-admin'
import { ensureUserSetup } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { username, email, password } = await request.json()

    // ── Validate ──
    if (!username?.trim()) return NextResponse.json({ success: false, error: 'Username wajib diisi' }, { status: 400 })
    if (!email?.trim())    return NextResponse.json({ success: false, error: 'Email wajib diisi' },    { status: 400 })
    if (!password)         return NextResponse.json({ success: false, error: 'Password wajib diisi' }, { status: 400 })
    if (password.length < 8) return NextResponse.json({ success: false, error: 'Password minimal 8 karakter' }, { status: 400 })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ success: false, error: 'Format email tidak valid' }, { status: 400 })
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username.trim()))
      return NextResponse.json({ success: false, error: 'Username hanya boleh huruf, angka, underscore (3-20 karakter)' }, { status: 400 })

    const db   = getAdminDatabase()
    const norm = email.toLowerCase().trim()
    const uname = username.trim()

    // ── Check duplicates ──
    const [emailSnap, unameSnap] = await Promise.all([
      db.ref('users').orderByChild('profile/email').equalTo(norm).get(),
      db.ref('users').orderByChild('auth/username').equalTo(uname).get(),
    ])

    if (emailSnap.exists())  return NextResponse.json({ success: false, error: 'Email sudah terdaftar' },         { status: 409 })
    if (unameSnap.exists())  return NextResponse.json({ success: false, error: 'Username sudah digunakan' },      { status: 409 })

    // ── Create user ──
    const uid          = `u_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const passwordHash = await bcrypt.hash(password, 12)

    await db.ref(`users/${uid}/auth`).set({
      uid,
      username: uname,
      email:    norm,
      passwordHash,
      createdAt: new Date().toISOString(),
    })

    await ensureUserSetup(uid, { email: norm, name: uname, image: null })

    return NextResponse.json({
      success: true,
      message: `Akun berhasil dibuat! Silakan login menggunakan email atau username.`,
    })
  } catch (err) {
    console.error('[POST /api/auth/register]', err)
    return NextResponse.json({ success: false, error: 'Gagal mendaftar, coba lagi.' }, { status: 500 })
  }
}
