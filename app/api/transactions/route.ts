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

/** Compute current balance for a specific walletAccountId from transaction history */
async function getAccountBalance(db: ReturnType<typeof import('@/lib/firebase-admin').getAdminDatabase>, userId: string, walletAccountId: string): Promise<number> {
  const snap = await db.ref(`users/${userId}/transactions`).get()
  if (!snap.exists()) return 0
  const txs: Transaction[] = Object.values(snap.val())
  let balance = 0
  txs.forEach((tx) => {
    if (tx.type === 'income'   && tx.walletAccountId   === walletAccountId) balance += tx.amount
    if (tx.type === 'expense'  && tx.walletAccountId   === walletAccountId) balance -= tx.amount
    if (tx.type === 'transfer') {
      if (tx.walletAccountId   === walletAccountId) balance -= tx.amount
      if (tx.toWalletAccountId === walletAccountId) balance += tx.amount
    }
  })
  return balance
}

/** Compute current balance for a generic wallet type (cash/bank/ewallet) from transaction history */
async function getWalletTypeBalance(db: ReturnType<typeof import('@/lib/firebase-admin').getAdminDatabase>, userId: string, walletType: string): Promise<number> {
  const snap = await db.ref(`users/${userId}/transactions`).get()
  if (!snap.exists()) return 0
  const txs: Transaction[] = Object.values(snap.val())
  let balance = 0
  txs.forEach((tx) => {
    // Only count transactions that DON'T have a walletAccountId (generic wallet-level)
    if (tx.type === 'income'  && tx.wallet   === walletType && !tx.walletAccountId)   balance += tx.amount
    if (tx.type === 'expense' && tx.wallet   === walletType && !tx.walletAccountId)   balance -= tx.amount
    if (tx.type === 'transfer') {
      if (tx.wallet   === walletType && !tx.walletAccountId)   balance -= tx.amount
      if (tx.toWallet === walletType && !tx.toWalletAccountId) balance += tx.amount
    }
  })
  return balance
}

export async function GET(request: Request) {
  const userId = await getUserId()
  if (!userId)
    return NextResponse.json({ success: false, error: 'Sesi tidak valid, silakan login ulang.' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const month           = searchParams.get('month')
  const categoryId      = searchParams.get('categoryId')
  const type            = searchParams.get('type')
  const wallet          = searchParams.get('wallet')
  const walletAccountId = searchParams.get('walletAccountId')
  const limit           = Math.min(parseInt(searchParams.get('limit') || '300'), 1000)

  try {
    const db   = getAdminDatabase()
    const snap = await db.ref(`users/${userId}/transactions`).get()
    if (!snap.exists()) return NextResponse.json({ success: true, data: [] })

    let list: Transaction[] = Object.entries(snap.val() as Record<string, Transaction>)
      .map(([key, tx]) => ({ ...tx, id: tx.id || key }))  // always ensure id is set

    if (month)           list = list.filter((t) => t.date?.startsWith(month))
    if (categoryId)      list = list.filter((t) => t.categoryId === categoryId)
    if (type)            list = list.filter((t) => t.type === type)
    if (wallet)          list = list.filter((t) => t.wallet === wallet || t.toWallet === wallet)
    if (walletAccountId) list = list.filter(
      (t) => t.walletAccountId === walletAccountId || t.toWalletAccountId === walletAccountId
    )

    list.sort((a, b) => new Date(b.date || b.createdAt || '').getTime() - new Date(a.date || a.createdAt || '').getTime())
    return NextResponse.json({ success: true, data: list.slice(0, limit) })
  } catch (err) {
    console.error('[GET /api/transactions]', String(err))
    return NextResponse.json({ success: false, error: `Server error: ${String(err)}` }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId)
    return NextResponse.json({ success: false, error: 'Sesi tidak valid, silakan login ulang.' }, { status: 401 })

  try {
    const body = await request.json()
    const {
      type, amount, categoryId, description, date, wallet, toWallet,
      walletAccountId, toWalletAccountId, tags,
    } = body

    // System-generated transactions (sell proceeds, maturity payouts) bypass categoryId
    const isSystemTransaction = body.isSystemTransaction === true

    if (!type)                           return NextResponse.json({ success: false, error: 'Tipe wajib diisi' },         { status: 400 })
    if (!amount || Number(amount) <= 0)  return NextResponse.json({ success: false, error: 'Jumlah tidak valid' },       { status: 400 })
    if (!date)                           return NextResponse.json({ success: false, error: 'Tanggal wajib diisi' },      { status: 400 })
    if (!wallet)                         return NextResponse.json({ success: false, error: 'Wallet wajib dipilih' },     { status: 400 })
    if (!categoryId && type !== 'transfer' && !isSystemTransaction)
      return NextResponse.json({ success: false, error: 'Kategori wajib dipilih' }, { status: 400 })

    if (type === 'transfer' && walletAccountId && toWalletAccountId && walletAccountId === toWalletAccountId)
      return NextResponse.json({ success: false, error: 'Akun asal dan tujuan tidak boleh sama' }, { status: 400 })

    const db  = getAdminDatabase()
    const amt = Number(amount)

    // ── BALANCE VALIDATION ────────────────────────────────────────────────────
    // Block expense or transfer (debit side) if balance would go negative
    const needsBalanceCheck = type === 'expense' || type === 'transfer'
    if (needsBalanceCheck) {
      let currentBalance: number

      if (walletAccountId) {
        // Specific account — check account-level balance
        currentBalance = await getAccountBalance(db, userId, walletAccountId)
      } else {
        // Generic wallet type — check wallet-type balance
        currentBalance = await getWalletTypeBalance(db, userId, wallet)
      }

      if (currentBalance < amt) {
        return NextResponse.json({
          success: false,
          error: `Saldo tidak cukup. Saldo tersedia: Rp ${currentBalance.toLocaleString('id-ID')}`,
          currentBalance,
        }, { status: 400 })
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    const txRef  = db.ref(`users/${userId}/transactions`)
    const newRef = txRef.push()

    let categoryName = '', categoryIcon = ''
    if (categoryId && categoryId !== 'transfer') {
      try {
        const catSnap = await db.ref(`users/${userId}/categories/${categoryId}`).get()
        if (catSnap.exists()) { const c = catSnap.val(); categoryName = c.name || ''; categoryIcon = c.icon || '' }
      } catch { /* ignore */ }
    }

    const tx: Transaction = {
      id:          newRef.key!,
      userId,
      type,
      amount:      amt,
      categoryId:  categoryId || 'transfer',
      categoryName,
      categoryIcon,
      description: description || '',
      date,
      wallet,
      ...(toWallet          && { toWallet }),
      ...(walletAccountId   && { walletAccountId }),
      ...(toWalletAccountId && type === 'transfer' && { toWalletAccountId }),
      tags:        Array.isArray(tags) ? tags : [],
      createdAt:   new Date().toISOString(),
      updatedAt:   new Date().toISOString(),
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
    if (!Array.isArray(transactions))
      return NextResponse.json({ success: false, error: 'transactions array required' }, { status: 400 })

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
