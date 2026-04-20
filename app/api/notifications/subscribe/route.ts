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

export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const subscription = await request.json()
    if (!subscription?.endpoint) return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    const key = Buffer.from(subscription.endpoint).toString('base64').slice(0, 50)
    await getAdminDatabase().ref(`users/${userId}/pushSubscriptions/${key}`).set({ ...subscription, createdAt: new Date().toISOString() })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { endpoint } = await request.json()
    if (!endpoint) return NextResponse.json({ error: 'endpoint required' }, { status: 400 })
    const key = Buffer.from(endpoint).toString('base64').slice(0, 50)
    await getAdminDatabase().ref(`users/${userId}/pushSubscriptions/${key}`).remove()
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
