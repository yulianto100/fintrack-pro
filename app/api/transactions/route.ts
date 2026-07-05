import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import { isExpenseForSummary } from '@/lib/transaction-rules'
import { persistNotificationOnce } from '@/lib/notifications-store'
import type { BudgetCategory, Transaction } from '@/types'

async function getUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions)
    const id = session?.user?.id
    if (!id || id === 'undefined') return null
    return id
  } catch { return null }
}

async function persistBudgetUsageNotification(
  db: ReturnType<typeof import('@/lib/firebase-admin').getAdminDatabase>,
  userId: string,
  tx: Transaction,
): Promise<void> {
  if (!isExpenseForSummary(tx) || !tx.categoryId || !tx.date) return

  const month = tx.date.slice(0, 7)
  const [budgetSnap, txSnap] = await Promise.all([
    db.ref(`users/${userId}/budgets`).get(),
    db.ref(`users/${userId}/transactions`).orderByChild('date').startAt(`${month}-01`).endAt(`${month}-31`).get(),
  ])
  if (!budgetSnap.exists()) return

  const budgets = Object.values(budgetSnap.val() as Record<string, BudgetCategory>)
  const matching = budgets.find((budget) => budget.categoryId === tx.categoryId && budget.month === month)
  if (!matching || matching.limitAmount <= 0) return

  const transactions = txSnap.exists()
    ? Object.values(txSnap.val() as Record<string, Transaction>)
    : []
  const spent = transactions
    .filter((item) => item.categoryId === matching.categoryId && isExpenseForSummary(item))
    .reduce((sum, item) => sum + item.amount, 0)
  const percent = (spent / matching.limitAmount) * 100

  if (percent >= 100) {
    await persistNotificationOnce(userId, `budget_over_${matching.categoryId}_${month}`, {
      type: 'budget_warning',
      title: `Budget ${matching.categoryName || 'kategori'} terlampaui`,
      message: `Sudah Rp ${spent.toLocaleString('id-ID')} dari Rp ${matching.limitAmount.toLocaleString('id-ID')} bulan ini.`,
      icon: '⚠️',
      link: '/goals?tab=budget',
    })
  } else if (percent >= 90) {
    await persistNotificationOnce(userId, `budget_warn_${matching.categoryId}_${month}`, {
      type: 'budget_warning',
      title: `Budget ${matching.categoryName || 'kategori'} hampir habis`,
      message: `${percent.toFixed(0)}% dari Rp ${matching.limitAmount.toLocaleString('id-ID')} sudah terpakai.`,
      icon: '⚠️',
      link: '/goals?tab=budget',
    })
  }
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
  const tagsParam       = searchParams.getAll('tag')
  const limit           = Math.min(parseInt(searchParams.get('limit') || '300'), 1000)

  try {
    const db   = getAdminDatabase()
    const snap = await db.ref(`users/${userId}/transactions`).get()
    if (!snap.exists()) return NextResponse.json({ success: true, data: [] })

    let list: Transaction[] = Object.entries(snap.val() as Record<string, Transaction>)
      .map(([key, tx]) => ({ ...tx, id: tx.id || key }))  // always ensure id is set

    if (month)           list = list.filter((t) => t.date?.startsWith(month))
    if (categoryId)      list = list.filter((t) => t.categoryId === categoryId)
    if (type)            list = list.filter((t) => type === 'expense' ? isExpenseForSummary(t) : t.type === type)
    if (wallet)          list = list.filter((t) => t.wallet === wallet || t.toWallet === wallet)
    if (walletAccountId) list = list.filter(
      (t) => t.walletAccountId === walletAccountId || t.toWalletAccountId === walletAccountId
    )
    if (tagsParam.length > 0) {
      list = list.filter((t) => Array.isArray(t.tags) && tagsParam.some((tag) => t.tags?.includes(tag)))
    }

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

    const paymentMethod = body.paymentMethod === 'credit_card' ? 'credit_card' : 'wallet'
    const isCreditCardExpense = type === 'expense' && paymentMethod === 'credit_card'

    // System-generated transactions (sell proceeds, maturity payouts) bypass categoryId
    const isSystemTransaction = body.isSystemTransaction === true

    if (!type)                           return NextResponse.json({ success: false, error: 'Tipe wajib diisi' },         { status: 400 })
    if (!amount || Number(amount) <= 0)  return NextResponse.json({ success: false, error: 'Jumlah tidak valid' },       { status: 400 })
    if (!date)                           return NextResponse.json({ success: false, error: 'Tanggal wajib diisi' },      { status: 400 })
    if (!wallet && !isCreditCardExpense) return NextResponse.json({ success: false, error: 'Wallet wajib dipilih' },     { status: 400 })
    if (isCreditCardExpense && !body.creditCardId)
      return NextResponse.json({ success: false, error: 'Kartu kredit wajib dipilih' }, { status: 400 })
    if (!categoryId && type !== 'transfer' && !isSystemTransaction)
      return NextResponse.json({ success: false, error: 'Kategori wajib dipilih' }, { status: 400 })

    if (type === 'transfer' && walletAccountId && toWalletAccountId && walletAccountId === toWalletAccountId)
      return NextResponse.json({ success: false, error: 'Akun asal dan tujuan tidak boleh sama' }, { status: 400 })

    const db  = getAdminDatabase()
    const amt = Number(amount)

    // Wallet validation is skipped for credit card expenses —
    // they do not deduct from wallet balance.
    // ── BALANCE VALIDATION (lightweight) ────────────────────────────────────────
    // Use walletAccounts balance directly instead of recomputing from all transactions
    const needsBalanceCheck = (type === 'expense' || type === 'transfer') && !isCreditCardExpense
    if (needsBalanceCheck) {
      let currentBalance = 0

      if (walletAccountId) {
        const accSnap = await db.ref(`users/${userId}/walletAccounts/${walletAccountId}/balance`).get()
        currentBalance = accSnap.exists() ? Number(accSnap.val() || 0) : 0
      } else if (wallet) {
        // Generic wallet: sum balances of all accounts of this type
        const accountsSnap = await db.ref(`users/${userId}/walletAccounts`).orderByChild('type').equalTo(wallet).get()
        if (accountsSnap.exists()) {
          Object.values(accountsSnap.val()).forEach((acc: any) => {
            currentBalance += Number(acc.balance || 0)
          })
        }
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

    // ── CREDIT CARD VALIDATION ────────────────────────────────────────────
    let creditCardForUpdate: { used?: number; limit?: number } | null = null
    if (isCreditCardExpense) {
      const ccSnap = await db.ref(`users/${userId}/creditCards/${body.creditCardId}`).get()
      if (!ccSnap.exists()) {
        return NextResponse.json({ success: false, error: 'Kartu kredit tidak ditemukan' }, { status: 400 })
      }
      const cc = ccSnap.val()
      creditCardForUpdate = cc
      const remaining = Number(cc.limit || 0) - Number(cc.used || 0)
      if (amt > remaining) {
        return NextResponse.json({
          success: false,
          error: `Melebihi sisa limit kartu. Sisa limit: Rp ${remaining.toLocaleString('id-ID')}`,
        }, { status: 400 })
      }
    }

    const txRef  = db.ref(`users/${userId}/transactions`)
    const newRef = txRef.push()

    let categoryName = '', categoryIcon = ''
    if (categoryId && categoryId !== 'transfer') {
      try {
        const catSnap = await db.ref(`users/${userId}/categories/${categoryId}`).get()
        if (catSnap.exists()) { const c = catSnap.val(); categoryName = c.name || ''; categoryIcon = c.icon || '' }
      } catch { /* ignore */ }
    }

    // Credit card purchases are stored as 'credit_expense' — they don't reduce wallet
    const now = new Date().toISOString()
    const txType: Transaction['type'] = isCreditCardExpense ? 'credit_expense' : type

    const tx: Transaction = {
      id:          newRef.key!,
      userId,
      type:        txType,
      amount:      amt,
      categoryId:  categoryId || 'transfer',
      categoryName,
      categoryIcon,
      description: description || '',
      date,
      ...(wallet && !isCreditCardExpense && { wallet }),
      ...(toWallet          && { toWallet }),
      ...(walletAccountId   && !isCreditCardExpense && { walletAccountId }),
      ...(toWalletAccountId && type === 'transfer' && { toWalletAccountId }),
      tags:        Array.isArray(tags) ? tags : [],
      // ── Credit card fields ───────────────────────────────────────────────
      paymentMethod,
      ...(body.creditCardId   && { creditCardId:   body.creditCardId }),
      ...(body.creditCardName && { creditCardName: body.creditCardName }),
      createdAt:   now,
      updatedAt:   now,
    }

    const updates: Record<string, unknown> = {
      [`users/${userId}/transactions/${newRef.key}`]: tx,
    }

    // ── UPDATE CREDIT CARD USED AMOUNT ──────────────────────────────────────
    if (isCreditCardExpense) {
      updates[`users/${userId}/creditCards/${body.creditCardId}/used`] =
        Number(creditCardForUpdate?.used || 0) + amt
      updates[`users/${userId}/creditCards/${body.creditCardId}/updatedAt`] = now
    }

    await db.ref().update(updates)

    // Fire-and-forget: don't block the response for budget notifications
    persistBudgetUsageNotification(db, userId, tx).catch((err) => {
      console.warn('[budget notification persist]', err)
    })

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
