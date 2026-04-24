import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import type { NetWorthSnapshot } from '@/types'

async function getUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions)
    const id = session?.user?.id
    if (!id || id === 'undefined' || id === 'null') return null
    return id
  } catch { return null }
}

// GET /api/net-worth-history?limit=30
export async function GET(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const limit = parseInt(new URL(request.url).searchParams.get('limit') || '30')

  try {
    const db   = getAdminDatabase()
    const snap = await db.ref(`users/${userId}/netWorthHistory`).get()

    if (!snap.exists()) return NextResponse.json({ success: true, data: [] })

    const snaps: NetWorthSnapshot[] = Object.values(snap.val())
    snaps.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    return NextResponse.json({ success: true, data: snaps.slice(-limit) })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

// POST /api/net-worth-history — save a snapshot
export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { value } = await request.json()
    if (typeof value !== 'number') return NextResponse.json({ success: false, error: 'value required' }, { status: 400 })

    const db     = getAdminDatabase()
    const ref    = db.ref(`users/${userId}/netWorthHistory`)
    const newRef = ref.push()
    const now    = new Date().toISOString()

    // Deduplicate: skip if we already saved a snapshot within the last hour
    const recentSnap = await ref.orderByChild('createdAt').limitToLast(1).get()
    if (recentSnap.exists()) {
      const last: NetWorthSnapshot = Object.values(recentSnap.val())[0] as NetWorthSnapshot
      const diffMs = Date.now() - new Date(last.createdAt).getTime()
      if (diffMs < 3600_000) {
        // Just update the latest value
        await db.ref(`users/${userId}/netWorthHistory/${last.id}`).update({ value, createdAt: now })
        return NextResponse.json({ success: true, data: { ...last, value, createdAt: now } })
      }
    }

    const snapshot: NetWorthSnapshot = { id: newRef.key!, userId, value, createdAt: now }
    await newRef.set(snapshot)
    return NextResponse.json({ success: true, data: snapshot }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
