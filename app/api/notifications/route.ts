import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import type { Notification } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions)
    const id = session?.user?.id
    if (!id || id === 'undefined' || id === 'null') return null
    return id
  } catch {
    return null
  }
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const db = getAdminDatabase()
    const snap = await db.ref(`users/${userId}/notifications`).get()
    if (!snap.exists()) return NextResponse.json({ success: true, data: [] })

    const list: Notification[] = Object.entries(snap.val() as Record<string, Notification>)
      .map(([key, notification]) => ({ ...notification, id: notification.id || key }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50)

    return NextResponse.json({ success: true, data: list })
  } catch (err) {
    console.error('[GET /api/notifications]', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json() as unknown
    const db = getAdminDatabase()
    const ref = db.ref(`users/${userId}/notifications`)
    const updates: Record<string, boolean> = {}

    if (typeof body === 'object' && body !== null && 'all' in body && body.all === true) {
      const snap = await ref.get()
      if (snap.exists()) {
        for (const key of Object.keys(snap.val() as Record<string, Notification>)) {
          updates[`${key}/read`] = true
        }
      }
    } else if (typeof body === 'object' && body !== null && 'ids' in body && Array.isArray(body.ids)) {
      for (const id of body.ids) {
        if (typeof id === 'string') updates[`${id}/read`] = true
      }
    }

    if (Object.keys(updates).length > 0) await ref.update(updates)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[PATCH /api/notifications]', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
