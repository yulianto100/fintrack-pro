import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getAdminDatabase } from '@/lib/firebase-admin'
import { ensureUserSetup } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { username, email, password } = await request.json()

    // ── Validate ──
    if (!username?.trim())
      return NextResponse.json({ success: false, error: 'Username wajib diisi' }, { status: 400 })
    if (!email?.trim())
      return NextResponse.json({ success: false, error: 'Email wajib diisi' }, { status: 400 })
    if (!password)
      return NextResponse.json({ success: false, error: 'Password wajib diisi' }, { status: 400 })
    if (password.length < 8)
      return NextResponse.json({ success: false, error: 'Password minimal 8 karakter' }, { status: 400 })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ success: false, error: 'Format email tidak valid' }, { status: 400 })
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username.trim()))
      return NextResponse.json({ success: false, error: 'Username hanya huruf, angka, _ (3-20 karakter)' }, { status: 400 })

    const db    = getAdminDatabase()
    const norm  = email.toLowerCase().trim()
    const uname = username.trim()

    // ── Cek duplikat menggunakan flat index (tidak butuh Firebase index rules) ──
    // Email index: emailIndex/{encoded_email} = uid
    // Username index: usernameIndex/{username} = uid
    const emailKey = norm.replace(/\./g, '_dot_').replace(/@/g, '_at_')

    const [emailIdx, usernameIdx] = await Promise.all([
      db.ref(`emailIndex/${emailKey}`).get(),
      db.ref(`usernameIndex/${uname}`).get(),
    ])

    if (emailIdx.exists())
      return NextResponse.json({ success: false, error: 'Email sudah terdaftar' }, { status: 409 })
    if (usernameIdx.exists())
      return NextResponse.json({ success: false, error: 'Username sudah digunakan' }, { status: 409 })

    // ── Buat user ──
    const uid          = `u_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const passwordHash = await bcrypt.hash(password, 12)

    // Simpan data user + update flat index atomically
    await Promise.all([
      db.ref(`users/${uid}/auth`).set({
        uid, username: uname, email: norm, passwordHash,
        createdAt: new Date().toISOString(),
      }),
      db.ref(`emailIndex/${emailKey}`).set(uid),
      db.ref(`usernameIndex/${uname}`).set(uid),
    ])

    await ensureUserSetup(uid, { email: norm, name: uname, image: null })

    return NextResponse.json({
      success: true,
      message: 'Akun berhasil dibuat! Silakan login menggunakan email atau username.',
    })
  } catch (err) {
    console.error('[POST /api/auth/register]', err)
    return NextResponse.json({ success: false, error: `Server error: ${String(err)}` }, { status: 500 })
  }
}
