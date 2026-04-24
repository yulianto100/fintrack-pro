import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import { calculateDepositMaturity } from '@/lib/utils'
import type { Deposit } from '@/types'

async function getUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions)
    const id = session?.user?.id
    if (!id || id === 'undefined' || id === 'null') return null
    return id
  } catch { return null }
}

export async function GET(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  try {
    const status = new URL(request.url).searchParams.get('status') || 'active'
    const snap   = await getAdminDatabase().ref(`users/${userId}/portfolio/deposits`).get()
    if (!snap.exists()) return NextResponse.json({ success: true, data: [] })

    let deposits: Deposit[] = Object.values(snap.val())
    if (status !== 'all') deposits = deposits.filter((d) => d.status === status)
    deposits.sort((a, b) => new Date(a.maturityDate).getTime() - new Date(b.maturityDate).getTime())
    return NextResponse.json({ success: true, data: deposits })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    const { bankName, nominal, interestRate, tenorMonths, startDate, notes } = body
    if (!bankName || !nominal || !interestRate || !tenorMonths || !startDate)
      return NextResponse.json({ success: false, error: 'Semua field wajib diisi' }, { status: 400 })

    const { maturityDate, finalValue, totalInterest } = calculateDepositMaturity(
      parseFloat(nominal), parseFloat(interestRate), parseInt(tenorMonths), startDate
    )
    const db     = getAdminDatabase()
    const ref    = db.ref(`users/${userId}/portfolio/deposits`)
    const newRef = ref.push()
    const deposit: Deposit = {
      id: newRef.key!, userId, bankName,
      nominal: parseFloat(nominal), interestRate: parseFloat(interestRate),
      tenorMonths: parseInt(tenorMonths), startDate, maturityDate, finalValue, totalInterest,
      status: 'active', notes: notes || '', notificationSent: {},
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
    await newRef.set(deposit)
    return NextResponse.json({ success: true, data: deposit }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  try {
    const { id, ...updates } = await request.json()
    if (!id) return NextResponse.json({ success: false, error: 'id wajib diisi' }, { status: 400 })
    await getAdminDatabase().ref(`users/${userId}/portfolio/deposits/${id}`).update({ ...updates, updatedAt: new Date().toISOString() })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  try {
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'id wajib diisi' }, { status: 400 })
    await getAdminDatabase().ref(`users/${userId}/portfolio/deposits/${id}`).remove()
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
