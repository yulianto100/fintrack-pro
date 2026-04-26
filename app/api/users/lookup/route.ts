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

/**
 * GET /api/users/lookup?username=xxx
 * Lookup user by username, return their public profile + wallet accounts.
 * Used for cross-user transfer feature.
 */
export async function GET(request: Request) {
  const selfId = await getUserId()
  if (!selfId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const username = new URL(request.url).searchParams.get('username')?.trim()
  if (!username || username.length < 2)
    return NextResponse.json({ success: false, error: 'Username minimal 2 karakter' }, { status: 400 })

  try {
    const db = getAdminDatabase()

    // Look up userId from flat usernameIndex (same index used at register)
    const idxSnap = await db.ref(`usernameIndex/${username}`).get()
    if (!idxSnap.exists())
      return NextResponse.json({ success: false, error: `Username "@${username}" tidak ditemukan` }, { status: 404 })

    const targetUserId = idxSnap.val() as string

    // Can't transfer to yourself
    if (targetUserId === selfId)
      return NextResponse.json({ success: false, error: 'Tidak bisa transfer ke akun sendiri' }, { status: 400 })

    // Fetch their public profile (name) and wallet accounts
    const [profileSnap, authSnap, accountsSnap] = await Promise.all([
      db.ref(`users/${targetUserId}/profile`).get(),
      db.ref(`users/${targetUserId}/auth`).get(),
      db.ref(`users/${targetUserId}/walletAccounts`).get(),
    ])

    const auth    = authSnap.exists()    ? authSnap.val()    : {}
    const profile = profileSnap.exists() ? profileSnap.val() : {}
    const displayName = auth.username || profile.name || username

    // Return wallet accounts (id, name, type only — no balance exposed)
    const walletAccounts: { id: string; name: string; type: string }[] = []
    if (accountsSnap.exists()) {
      const raw = accountsSnap.val() as Record<string, { id: string; name: string; type: string }>
      Object.values(raw).forEach((acc) => {
        walletAccounts.push({ id: acc.id, name: acc.name, type: acc.type })
      })
      walletAccounts.sort((a, b) => a.name.localeCompare(b.name))
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: targetUserId,
        username,
        displayName,
        walletAccounts,
      },
    })
  } catch (err) {
    console.error('[GET /api/users/lookup]', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
