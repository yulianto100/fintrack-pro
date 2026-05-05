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
    const catId = params.id

    // Update the category itself
    await db.ref(`users/${userId}/categories/${catId}`).update({ ...body, updatedAt: new Date().toISOString() })

    // If name or icon changed, cascade-update all transactions using this category
    const nameChanged = 'name' in body
    const iconChanged = 'icon' in body
    if (nameChanged || iconChanged) {
      const txSnap = await db.ref(`users/${userId}/transactions`).get()
      if (txSnap.exists()) {
        const updates: Record<string, unknown> = {}
        txSnap.forEach((child) => {
          if (child.val()?.categoryId === catId) {
            if (nameChanged) updates[`users/${userId}/transactions/${child.key}/categoryName`] = body.name
            if (iconChanged) updates[`users/${userId}/transactions/${child.key}/categoryIcon`] = body.icon
            updates[`users/${userId}/transactions/${child.key}/updatedAt`] = new Date().toISOString()
          }
        })
        if (Object.keys(updates).length > 0) await db.ref().update(updates)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  try {
    const db = getAdminDatabase()
    await db.ref(`users/${userId}/categories/${params.id}`).remove()
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
