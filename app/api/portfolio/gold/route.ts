import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import type { GoldHolding } from '@/types'

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
  
  const db = getAdminDatabase()
  const snapshot = await db.ref(`users/${userId}/portfolio/gold`).get()
  
  if (!snapshot.exists()) return NextResponse.json({ success: true, data: [] })
  
  const holdings: GoldHolding[] = Object.values(snapshot.val())
  return NextResponse.json({ success: true, data: holdings })
}

export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  
  const body = await request.json()
  const { grams, source, buyPrice, buyDate, notes } = body
  
  if (!grams || !source) return NextResponse.json({ error: 'grams and source required' }, { status: 400 })
  
  const db = getAdminDatabase()
  const ref = db.ref(`users/${userId}/portfolio/gold`)
  const newRef = ref.push()
  
  const holding: GoldHolding = {
    id: newRef.key!,
    userId: userId,
    grams: parseFloat(grams),
    source,
    buyPrice: buyPrice ? parseFloat(buyPrice) : undefined,
    buyDate: buyDate || new Date().toISOString().split('T')[0],
    notes: notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  
  await newRef.set(holding)
  return NextResponse.json({ success: true, data: holding }, { status: 201 })
}

export async function DELETE(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  
  const db = getAdminDatabase()
  await db.ref(`users/${userId}/portfolio/gold/${id}`).remove()
  return NextResponse.json({ success: true })
}
