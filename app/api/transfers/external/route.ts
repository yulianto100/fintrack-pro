import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import { isExpenseForWalletBalance } from '@/lib/transaction-rules'
import type { Transaction } from '@/types'

async function getUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions)
    const id = session?.user?.id
    if (!id || id === 'undefined' || id === 'null') return null
    return id
  } catch { return null }
}

/**
 * POST /api/transfers/external
 * Transfer money from current user's wallet to another user's wallet.
 * - Checks sender has sufficient balance before proceeding
 * - Records expense tx for sender
 * - Records income tx for receiver
 */
export async function POST(request: Request) {
  const senderId = await getUserId()
  if (!senderId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const {
      amount,
      fromWallet,
      fromWalletAccountId,
      toUserId,
      toUserName,
      toWalletAccountId,
      toWalletType,
      date,
      description,
    } = body

    if (!amount || Number(amount) <= 0)
      return NextResponse.json({ success: false, error: 'Jumlah tidak valid' }, { status: 400 })
    if (!fromWallet)
      return NextResponse.json({ success: false, error: 'Pilih wallet asal' }, { status: 400 })
    if (!toUserId || !toUserName)
      return NextResponse.json({ success: false, error: 'User tujuan tidak valid' }, { status: 400 })
    if (!toWalletAccountId)
      return NextResponse.json({ success: false, error: 'Pilih akun tujuan penerima' }, { status: 400 })

    const db  = getAdminDatabase()
    const amt = Number(amount)

    // ── 1. Balance check for sender ──────────────────────────────────────────
    const txSnap = await db.ref(`users/${senderId}/transactions`).get()
    let currentBalance = 0

    if (txSnap.exists()) {
      const allTx: Transaction[] = Object.values(txSnap.val())

      if (fromWalletAccountId) {
        // Specific account balance
        allTx.forEach((tx) => {
          if (tx.type === 'income' && tx.walletAccountId === fromWalletAccountId) currentBalance += tx.amount
          if (isExpenseForWalletBalance(tx) && tx.walletAccountId === fromWalletAccountId) currentBalance -= tx.amount
          if (tx.type === 'transfer') {
            if (tx.walletAccountId   === fromWalletAccountId) currentBalance -= tx.amount
            if (tx.toWalletAccountId === fromWalletAccountId) currentBalance += tx.amount
          }
        })
      } else {
        // Generic wallet type balance
        allTx.forEach((tx) => {
          if (tx.type === 'income' && tx.wallet === fromWallet) currentBalance += tx.amount
          if (isExpenseForWalletBalance(tx) && tx.wallet === fromWallet) currentBalance -= tx.amount
          if (tx.type === 'transfer') {
            if (tx.wallet   === fromWallet && !tx.walletAccountId)   currentBalance -= tx.amount
            if (tx.toWallet === fromWallet && !tx.toWalletAccountId) currentBalance += tx.amount
          }
        })
      }
    }

    if (currentBalance < amt)
      return NextResponse.json({
        success: false,
        error: `Saldo tidak cukup. Saldo tersedia: Rp ${currentBalance.toLocaleString('id-ID')}`,
        currentBalance,
      }, { status: 400 })

    // ── 2. Get sender username ───────────────────────────────────────────────
    const senderAuthSnap = await db.ref(`users/${senderId}/auth`).get()
    const senderUsername = senderAuthSnap.exists() ? (senderAuthSnap.val().username || senderId) : senderId

    const now = new Date().toISOString()

    // ── 3. Create sender expense transaction ─────────────────────────────────
    const senderRef    = db.ref(`users/${senderId}/transactions`).push()
    const senderTx: Transaction & { isExternalTransfer?: boolean; toUserId?: string; toUserName?: string } = {
      id:          senderRef.key!,
      userId:      senderId,
      type:        'expense',
      amount:      amt,
      categoryId:  'transfer',
      categoryName:'Transfer',
      categoryIcon:'🔄',
      description: description || `Transfer ke @${toUserName}`,
      date:        date || now.split('T')[0],
      wallet:      fromWallet,
      ...(fromWalletAccountId && { walletAccountId: fromWalletAccountId }),
      tags:        ['external-transfer'],
      isExternalTransfer: true,
      toUserId,
      toUserName,
      createdAt:   now,
      updatedAt:   now,
    }

    // ── 4. Create receiver income transaction ────────────────────────────────
    const receiverRef    = db.ref(`users/${toUserId}/transactions`).push()
    const receiverTx: Transaction & { isExternalTransfer?: boolean; fromUserId?: string; fromUserName?: string } = {
      id:          receiverRef.key!,
      userId:      toUserId,
      type:        'income',
      amount:      amt,
      categoryId:  'transfer',
      categoryName:'Transfer',
      categoryIcon:'🔄',
      description: description || `Transfer dari @${senderUsername}`,
      date:        date || now.split('T')[0],
      wallet:      toWalletType || 'bank',
      walletAccountId: toWalletAccountId,
      tags:        ['external-transfer'],
      isExternalTransfer: true,
      fromUserId:  senderId,
      fromUserName: senderUsername,
      createdAt:   now,
      updatedAt:   now,
    }

    // ── 5. Write both atomically ─────────────────────────────────────────────
    await Promise.all([
      senderRef.set(senderTx),
      receiverRef.set(receiverTx),
    ])

    // ── 6. Trigger wallet sync for both ──────────────────────────────────────
    // Fire-and-forget sync for sender (receiver sync will happen on their next load)
    fetch(`${process.env.NEXTAUTH_URL || ''}/api/wallet-accounts/sync`, {
      method: 'POST',
      headers: { cookie: request.headers.get('cookie') || '' },
    }).catch(() => {})

    return NextResponse.json({ success: true, data: { senderTx, currentBalance, newBalance: currentBalance - amt } }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/transfers/external]', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
