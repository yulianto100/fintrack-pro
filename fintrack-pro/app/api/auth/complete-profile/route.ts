import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId  = session?.user?.id
    if (!userId || userId === 'undefined') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { username, password } = await request.json()

    // Validate
    if (!username?.trim())
      return NextResponse.json({ success: false, error: 'Username wajib diisi' }, { status: 400 })
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username.trim()))
      return NextResponse.json({ success: false, error: 'Username tidak valid' }, { status: 400 })
    if (!password || password.length < 8)
      return NextResponse.json({ success: false, error: 'Password minimal 8 karakter' }, { status: 400 })

    const db    = getAdminDatabase()
    const uname = username.trim()

    // Check username not taken (skip if it's the same user's current username)
    const existingSnap = await db.ref(`usernameIndex/${uname}`).get()
    if (existingSnap.exists() && existingSnap.val() !== userId) {
      return NextResponse.json({ success: false, error: 'Username sudah digunakan' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const email        = session.user?.email || ''
    const emailKey     = email.toLowerCase().replace(/\./g, '_dot_').replace(/@/g, '_at_')

    // Save auth record
    await db.ref(`users/${userId}/auth`).set({
      uid: userId,
      username: uname,
      email: email.toLowerCase(),
      passwordHash,
      provider: 'google+credentials',
      updatedAt: new Date().toISOString(),
    })

    // Update indexes
    await Promise.all([
      db.ref(`usernameIndex/${uname}`).set(userId),
      db.ref(`emailIndex/${emailKey}`).set(userId),
      db.ref(`users/${userId}/profile`).update({
        name:              uname,
        hasCredentials:    true,
        profileCompleted:  true,
        updatedAt:         new Date().toISOString(),
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[complete-profile]', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
