import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import type { StockHolding } from '@/types'

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
    const snap = await getAdminDatabase().ref(`users/${userId}/portfolio/stocks`).get()
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
    const { symbol, lots, avgPrice, buyDate, notes } = body
    if (!symbol || !lots || !avgPrice) return NextResponse.json({ success: false, error: 'symbol, lots, avgPrice wajib diisi' }, { status: 400 })

    const db     = getAdminDatabase()
    const ref    = db.ref(`users/${userId}/portfolio/stocks`)
    const newRef = ref.push()
    const holding: StockHolding = {
      id: newRef.key!, userId,
      symbol: symbol.toUpperCase().replace('.JK', ''),
      lots: parseInt(lots), avgPrice: parseFloat(avgPrice),
      buyDate: buyDate || new Date().toISOString().split('T')[0],
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
    await getAdminDatabase().ref(`users/${userId}/portfolio/stocks/${id}`).update({ ...updates, updatedAt: new Date().toISOString() })
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
    await getAdminDatabase().ref(`users/${userId}/portfolio/stocks/${id}`).remove()
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
