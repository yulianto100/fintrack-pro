import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import type { Transaction } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const db = getAdminDatabase()
    const snap = await db.ref(`users/${userId}/transactions`).get()
    if (!snap.exists()) return NextResponse.json({ success: true, data: [] })

    const tagCount = new Map<string, number>()
    const txs = Object.values(snap.val() as Record<string, Transaction>)

    for (const tx of txs) {
      if (!Array.isArray(tx.tags)) continue

      for (const tag of tx.tags) {
        const clean = String(tag || '').trim().toLowerCase()
        if (!clean || clean === 'credit_card_payment' || clean.startsWith('cc_')) continue
        tagCount.set(clean, (tagCount.get(clean) || 0) + 1)
      }
    }

    const data = Array.from(tagCount.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30)

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('[GET /api/tags/recent]', err)
    return NextResponse.json({ success: false, error: 'Gagal mengambil tag' }, { status: 500 })
  }
}
