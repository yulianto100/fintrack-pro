import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import type { StockHolding } from '@/types'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getAdminDatabase()
  const snapshot = await db.ref(`users/${session.user.id}/portfolio/stocks`).get()

  if (!snapshot.exists()) return NextResponse.json({ success: true, data: [] })

  const holdings: StockHolding[] = Object.values(snapshot.val())
  return NextResponse.json({ success: true, data: holdings })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { symbol, lots, avgPrice, buyDate, notes } = body

  if (!symbol || !lots || !avgPrice)
    return NextResponse.json({ error: 'symbol, lots, avgPrice required' }, { status: 400 })

  const db = getAdminDatabase()
  const ref = db.ref(`users/${session.user.id}/portfolio/stocks`)
  const newRef = ref.push()

  const holding: StockHolding = {
    id: newRef.key!,
    userId: session.user.id,
    symbol: symbol.toUpperCase().replace('.JK', ''),
    lots: parseInt(lots),
    avgPrice: parseFloat(avgPrice),
    buyDate: buyDate || new Date().toISOString().split('T')[0],
    notes: notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  await newRef.set(holding)
  return NextResponse.json({ success: true, data: holding }, { status: 201 })
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, ...updates } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = getAdminDatabase()
  await db
    .ref(`users/${session.user.id}/portfolio/stocks/${id}`)
    .update({ ...updates, updatedAt: new Date().toISOString() })

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = getAdminDatabase()
  await db.ref(`users/${session.user.id}/portfolio/stocks/${id}`).remove()
  return NextResponse.json({ success: true })
}
