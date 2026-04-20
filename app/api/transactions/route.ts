import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import type { Transaction } from '@/types'

async function getUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions)
    const id = session?.user?.id
    if (!id || id === 'undefined') return null
    return id
  } catch { return null }
}

export async function GET(request: Request) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Sesi tidak valid, silakan login ulang.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const month      = searchParams.get('month')
  const categoryId = searchParams.get('categoryId')
  const type       = searchParams.get('type')
  const wallet     = searchParams.get('wallet')
  const limit      = Math.min(parseInt(searchParams.get('limit') || '300'), 1000)

  try {
    const db   = getAdminDatabase()
    // Use simple .get() — no orderByChild to avoid needing Firebase index rules
    const snap = await db.ref(`users/${userId}/transactions`).get()

    if (!snap.exists()) return NextResponse.json({ success: true, data: [] })

    let list: Transaction[] = Object.values(snap.val() as Record<string, Transaction>)

    // Filter in JS
    if (month)      list = list.filter((t) => t.date?.startsWith(month))
    if (categoryId) list = list.filter((t) => t.categoryId === categoryId)
    if (type)       list = list.filter((t) => t.type === type)
    if (wallet)     list = list.filter((t) => t.wallet === wallet || t.toWallet === wallet)

    // Sort newest first
    list.sort((a, b) => new Date(b.date || b.createdAt || '').getTime() - new Date(a.date || a.createdAt || '').getTime())

    return NextResponse.json({ success: true, data: list.slice(0, limit) })
  } catch (err) {
    console.error('[GET /api/transactions]', String(err))
    return NextResponse.json({ success: false, error: `Server error: ${String(err)}` }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Sesi tidak valid, silakan login ulang.' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { type, amount, categoryId, description, date, wallet, toWallet, tags } = body

    // Validate
    if (!type)                      return NextResponse.json({ success: false, error: 'Tipe wajib diisi' },         { status: 400 })
    if (!amount || Number(amount) <= 0) return NextResponse.json({ success: false, error: 'Jumlah tidak valid' },   { status: 400 })
    if (!date)                      return NextResponse.json({ success: false, error: 'Tanggal wajib diisi' },      { status: 400 })
    if (!wallet)                    return NextResponse.json({ success: false, error: 'Wallet wajib dipilih' },     { status: 400 })
    if (!categoryId && type !== 'transfer')
                                    return NextResponse.json({ success: false, error: 'Kategori wajib dipilih' },   { status: 400 })

    const db     = getAdminDatabase()
    const txRef  = db.ref(`users/${userId}/transactions`)
    const newRef = txRef.push()

    // Get category info (non-blocking)
    let categoryName = '', categoryIcon = ''
    if (categoryId && categoryId !== 'transfer') {
      try {
        const catSnap = await db.ref(`users/${userId}/categories/${categoryId}`).get()
        if (catSnap.exists()) { const c = catSnap.val(); categoryName = c.name || ''; categoryIcon = c.icon || '' }
      } catch { /* ignore */ }
    }

    const tx: Transaction = {
      id: newRef.key!,
      userId,
      type,
      amount:       Number(amount),
      categoryId:   categoryId || 'transfer',
      categoryName,
      categoryIcon,
      description:  description || '',
      date,
      wallet,
      toWallet:     toWallet || undefined,
      tags:         Array.isArray(tags) ? tags : [],
      createdAt:    new Date().toISOString(),
      updatedAt:    new Date().toISOString(),
    }

    await newRef.set(tx)
    return NextResponse.json({ success: true, data: tx }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/transactions]', String(err))
    return NextResponse.json({ success: false, error: `Gagal menyimpan: ${String(err)}` }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { transactions } = await request.json()
    if (!Array.isArray(transactions)) return NextResponse.json({ success: false, error: 'transactions array required' }, { status: 400 })

    const db    = getAdminDatabase()
    const ref   = db.ref(`users/${userId}/transactions`)
    const batch: Record<string, Transaction> = {}
    transactions.forEach((t: Partial<Transaction>) => {
      const key = ref.push().key!
      batch[key] = { ...t, id: key, userId, createdAt: t.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() } as Transaction
    })
    await ref.update(batch)
    return NextResponse.json({ success: true, data: { imported: transactions.length } })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
