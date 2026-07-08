import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import type { Loan, LoanPayment, Transaction, WalletAccount } from '@/types'

async function getUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions)
    const id = session?.user?.id
    if (!id || id === 'undefined' || id === 'null') return null
    return id
  } catch { return null }
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function getStatus(remainingAmount: number, dueDate?: string): Loan['status'] {
  if (remainingAmount <= 0) return 'paid'
  if (dueDate && dueDate < todayIso()) return 'overdue'
  return 'active'
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const db = getAdminDatabase()
    const snap = await db.ref(`users/${userId}/loanPayments/${params.id}`).get()
    const payments: LoanPayment[] = snap.exists()
      ? Object.entries(snap.val() as Record<string, LoanPayment>)
        .map(([id, p]) => ({ ...p, id: p.id || id }))
        .sort((a, b) => new Date(b.paymentDate || b.createdAt).getTime() - new Date(a.paymentDate || a.createdAt).getTime())
      : []
    return NextResponse.json({ success: true, data: payments })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const amount = Number(body.amount || 0)
    const paymentDate = body.paymentDate || todayIso()
    const wallet = body.wallet || 'cash'
    const walletAccountId = body.walletAccountId || ''

    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ success: false, error: 'Nominal pembayaran tidak valid' }, { status: 400 })
    if (!paymentDate) return NextResponse.json({ success: false, error: 'Tanggal pembayaran wajib diisi' }, { status: 400 })

    const db = getAdminDatabase()
    const loanSnap = await db.ref(`users/${userId}/loans/${params.id}`).get()
    if (!loanSnap.exists()) return NextResponse.json({ success: false, error: 'Piutang tidak ditemukan' }, { status: 404 })

    const loan = loanSnap.val() as Loan
    if (loan.status === 'written_off') return NextResponse.json({ success: false, error: 'Piutang sudah dihapuskan' }, { status: 400 })
    const remaining = Number(loan.remainingAmount || 0)
    if (remaining <= 0) return NextResponse.json({ success: false, error: 'Piutang sudah lunas' }, { status: 400 })
    if (amount > remaining) return NextResponse.json({ success: false, error: `Maksimal pembayaran Rp ${remaining.toLocaleString('id-ID')}` }, { status: 400 })

    let walletAccount: WalletAccount | null = null
    if (walletAccountId) {
      const accSnap = await db.ref(`users/${userId}/walletAccounts/${walletAccountId}`).get()
      if (!accSnap.exists()) return NextResponse.json({ success: false, error: 'Akun tujuan tidak ditemukan' }, { status: 400 })
      walletAccount = accSnap.val() as WalletAccount
    }

    const now = new Date().toISOString()
    const paymentRef = db.ref(`users/${userId}/loanPayments/${params.id}`).push()
    const txRef = db.ref(`users/${userId}/transactions`).push()
    const paidAmount = Number(loan.paidAmount || 0) + amount
    const remainingAmount = Math.max(0, Number(loan.principalAmount || 0) - paidAmount)

    const payment: LoanPayment = {
      id: paymentRef.key!,
      userId,
      loanId: params.id,
      amount,
      paymentDate,
      wallet,
      ...(walletAccountId && { walletAccountId }),
      ...(walletAccount?.name && { walletAccountName: walletAccount.name }),
      ...(body.note && { note: String(body.note) }),
      transactionId: txRef.key!,
      createdAt: now,
    }

    const tx: Transaction = {
      id: txRef.key!,
      userId,
      type: 'loan_repayment',
      amount,
      categoryId: 'loan_repayment',
      categoryName: 'Bayar Piutang',
      categoryIcon: '💸',
      description: `${loan.personName} bayar piutang`,
      date: paymentDate,
      wallet,
      ...(walletAccountId && { walletAccountId }),
      loanId: params.id,
      loanPersonName: loan.personName,
      tags: ['loan', 'piutang', 'repayment'],
      createdAt: now,
      updatedAt: now,
    }

    const updates: Record<string, unknown> = {
      [`users/${userId}/loanPayments/${params.id}/${paymentRef.key}`]: payment,
      [`users/${userId}/transactions/${txRef.key}`]: tx,
      [`users/${userId}/loans/${params.id}/paidAmount`]: paidAmount,
      [`users/${userId}/loans/${params.id}/remainingAmount`]: remainingAmount,
      [`users/${userId}/loans/${params.id}/status`]: getStatus(remainingAmount, loan.dueDate),
      [`users/${userId}/loans/${params.id}/updatedAt`]: now,
    }
    if (walletAccountId && walletAccount) {
      updates[`users/${userId}/walletAccounts/${walletAccountId}/balance`] = Number(walletAccount.balance || 0) + amount
      updates[`users/${userId}/walletAccounts/${walletAccountId}/updatedAt`] = now
    }

    await db.ref().update(updates)
    return NextResponse.json({ success: true, data: payment })
  } catch (err) {
    console.error('[POST /api/loans/id/payments]', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
