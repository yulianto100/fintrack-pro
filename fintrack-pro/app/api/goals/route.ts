import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import type { Goal } from '@/types'

async function getUserId() {
  try {
    const s = await getServerSession(authOptions)
    const id = s?.user?.id
    if (!id || id === 'undefined') return null
    return id
  } catch { return null }
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  try {
    const snap = await getAdminDatabase().ref(`users/${userId}/goals`).get()
    if (!snap.exists()) return NextResponse.json({ success: true, data: [] })
    return NextResponse.json({ success: true, data: Object.values(snap.val()) })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  try {
    const { title, targetAmount, icon, color } = await request.json()
    if (!title || !targetAmount) return NextResponse.json({ success: false, error: 'title & targetAmount required' }, { status: 400 })
    const db = getAdminDatabase()
    const ref = db.ref(`users/${userId}/goals`).push()
    const goal: Goal = {
      id: ref.key!, userId, title,
      targetAmount: Number(targetAmount),
      currentAmount: 0,
      icon: icon || '🎯', color: color || '#34d36e',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
    await ref.set(goal)
    return NextResponse.json({ success: true, data: goal }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
