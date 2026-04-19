import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'

// PATCH /api/transactions/[id]
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const body = await request.json()
    const db = getAdminDatabase()
    const ref = db.ref(`users/${session.user.id}/transactions/${params.id}`)
    
    const snapshot = await ref.get()
    if (!snapshot.exists()) {
      return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 })
    }
    
    await ref.update({ ...body, updatedAt: new Date().toISOString() })
    const updated = await ref.get()
    
    return NextResponse.json({ success: true, data: updated.val() })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update transaction' }, { status: 500 })
  }
}

// DELETE /api/transactions/[id]
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const db = getAdminDatabase()
    await db.ref(`users/${session.user.id}/transactions/${params.id}`).remove()
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete transaction' }, { status: 500 })
  }
}
