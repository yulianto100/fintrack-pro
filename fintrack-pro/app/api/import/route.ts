import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import { smartCategorize } from '@/lib/csv-parser'
import type { Transaction, ImportLog } from '@/types'

async function getUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions)
    const id = session?.user?.id
    if (!id || id === 'undefined' || id === 'null') return null
    return id
  } catch { return null }
}

export interface ImportRow {
  date:        string
  description: string
  amount:      number
  type?:       'income' | 'expense' | 'transfer'
  category?:   string
  wallet?:     string
}

// POST /api/import — save imported transactions
export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { rows, fileName } = await request.json() as { rows: ImportRow[]; fileName: string }

    if (!Array.isArray(rows) || rows.length === 0)
      return NextResponse.json({ success: false, error: 'rows array required' }, { status: 400 })

    const db      = getAdminDatabase()
    const txRef   = db.ref(`users/${userId}/transactions`)
    const catSnap = await db.ref(`users/${userId}/categories`).get()

    // Build category name→id map for matching
    const catNameToId: Record<string, string> = {}
    if (catSnap.exists()) {
      Object.values(catSnap.val() as Record<string, { id: string; name: string }>).forEach((c) => {
        catNameToId[c.name.toLowerCase()] = c.id
      })
    }

    const now     = new Date().toISOString()
    const batch: Record<string, Transaction> = {}
    let imported  = 0
    let skipped   = 0

    for (const row of rows) {
      if (!row.date || !row.amount) { skipped++; continue }

      const smart = row.type
        ? { category: row.category || 'Lainnya', type: row.type, confidence: 'high' as const }
        : smartCategorize(row.description, row.amount)

      const catId = catNameToId[smart.category.toLowerCase()] || 'imported'

      const key  = txRef.push().key!
      const amount = Math.abs(row.amount)

      batch[key] = {
        id:           key,
        userId,
        type:         smart.type,
        amount,
        categoryId:   catId,
        categoryName: smart.category,
        categoryIcon: '📦',
        description:  row.description || '',
        date:         row.date,
        wallet:       (row.wallet as 'cash' | 'bank' | 'ewallet') || 'bank',
        tags:         ['imported'],
        createdAt:    now,
        updatedAt:    now,
      }
      imported++
    }

    if (Object.keys(batch).length > 0) await txRef.update(batch)

    // Save import log
    const logRef = db.ref(`users/${userId}/importLogs`).push()
    const log: ImportLog = {
      id: logRef.key!, userId,
      fileName: fileName || 'unknown.csv',
      totalRows: rows.length, imported, skipped,
      createdAt: now,
    }
    await logRef.set(log)

    return NextResponse.json({ success: true, data: { imported, skipped, logId: log.id } })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

// GET /api/import — fetch import history
export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const db   = getAdminDatabase()
    const snap = await db.ref(`users/${userId}/importLogs`).get()
    if (!snap.exists()) return NextResponse.json({ success: true, data: [] })

    const logs: ImportLog[] = Object.values(snap.val())
    logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return NextResponse.json({ success: true, data: logs.slice(0, 20) })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
