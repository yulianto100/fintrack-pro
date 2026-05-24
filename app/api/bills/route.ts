import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import type { Bill, BillRecurring } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type BodyRecord = Record<string, unknown>

async function getUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions)
    const id = session?.user?.id
    if (!id || id === 'undefined' || id === 'null') return null
    return id
  } catch {
    return null
  }
}

function asRecord(value: unknown): BodyRecord {
  return typeof value === 'object' && value !== null ? value as BodyRecord : {}
}

function stringField(body: BodyRecord, key: string): string | undefined {
  const value = body[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function recurringField(value: unknown): BillRecurring {
  return value === 'monthly' || value === 'yearly' ? value : 'none'
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const db = getAdminDatabase()
    const snap = await db.ref(`users/${userId}/bills`).get()
    if (!snap.exists()) return NextResponse.json({ success: true, data: [] })

    const list: Bill[] = Object.entries(snap.val() as Record<string, Bill>)
      .map(([key, bill]) => ({ ...bill, id: bill.id || key }))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

    return NextResponse.json({ success: true, data: list })
  } catch (err) {
    console.error('[GET /api/bills]', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = asRecord(await request.json())
    const name = stringField(body, 'name')
    const dueDate = stringField(body, 'dueDate')?.slice(0, 10)
    const amount = Number(body.amount)

    if (!name || !Number.isFinite(amount) || amount <= 0 || !dueDate) {
      return NextResponse.json({ success: false, error: 'Field nama/jumlah/jatuh tempo wajib' }, { status: 400 })
    }

    const db = getAdminDatabase()
    const ref = db.ref(`users/${userId}/bills`).push()
    const now = new Date().toISOString()
    const bill: Bill = {
      id: ref.key!,
      userId,
      name,
      amount,
      dueDate,
      isPaid: false,
      recurring: recurringField(body.recurring),
      createdAt: now,
      updatedAt: now,
    }

    const categoryId = stringField(body, 'categoryId')
    const categoryName = stringField(body, 'categoryName')
    const categoryIcon = stringField(body, 'categoryIcon')
    const notes = stringField(body, 'notes')
    if (categoryId) bill.categoryId = categoryId
    if (categoryName) bill.categoryName = categoryName
    if (categoryIcon) bill.categoryIcon = categoryIcon
    if (notes) bill.notes = notes

    await ref.set(bill)
    return NextResponse.json({ success: true, data: bill }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/bills]', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
