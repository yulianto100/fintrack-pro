import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import type { Transaction } from '@/types'

async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions)
  return session?.user?.id || null
}

export async function GET(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Sesi tidak valid. Silakan login ulang.' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const month      = searchParams.get('month')
  const categoryId = searchParams.get('categoryId')
  const type       = searchParams.get('type')
  const wallet     = searchParams.get('wallet')
  const limit      = Math.min(parseInt(searchParams.get('limit') || '200'), 500)

  try {
    const db  = getAdminDatabase()
    const snap = await db.ref(`users/${userId}/transactions`).orderByChild('date').get()

    if (!snap.exists()) return NextResponse.json({ success: true, data: [] })

    let list: Transaction[] = Object.values(snap.val())
    if (month)      list = list.filter((t) => t.date.startsWith(month))
    if (categoryId) list = list.filter((t) => t.categoryId === categoryId)
    if (type)       list = list.filter((t) => t.type === type)
    if (wallet)     list = list.filter((t) => t.wallet === wallet || t.toWallet === wallet)

    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return NextResponse.json({ success: true, data: list.slice(0, limit) })
  } catch (err) {
    console.error('[GET /api/transactions]', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Sesi tidak valid. Silakan login ulang.' }, { status: 401 })

  try {
    const body = await request.json()
    const { type, amount, categoryId, description, date, wallet, toWallet, tags } = body

    // Validate
    if (!type)       return NextResponse.json({ success: false, error: 'Tipe transaksi wajib diisi' }, { status: 400 })
    if (!amount || Number(amount) <= 0) return NextResponse.json({ success: false, error: 'Jumlah tidak valid' }, { status: 400 })
    if (!date)       return NextResponse.json({ success: false, error: 'Tanggal wajib diisi' }, { status: 400 })
    if (!wallet)     return NextResponse.json({ success: false, error: 'Wallet wajib dipilih' }, { status: 400 })
    if (!categoryId && type !== 'transfer') return NextResponse.json({ success: false, error: 'Kategori wajib dipilih' }, { status: 400 })

    const db     = getAdminDatabase()
    const txRef  = db.ref(`users/${userId}/transactions`)
    const newRef = txRef.push()

    // Fetch category info — non-blocking, fallback to empty
    let categoryName = '', categoryIcon = ''
    if (categoryId && categoryId !== 'transfer') {
      try {
        const catSnap = await db.ref(`users/${userId}/categories/${categoryId}`).get()
        if (catSnap.exists()) {
          const cat = catSnap.val()
          categoryName = cat.name  || ''
          categoryIcon = cat.icon  || ''
        }
      } catch { /* ignore */ }
    }

  const tx: Transaction = {
  id: newRef.key!,
  userId,
  type,
  amount: Number(amount),
  categoryId: categoryId || 'transfer',
  categoryName,
  categoryIcon,
  description: description || '',
  date,
  wallet,
  ...(type === 'transfer' && toWallet ? { toWallet } : {}),
  tags: tags || [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  }

    const cleanTx = Object.fromEntries(
  Object.entries(tx).filter(([_, v]) => v !== undefined)
)

await newRef.set(cleanTx)
    return NextResponse.json({ success: true, data: tx }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/transactions]', err)
    return NextResponse.json({ success: false, error: `Server error: ${String(err)}` }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { transactions } = await request.json()
    if (!Array.isArray(transactions)) return NextResponse.json({ success: false, error: 'transactions array required' }, { status: 400 })

    const db  = getAdminDatabase()
    const ref = db.ref(`users/${userId}/transactions`)
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
