import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import { calcGoldSellProfit } from '@/lib/investment-calculator'
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
  try {
    const snap = await getAdminDatabase().ref(`users/${userId}/portfolio/gold`).get()
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
    const { grams, source, goldType, buyPrice, buyDate, notes } = body

    if (!grams || parseFloat(grams) <= 0)
      return NextResponse.json({ success: false, error: 'Jumlah gram harus lebih dari 0' }, { status: 400 })
    if (!source)
      return NextResponse.json({ success: false, error: 'Provider wajib dipilih' }, { status: 400 })

    const db     = getAdminDatabase()
    const newRef = db.ref(`users/${userId}/portfolio/gold`).push()

    const holding: Record<string, unknown> = {
      id:             newRef.key!,
      userId,
      grams:          parseFloat(grams),
      source,
      goldType:       goldType || 'fisik',
      buyDate:        buyDate  || new Date().toISOString().split('T')[0],
      notes:          notes    || '',
      realizedProfit: 0,
      createdAt:      new Date().toISOString(),
      updatedAt:      new Date().toISOString(),
    }

    const parsedBuyPrice = buyPrice !== undefined && buyPrice !== '' && buyPrice !== null
      ? parseFloat(String(buyPrice))
      : NaN
    if (!isNaN(parsedBuyPrice) && parsedBuyPrice > 0) {
      holding.buyPrice = parsedBuyPrice
    }

    await newRef.set(holding)
    return NextResponse.json({ success: true, data: holding }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/portfolio/gold]', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    const { id, action } = body
    if (!id) return NextResponse.json({ success: false, error: 'id wajib diisi' }, { status: 400 })

    const db      = getAdminDatabase()
    const holdRef = db.ref(`users/${userId}/portfolio/gold/${id}`)

    // ── PARTIAL SELL action ──
    if (action === 'sell') {
      const { sellGrams, sellPrice } = body
      if (!sellGrams || !sellPrice)
        return NextResponse.json({ success: false, error: 'sellGrams dan sellPrice wajib diisi' }, { status: 400 })

      const snap = await holdRef.get()
      if (!snap.exists()) return NextResponse.json({ success: false, error: 'Holding tidak ditemukan' }, { status: 404 })

      const holding: GoldHolding = snap.val()
      const gramsToSell = parseFloat(sellGrams)

      if (gramsToSell > holding.grams)
        return NextResponse.json({ success: false, error: 'Gram melebihi kepemilikan' }, { status: 400 })

      const { realizedProfit } = calcGoldSellProfit(
        gramsToSell,
        parseFloat(sellPrice),
        holding.buyPrice || 0
      )

      const remainingGrams = holding.grams - gramsToSell

      if (remainingGrams <= 0.0001) {
        await holdRef.remove()
        return NextResponse.json({ success: true, deleted: true, realizedProfit })
      }

      const cumulativeProfit = (holding.realizedProfit || 0) + realizedProfit
      await holdRef.update({
        grams:          remainingGrams,
        realizedProfit: cumulativeProfit,
        updatedAt:      new Date().toISOString(),
      })
      return NextResponse.json({ success: true, deleted: false, realizedProfit, remainingGrams })
    }

    // ── Generic update ──
    const { action: _a, id: _id, ...updates } = body
    await holdRef.update({ ...updates, updatedAt: new Date().toISOString() })
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
    await getAdminDatabase().ref(`users/${userId}/portfolio/gold/${id}`).remove()
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
