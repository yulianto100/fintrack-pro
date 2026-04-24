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

export async function PATCH(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { name } = await request.json()
    const trimmed = name?.trim()
    if (!trimmed) return NextResponse.json({ success: false, error: 'Nama tidak boleh kosong' }, { status: 400 })

    const db = getAdminDatabase()

    // Update both profile.name AND auth.username (for credential users)
    const updates: Promise<void>[] = [
      db.ref(`users/${userId}/profile`).update({
        name: trimmed,
        updatedAt: new Date().toISOString(),
      }),
    ]

    // Check if this is a credentials user (has auth node)
    const authSnap = await db.ref(`users/${userId}/auth`).get()
    if (authSnap.exists()) {
      const auth = authSnap.val() as { username?: string }
      // Only update username if user actually has one (credentials user)
      if (auth.username !== undefined) {
        updates.push(
          db.ref(`users/${userId}/auth`).update({
            username: trimmed,
            updatedAt: new Date().toISOString(),
          })
        )
        // Also update usernameIndex - remove old, add new
        if (auth.username && auth.username !== trimmed) {
          updates.push(db.ref(`usernameIndex/${auth.username}`).remove())
          updates.push(db.ref(`usernameIndex/${trimmed}`).set(userId))
        }
      }
    }

    await Promise.all(updates)

    // Return the updated name so client can refresh session token
    return NextResponse.json({ success: true, data: { name: trimmed } })
  } catch (err) {
    console.error('[PATCH /api/profile/update]', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

// Allow POST as well (some clients prefer it)
export { PATCH as POST }
