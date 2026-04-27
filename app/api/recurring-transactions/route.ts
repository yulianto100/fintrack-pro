import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import type { RecurringTransaction, RecurringFrequency } from '@/types'

function nextRunDate(frequency: RecurringFrequency, from: Date = new Date()): string {
  const d = new Date(from)
  if (frequency === 'daily') d.setDate(d.getDate() + 1)
  else if (frequency === 'weekly') d.setDate(d.getDate() + 7)
  else d.setMonth(d.getMonth() + 1)
  return d.toISOString().split('T')[0]
}

// GET — list all recurring transactions for the user
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const db = getAdminDatabase()
    const ref = db.ref(`users/${session.user.id}/recurringTransactions`)
    const snap = await ref.get()
    if (!snap.exists()) return NextResponse.json({ success: true, data: [] })

    const data = snap.val() as Record<string, RecurringTransaction>
    const list = Object.entries(data).map(([id, item]) => ({ ...item, id }))
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ success: true, data: list })
  } catch (err) {
    console.error('GET recurring error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

// POST — create a new recurring transaction
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { type, amount, categoryId, categoryName, categoryIcon, wallet, walletAccountId, description, frequency } = body

    if (!type || !amount || !categoryId || !wallet || !description || !frequency) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    const db = getAdminDatabase()
    const ref = db.ref(`users/${session.user.id}/recurringTransactions`).push()

    const now = new Date().toISOString()
    const item: Omit<RecurringTransaction, 'id'> = {
      userId: session.user.id,
      type, amount: Number(amount), categoryId, categoryName, categoryIcon,
      wallet, walletAccountId: walletAccountId || null,
      description, frequency, isActive: true,
      nextRunDate: nextRunDate(frequency as RecurringFrequency),
      createdAt: now, updatedAt: now,
    }

    await ref.set(item)
    return NextResponse.json({ success: true, data: { ...item, id: ref.key } }, { status: 201 })
  } catch (err) {
    console.error('POST recurring error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
