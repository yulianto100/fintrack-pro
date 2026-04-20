import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'

async function getUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions)
    const id = session?.user?.id
    if (!id || id === 'undefined' || id === 'null') return null
    return id
  } catch { return null }
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const db = getAdminDatabase()
    const [profileSnap, authSnap] = await Promise.all([
      db.ref(`users/${userId}/profile`).get(),
      db.ref(`users/${userId}/auth`).get(),
    ])

    const profile = profileSnap.exists() ? profileSnap.val() : {}
    const auth    = authSnap.exists()    ? authSnap.val()    : {}

    // For credentials users, username is the canonical display name
    const name = auth.username || profile.name || ''

    return NextResponse.json({
      success: true,
      data: {
        id:       userId,
        name,
        email:    profile.email || auth.email || '',
        image:    profile.image || '',
        isCredentials: !!auth.username,
      },
    })
  } catch (err) {
    console.error('[GET /api/profile/me]', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
