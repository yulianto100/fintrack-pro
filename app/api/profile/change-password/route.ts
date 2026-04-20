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

export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword)
      return NextResponse.json({ success: false, error: 'Semua field wajib diisi' }, { status: 400 })
    if (newPassword.length < 8)
      return NextResponse.json({ success: false, error: 'Password baru minimal 8 karakter' }, { status: 400 })

    const db       = getAdminDatabase()
    const authSnap = await db.ref(`users/${userId}/auth`).get()

    if (!authSnap.exists())
      return NextResponse.json({ success: false, error: 'Data akun tidak ditemukan. Akun Google tidak bisa ubah password.' }, { status: 400 })

    const auth = authSnap.val() as { passwordHash?: string }
    if (!auth.passwordHash)
      return NextResponse.json({ success: false, error: 'Akun ini login via Google, tidak memiliki password.' }, { status: 400 })

    const valid = await bcrypt.compare(currentPassword, auth.passwordHash)
    if (!valid)
      return NextResponse.json({ success: false, error: 'Password saat ini salah' }, { status: 400 })

    const newHash = await bcrypt.hash(newPassword, 12)
    await db.ref(`users/${userId}/auth`).update({ passwordHash: newHash, updatedAt: new Date().toISOString() })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[POST /api/profile/change-password]', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
