import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'

async function getUserId() {
  try {
    const s = await getServerSession(authOptions)
    const id = s?.user?.id
    if (!id || id === 'undefined') return null
    return id
  } catch { return null }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    await getAdminDatabase().ref(`users/${userId}/goals/${params.id}`).update({ ...body, updatedAt: new Date().toISOString() })
    return NextResponse.json({ success: true })
  } catch (err) { return NextResponse.json({ success: false, error: String(err) }, { status: 500 }) }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  try {
    await getAdminDatabase().ref(`users/${userId}/goals/${params.id}`).remove()
    return NextResponse.json({ success: true })
  } catch (err) { return NextResponse.json({ success: false, error: String(err) }, { status: 500 }) }
}
