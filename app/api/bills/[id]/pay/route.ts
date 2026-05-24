import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import type { Bill, Transaction, WalletType } from '@/types'

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

function walletField(value: unknown): WalletType {
  return value === 'cash' || value === 'ewallet' ? value : 'bank'
}

function addPeriod(date: string, kind: 'monthly' | 'yearly'): string {
  const [year, month, day] = date.split('-').map(Number)
  const next = new Date(year, (month || 1) - 1, day || 1)
  if (kind === 'monthly') next.setMonth(next.getMonth() + 1)
  else next.setFullYear(next.getFullYear() + 1)
  return next.toISOString().slice(0, 10)
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = asRecord(await request.json().catch(() => ({})))
    const wallet = walletField(body.wallet)
    const walletAccountId = typeof body.walletAccountId === 'string' && body.walletAccountId
      ? body.walletAccountId
      : undefined

    const db = getAdminDatabase()
    const billRef = db.ref(`users/${userId}/bills/${params.id}`)
    const billSnap = await billRef.get()
    if (!billSnap.exists()) return NextResponse.json({ success: false, error: 'Tagihan tidak ditemukan' }, { status: 404 })

    const bill = billSnap.val() as Bill
    if (bill.isPaid) return NextResponse.json({ success: false, error: 'Sudah dibayar' }, { status: 400 })

    const txRef = db.ref(`users/${userId}/transactions`).push()
    const now = new Date().toISOString()
    const today = now.slice(0, 10)
    const tx: Transaction = {
      id: txRef.key!,
      userId,
      type: 'expense',
      amount: bill.amount,
      categoryId: bill.categoryId || '',
      description: bill.name,
      date: today,
      wallet,
      createdAt: now,
      updatedAt: now,
      tags: ['bill', `bill_${params.id}`],
    }
    if (bill.categoryName) tx.categoryName = bill.categoryName
    if (bill.categoryIcon) tx.categoryIcon = bill.categoryIcon
    if (walletAccountId) tx.walletAccountId = walletAccountId

    await txRef.set(tx)
    await billRef.update({
      isPaid: true,
      paidDate: today,
      paidTransactionId: txRef.key,
      updatedAt: now,
    })

    if (bill.recurring === 'monthly' || bill.recurring === 'yearly') {
      const nextRef = db.ref(`users/${userId}/bills`).push()
      const nextBill: Bill = {
        ...bill,
        id: nextRef.key!,
        dueDate: addPeriod(bill.dueDate, bill.recurring),
        isPaid: false,
        createdAt: now,
        updatedAt: now,
      }
      delete nextBill.paidDate
      delete nextBill.paidTransactionId
      await nextRef.set(nextBill)
    }

    return NextResponse.json({ success: true, data: { transaction: tx } })
  } catch (err) {
    console.error('[POST /api/bills/[id]/pay]', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
