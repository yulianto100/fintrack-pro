import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import type { Transaction } from '@/types'

async function getUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions)
    const id = session?.user?.id
    if (!id || id === 'undefined' || id === 'null') return null
    return id
  } catch { return null }
}

// PATCH /api/wallet-accounts/[id]
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = params
    const body   = await request.json()
    const { name } = body

    if (!name?.trim())
      return NextResponse.json({ success: false, error: 'Nama akun wajib diisi' }, { status: 400 })

    const db = getAdminDatabase()
    await db.ref(`users/${userId}/walletAccounts/${id}`).update({
      name:      name.trim(),
      updatedAt: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

// DELETE /api/wallet-accounts/[id]
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = params
    const db     = getAdminDatabase()

    // ── Guard: block delete if account has linked transactions ──
    const txSnap = await db.ref(`users/${userId}/transactions`).get()
    if (txSnap.exists()) {
      const transactions: Transaction[] = Object.values(txSnap.val())

      const linkedTx = transactions.filter(
        (tx) => tx.walletAccountId === id || tx.toWalletAccountId === id
      )

      if (linkedTx.length > 0) {
        // Get account name for the error message
        const accSnap = await db.ref(`users/${userId}/walletAccounts/${id}`).get()
        const accName = accSnap.exists() ? accSnap.val().name : 'Akun ini'

        return NextResponse.json({
          success: false,
          code:    'HAS_TRANSACTIONS',
          error:   `${accName} tidak bisa dihapus karena memiliki ${linkedTx.length} transaksi terkait. Hapus atau pindahkan transaksi tersebut terlebih dahulu.`,
          count:   linkedTx.length,
        }, { status: 409 })
      }
    }

    await db.ref(`users/${userId}/walletAccounts/${id}`).remove()
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
