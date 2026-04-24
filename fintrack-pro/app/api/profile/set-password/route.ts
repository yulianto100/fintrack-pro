import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import bcrypt from 'bcryptjs'

async function getUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions)
    const id = session?.user?.id
    if (!id || id === 'undefined' || id === 'null') return null
    return id
  } catch { return null }
}

/**
 * POST /api/profile/set-password
 * Allows any user (including Google-only users) to SET a NEW password.
 * - If user already has a password → returns error (use change-password instead)
 * - If user has no password → creates one and sets auth.hasPassword = true
 */
export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { newPassword, confirmPassword } = await request.json()

    if (!newPassword || !confirmPassword)
      return NextResponse.json({ success: false, error: 'Semua field wajib diisi' }, { status: 400 })
    if (newPassword.length < 8)
      return NextResponse.json({ success: false, error: 'Password minimal 8 karakter' }, { status: 400 })
    if (newPassword !== confirmPassword)
      return NextResponse.json({ success: false, error: 'Konfirmasi password tidak cocok' }, { status: 400 })

    const db       = getAdminDatabase()
    const authSnap = await db.ref(`users/${userId}/auth`).get()
    const auth     = authSnap.exists() ? authSnap.val() : {}

    // If auth node already has a password hash, user should use change-password
    if (auth.passwordHash)
      return NextResponse.json({ success: false, error: 'Akun sudah memiliki password. Gunakan Ubah Password.' }, { status: 400 })

    // Get email from profile if not in auth
    const profileSnap = await db.ref(`users/${userId}/profile`).get()
    const profile     = profileSnap.exists() ? profileSnap.val() : {}
    const email       = auth.email || profile.email || ''

    const passwordHash = await bcrypt.hash(newPassword, 12)

    // Update (or create) auth node with password
    await db.ref(`users/${userId}/auth`).update({
      passwordHash,
      email: email,
      updatedAt: new Date().toISOString(),
    })

    // If email exists, also register email index so user can login with email+password
    if (email) {
      const emailKey = email.toLowerCase().replace(/\./g, '_dot_').replace(/@/g, '_at_')
      const emailIdx = await db.ref(`emailIndex/${emailKey}`).get()
      if (!emailIdx.exists()) {
        await db.ref(`emailIndex/${emailKey}`).set(userId)
      }
    }

    return NextResponse.json({ success: true, message: 'Password berhasil di-set! Sekarang kamu bisa login dengan email & password.' })
  } catch (err) {
    console.error('[POST /api/profile/set-password]', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
