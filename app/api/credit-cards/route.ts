import { NextResponse }     from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions }       from '@/lib/auth'
import { getAdminDatabase }  from '@/lib/firebase-admin'
import type { CreditCard }   from '@/types'

async function getUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions)
    const id = session?.user?.id
    if (!id || id === 'undefined') return null
    return id
  } catch { return null }
}

// ── GET /api/credit-cards ─────────────────────────────────────────────────────
export async function GET() {
  const userId = await getUserId()
  if (!userId)
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const db   = getAdminDatabase()
    const snap = await db.ref(`users/${userId}/creditCards`).get()
    if (!snap.exists()) return NextResponse.json({ success: true, data: [] })

    const cards: CreditCard[] = Object.entries(
      snap.val() as Record<string, CreditCard>
    ).map(([key, card]) => ({ ...card, id: card.id || key }))

    cards.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ success: true, data: cards })
  } catch (err) {
    console.error('[GET /api/credit-cards]', String(err))
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

// ── POST /api/credit-cards ────────────────────────────────────────────────────
export async function POST(req: Request) {
  const userId = await getUserId()
  if (!userId)
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { name, bankName, last4, limit, billingDate, dueDate, color } = body

    if (!name)                       return NextResponse.json({ success: false, error: 'Nama kartu wajib diisi' }, { status: 400 })
    if (!limit || Number(limit) <= 0) return NextResponse.json({ success: false, error: 'Limit tidak valid' }, { status: 400 })
    if (!billingDate || !dueDate)    return NextResponse.json({ success: false, error: 'Tanggal tagihan & jatuh tempo wajib diisi' }, { status: 400 })

    const db     = getAdminDatabase()
    const newRef = db.ref(`users/${userId}/creditCards`).push()
    const now    = new Date().toISOString()

    const card: CreditCard = {
      id:          newRef.key!,
      userId,
      name,
      bankName:    bankName || '',
      last4:       last4    || '',
      limit:       Number(limit),
      used:        0,
      billingDate: Number(billingDate),
      dueDate:     Number(dueDate),
      color:       color || '#22c55e',
      createdAt:   now,
      updatedAt:   now,
    }

    await newRef.set(card)
    return NextResponse.json({ success: true, data: card }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/credit-cards]', String(err))
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
