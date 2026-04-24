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

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const db   = getAdminDatabase()
    const ref  = db.ref(`users/${userId}/transactions/${params.id}`)

    const snap = await ref.get()
    if (!snap.exists()) return NextResponse.json({ success: false, error: 'Transaksi tidak ditemukan' }, { status: 404 })

    // If categoryId is being updated, also resolve the latest categoryName & categoryIcon
    const updatePayload: Record<string, unknown> = { ...body, updatedAt: new Date().toISOString() }
    if (body.categoryId && body.categoryId !== 'transfer') {
      try {
        const catSnap = await db.ref(`users/${userId}/categories/${body.categoryId}`).get()
        if (catSnap.exists()) {
          const cat = catSnap.val()
          updatePayload.categoryName = cat.name || ''
          updatePayload.categoryIcon = cat.icon || ''
        }
      } catch { /* keep existing values if lookup fails */ }
    } else if (body.categoryId === 'transfer') {
      updatePayload.categoryName = 'Transfer'
      updatePayload.categoryIcon = '🔄'
    }

    await ref.update(updatePayload)
    const updated = await ref.get()
    return NextResponse.json({ success: true, data: updated.val() })
  } catch (err) {
    console.error('[PATCH /api/transactions/id]', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const db = getAdminDatabase()
    await db.ref(`users/${userId}/transactions/${params.id}`).remove()
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/transactions/id]', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
