import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import type { Transaction, WalletAccount } from '@/types'

async function getUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions)
    const id = session?.user?.id
    if (!id || id === 'undefined' || id === 'null') return null
    return id
  } catch { return null }
}

/**
 * POST /api/wallet-accounts/sync
 * Recomputes balances for all wallet accounts from transaction history.
 * Called after transactions are added/edited to keep account balances accurate.
 */
export async function POST() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const db = getAdminDatabase()

    const [txSnap, accountSnap] = await Promise.all([
      db.ref(`users/${userId}/transactions`).get(),
      db.ref(`users/${userId}/walletAccounts`).get(),
    ])

    if (!accountSnap.exists()) return NextResponse.json({ success: true, data: {} })

    const accounts: Record<string, WalletAccount> = accountSnap.val()
    // Initialise balance map
    const balances: Record<string, number> = {}
    Object.keys(accounts).forEach((id) => { balances[id] = 0 })

    if (txSnap.exists()) {
      const transactions: Transaction[] = Object.values(txSnap.val())
      transactions.forEach((tx) => {
        const { type, amount, walletAccountId, toWalletAccountId } = tx
        if (!amount || !type) return

        if (type === 'income' && walletAccountId && balances[walletAccountId] !== undefined) {
          balances[walletAccountId] += amount
        } else if (type === 'expense' && walletAccountId && balances[walletAccountId] !== undefined) {
          balances[walletAccountId] -= amount
        } else if (type === 'transfer') {
          if (walletAccountId && balances[walletAccountId] !== undefined)
            balances[walletAccountId] -= amount
          if (toWalletAccountId && balances[toWalletAccountId] !== undefined)
            balances[toWalletAccountId] += amount
        }
      })
    }

    // Write updated balances back
    const updates: Record<string, number> = {}
    Object.entries(balances).forEach(([id, balance]) => {
      updates[`users/${userId}/walletAccounts/${id}/balance`] = balance
    })

    if (Object.keys(updates).length > 0) await db.ref().update(updates)

    return NextResponse.json({ success: true, data: balances })
  } catch (err) {
    console.error('[POST /api/wallet-accounts/sync]', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

/**
 * GET /api/wallet-accounts/sync
 * Returns current computed balances without writing to DB (read-only preview).
 */
export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const db = getAdminDatabase()
    const [txSnap, accountSnap] = await Promise.all([
      db.ref(`users/${userId}/transactions`).get(),
      db.ref(`users/${userId}/walletAccounts`).get(),
    ])

    if (!accountSnap.exists()) return NextResponse.json({ success: true, data: {} })

    const accounts: Record<string, WalletAccount> = accountSnap.val()
    const balances: Record<string, number> = {}
    Object.keys(accounts).forEach((id) => { balances[id] = 0 })

    if (txSnap.exists()) {
      const transactions: Transaction[] = Object.values(txSnap.val())
      transactions.forEach((tx) => {
        const { type, amount, walletAccountId, toWalletAccountId } = tx
        if (!amount || !type) return
        if (type === 'income'  && walletAccountId   && balances[walletAccountId]   !== undefined) balances[walletAccountId]   += amount
        if (type === 'expense' && walletAccountId   && balances[walletAccountId]   !== undefined) balances[walletAccountId]   -= amount
        if (type === 'transfer') {
          if (walletAccountId   && balances[walletAccountId]   !== undefined) balances[walletAccountId]   -= amount
          if (toWalletAccountId && balances[toWalletAccountId] !== undefined) balances[toWalletAccountId] += amount
        }
      })
    }

    // Annotate with account names
    const result = Object.entries(accounts).map(([id, acc]) => ({
      id, name: acc.name, type: acc.type, balance: balances[id] ?? 0,
    }))

    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
