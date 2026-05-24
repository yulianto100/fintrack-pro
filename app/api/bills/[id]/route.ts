import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import type { BillRecurring } from '@/types'

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

function normalizedRecurring(value: unknown): BillRecurring | undefined {
  if (value === 'none' || value === 'monthly' || value === 'yearly') return value
  return undefined
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = asRecord(await request.json())
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }

    if (typeof body.name === 'string') updates.name = body.name.trim()
    if (body.amount !== undefined) {
      const amount = Number(body.amount)
      if (Number.isFinite(amount) && amount > 0) updates.amount = amount
    }
    if (typeof body.dueDate === 'string') updates.dueDate = body.dueDate.slice(0, 10)
    if (typeof body.categoryId === 'string') updates.categoryId = body.categoryId
    if (typeof body.categoryName === 'string') updates.categoryName = body.categoryName
    if (typeof body.categoryIcon === 'string') updates.categoryIcon = body.categoryIcon
    if (typeof body.notes === 'string') updates.notes = body.notes
    const recurring = normalizedRecurring(body.recurring)
    if (recurring) updates.recurring = recurring

    const db = getAdminDatabase()
    await db.ref(`users/${userId}/bills/${params.id}`).update(updates)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[PATCH /api/bills/[id]]', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const db = getAdminDatabase()
    await db.ref(`users/${userId}/bills/${params.id}`).remove()
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/bills/[id]]', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
