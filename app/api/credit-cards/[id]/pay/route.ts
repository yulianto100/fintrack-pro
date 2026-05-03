import { NextResponse }    from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions }      from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import type { CreditCard, Transaction } from '@/types'

async function getUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions)
    const id = session?.user?.id
    if (!id || id === 'undefined') return null
    return id
  } catch { return null }
}

/** Compute current balance for a wallet type (cash/bank/ewallet) from transaction history */
async function getWalletBalance(
  db: ReturnType<typeof getAdminDatabase>,
  userId: string,
  walletType: string,
  walletAccountId?: string
): Promise<number> {
  const snap = await db.ref(`users/${userId}/transactions`).get()
  if (!snap.exists()) return 0
  const txs: Transaction[] = Object.values(snap.val())
  let balance = 0

  txs.forEach((tx) => {
    const matchAccount = walletAccountId
      ? tx.walletAccountId === walletAccountId
      : tx.wallet === walletType && !tx.walletAccountId

    const matchToAccount = walletAccountId
      ? tx.toWalletAccountId === walletAccountId
      : tx.toWallet === walletType && !tx.toWalletAccountId

    if (tx.type === 'income'  && matchAccount) balance += tx.amount
    // expense: skip CC payment transfers (tagged) and credit_expense (never touched wallet)
    if (tx.type === 'expense' && matchAccount && !tx.tags?.includes('credit_card_payment')) balance -= tx.amount
    // credit_expense: does NOT reduce wallet — intentionally excluded
    if (tx.type === 'transfer') {
      if (matchAccount)   balance -= tx.amount
      if (matchToAccount) balance += tx.amount
    }
  })

  return balance
}

// ── POST /api/credit-cards/[id]/pay ──────────────────────────────────────────
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const userId = await getUserId()
  if (!userId)
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { walletType, walletAccountId, amount, date, notes } = body

    if (!walletType)               return NextResponse.json({ success: false, error: 'Pilih sumber dompet' }, { status: 400 })
    if (!amount || Number(amount) <= 0)
      return NextResponse.json({ success: false, error: 'Jumlah pembayaran tidak valid' }, { status: 400 })

    const db      = getAdminDatabase()
    const cardRef = db.ref(`users/${userId}/creditCards/${params.id}`)
    const cardSnap = await cardRef.get()

    if (!cardSnap.exists())
      return NextResponse.json({ success: false, error: 'Kartu tidak ditemukan' }, { status: 404 })

    const card: CreditCard = { ...cardSnap.val(), id: params.id }
    const amt = Number(amount)

    // ── Validations ────────────────────────────────────────────────────────
    if (card.used <= 0)
      return NextResponse.json({ success: false, error: 'Tidak ada tagihan yang perlu dibayar' }, { status: 400 })

    if (amt > card.used)
      return NextResponse.json({
        success: false,
        error: `Jumlah melebihi tagihan. Tagihan: Rp ${card.used.toLocaleString('id-ID')}`,
      }, { status: 400 })

    // Check wallet balance
    const walletBalance = await getWalletBalance(db, userId, walletType, walletAccountId)
    if (walletBalance < amt)
      return NextResponse.json({
        success: false,
        error: `Saldo tidak cukup. Saldo ${walletType}: Rp ${walletBalance.toLocaleString('id-ID')}`,
        currentBalance: walletBalance,
      }, { status: 400 })

    // ── Atomic update ──────────────────────────────────────────────────────
    // 1. Reduce card.used
    await cardRef.update({
      used:      Math.max(0, card.used - amt),
      updatedAt: new Date().toISOString(),
    })

    // 2. Record as a transfer transaction (reduces wallet balance, NOT counted as expense)
    //    type='transfer' without toWallet → real cash outflow to credit card company
    const txRef  = db.ref(`users/${userId}/transactions`)
    const newRef = txRef.push()
    const payTx: Transaction = {
      id:          newRef.key!,
      userId,
      type:        'transfer',
      amount:      amt,
      categoryId:  'credit_card_payment',
      categoryName: 'Bayar Kartu Kredit',
      categoryIcon: '💳',
      description: notes || `Bayar ${card.name}`,
      date:        date || new Date().toISOString().split('T')[0],
      wallet:      walletType,
      ...(walletAccountId && { walletAccountId }),
      // Tag so expense stats & CC list can identify this
      tags:        ['credit_card_payment', `cc_${params.id}`],
      paymentMethod: 'wallet',
      creditCardId: params.id,
      creditCardName: card.name,
      createdAt:   new Date().toISOString(),
      updatedAt:   new Date().toISOString(),
    } as Transaction

    await newRef.set(payTx)

    return NextResponse.json({ success: true, data: { transaction: payTx } }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/credit-cards/[id]/pay]', String(err))
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
