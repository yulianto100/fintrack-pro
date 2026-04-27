import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'

// PATCH — toggle active or update
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const db = getAdminDatabase()
    const ref = db.ref(`users/${session.user.id}/recurringTransactions/${params.id}`)
    const snap = await ref.get()
    if (!snap.exists()) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    await ref.update({ ...body, updatedAt: new Date().toISOString() })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('PATCH recurring error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

// DELETE — remove recurring transaction
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const db = getAdminDatabase()
    await db.ref(`users/${session.user.id}/recurringTransactions/${params.id}`).remove()
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE recurring error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
