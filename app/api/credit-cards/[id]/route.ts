import { NextResponse }    from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions }      from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import type { CreditCard }  from '@/types'

async function getUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions)
    const id = session?.user?.id
    if (!id || id === 'undefined') return null
    return id
  } catch { return null }
}

// ── PATCH /api/credit-cards/[id] ─────────────────────────────────────────────
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const userId = await getUserId()
  if (!userId)
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const db  = getAdminDatabase()
    const ref = db.ref(`users/${userId}/creditCards/${params.id}`)

    const snap = await ref.get()
    if (!snap.exists())
      return NextResponse.json({ success: false, error: 'Kartu tidak ditemukan' }, { status: 404 })

    const body = await req.json()
    const updates: Partial<CreditCard> = { ...body, updatedAt: new Date().toISOString() }

    // Strip immutable fields
    delete updates.id
    delete updates.userId
    delete updates.createdAt

    // Coerce numbers
    if (updates.limit       !== undefined) updates.limit       = Number(updates.limit)
    if (updates.used        !== undefined) updates.used        = Number(updates.used)
    if (updates.billingDate !== undefined) updates.billingDate = Number(updates.billingDate)
    if (updates.dueDate     !== undefined) updates.dueDate     = Number(updates.dueDate)

    await ref.update(updates)
    const updated = { ...snap.val(), ...updates, id: params.id }
    return NextResponse.json({ success: true, data: updated })
  } catch (err) {
    console.error('[PATCH /api/credit-cards/[id]]', String(err))
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

// ── DELETE /api/credit-cards/[id] ────────────────────────────────────────────
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const userId = await getUserId()
  if (!userId)
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const db  = getAdminDatabase()
    const ref = db.ref(`users/${userId}/creditCards/${params.id}`)

    const snap = await ref.get()
    if (!snap.exists())
      return NextResponse.json({ success: false, error: 'Kartu tidak ditemukan' }, { status: 404 })

    await ref.remove()
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/credit-cards/[id]]', String(err))
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
