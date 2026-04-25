import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import { calcSBN } from '@/lib/investment-calculator'
import { addMonths } from 'date-fns'
import type { SBNHolding } from '@/types'

async function getUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions)
    const id = session?.user?.id
    if (!id || id === 'undefined' || id === 'null') return null
    return id
  } catch { return null }
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  try {
    const snap = await getAdminDatabase().ref(`users/${userId}/portfolio/sbn`).get()
    if (!snap.exists()) return NextResponse.json({ success: true, data: [] })
    return NextResponse.json({ success: true, data: Object.values(snap.val()) })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    const { seri, type, nominal, annualRate, taxRate, tenorMonths, startDate, notes } = body
    if (!seri || !nominal || !annualRate || !tenorMonths || !startDate)
      return NextResponse.json({ success: false, error: 'Semua field wajib diisi' }, { status: 400 })

    const parsedNominal     = parseFloat(nominal)
    const parsedRate        = parseFloat(annualRate)
    const parsedTaxRate     = parseFloat(taxRate || '10')
    const parsedTenor       = parseInt(tenorMonths)
    const maturityDate      = addMonths(new Date(startDate), parsedTenor).toISOString().split('T')[0]
    const { grossReturn, taxAmount, netReturn, totalFinal } = calcSBN(parsedNominal, parsedRate, parsedTenor, parsedTaxRate)

    const db     = getAdminDatabase()
    const newRef = db.ref(`users/${userId}/portfolio/sbn`).push()
    const holding: SBNHolding = {
      id: newRef.key!, userId,
      seri: seri.toUpperCase(),
      type: type || 'ORI',
      nominal: parsedNominal,
      annualRate: parsedRate,
      taxRate: parsedTaxRate,
      tenorMonths: parsedTenor,
      startDate, maturityDate,
      grossReturn, taxAmount, netReturn, totalFinal,
      status: 'active',
      notes: notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await newRef.set(holding)
    return NextResponse.json({ success: true, data: holding }, { status: 201 })
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
    await getAdminDatabase().ref(`users/${userId}/portfolio/sbn/${id}`).update({ ...updates, updatedAt: new Date().toISOString() })
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
    await getAdminDatabase().ref(`users/${userId}/portfolio/sbn/${id}`).remove()
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
