import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getAdminDatabase } from '@/lib/firebase-admin'
import { ensureUserSetup } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { username, email, password } = await request.json()

    if (!username || !email || !password)
      return NextResponse.json({ success: false, error: 'Semua field wajib diisi' }, { status: 400 })
    if (password.length < 8)
      return NextResponse.json({ success: false, error: 'Password minimal 8 karakter' }, { status: 400 })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ success: false, error: 'Format email tidak valid' }, { status: 400 })

    const db = getAdminDatabase()
    const norm = email.toLowerCase().trim()

    // Check email taken
    const existSnap = await db.ref('users').orderByChild('profile/email').equalTo(norm).get()
    if (existSnap.exists())
      return NextResponse.json({ success: false, error: 'Email sudah terdaftar' }, { status: 409 })

    // Check username taken
    const unSnap = await db.ref('users').orderByChild('auth/username').equalTo(username.trim()).get()
    if (unSnap.exists())
      return NextResponse.json({ success: false, error: 'Username sudah digunakan' }, { status: 409 })

    const uid          = `cred_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const passwordHash = await bcrypt.hash(password, 12)

    // Save auth record
    await db.ref(`users/${uid}/auth`).set({ uid, username: username.trim(), email: norm, passwordHash })

    // Setup profile & default categories
    await ensureUserSetup(uid, { email: norm, name: username.trim(), image: null })

    return NextResponse.json({ success: true, message: 'Akun berhasil dibuat! Silakan login.' })
  } catch (err) {
    console.error('[register]', err)
    return NextResponse.json({ success: false, error: 'Gagal mendaftar, coba lagi.' }, { status: 500 })
  }
}
