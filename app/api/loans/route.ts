import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import type { Loan, Transaction, WalletAccount } from '@/types'

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

function getLoanStatus(remainingAmount: number, dueDate?: string): Loan['status'] {
  if (remainingAmount <= 0) return 'paid'
  if (dueDate && dueDate < todayIso()) return 'overdue'
  return 'active'
}

async function getWalletAccount(db: ReturnType<typeof getAdminDatabase>, userId: string, walletAccountId?: string) {
  if (!walletAccountId) return null
  const snap = await db.ref(`users/${userId}/walletAccounts/${walletAccountId}`).get()
  if (!snap.exists()) return null
  return snap.val() as WalletAccount
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const db = getAdminDatabase()
    const snap = await db.ref(`users/${userId}/loans`).get()
    if (!snap.exists()) return NextResponse.json({ success: true, data: [] })

    const loans: Loan[] = Object.entries(snap.val() as Record<string, Loan>)
      .map(([id, loan]) => ({
        ...loan,
        id: loan.id || id,
        status: loan.status === 'written_off' ? 'written_off' : getLoanStatus(Number(loan.remainingAmount || 0), loan.dueDate),
      }))
      .sort((a, b) => {
        const activeRank = (l: Loan) => l.status === 'active' || l.status === 'overdue' ? 0 : 1
        return activeRank(a) - activeRank(b) || new Date(b.loanDate || b.createdAt || '').getTime() - new Date(a.loanDate || a.createdAt || '').getTime()
      })

    return NextResponse.json({ success: true, data: loans })
  } catch (err) {
    console.error('[GET /api/loans]', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const personName = String(body.personName || '').trim()
    const principalAmount = Number(body.principalAmount || body.amount || 0)
    const loanDate = body.loanDate || todayIso()
    const wallet = body.wallet || 'cash'
    const walletAccountId = body.walletAccountId || ''

    if (!personName) return NextResponse.json({ success: false, error: 'Nama peminjam wajib diisi' }, { status: 400 })
    if (!Number.isFinite(principalAmount) || principalAmount <= 0) return NextResponse.json({ success: false, error: 'Nominal tidak valid' }, { status: 400 })
    if (!loanDate) return NextResponse.json({ success: false, error: 'Tanggal pinjam wajib diisi' }, { status: 400 })

    const db = getAdminDatabase()
    const walletAccount = await getWalletAccount(db, userId, walletAccountId)
    if (walletAccountId && !walletAccount) return NextResponse.json({ success: false, error: 'Akun asal tidak ditemukan' }, { status: 400 })
    if (walletAccount && Number(walletAccount.balance || 0) < principalAmount) {
      return NextResponse.json({
        success: false,
        error: `Saldo tidak cukup. Saldo tersedia: Rp ${Number(walletAccount.balance || 0).toLocaleString('id-ID')}`,
      }, { status: 400 })
    }

    const now = new Date().toISOString()
    const loanRef = db.ref(`users/${userId}/loans`).push()
    const txRef = db.ref(`users/${userId}/transactions`).push()

    const loan: Loan = {
      id: loanRef.key!,
      userId,
      personName,
      principalAmount,
      paidAmount: 0,
      remainingAmount: principalAmount,
      status: getLoanStatus(principalAmount, body.dueDate || undefined),
      loanDate,
      ...(body.dueDate && { dueDate: body.dueDate }),
      ...(body.note && { note: String(body.note) }),
      wallet,
      ...(walletAccountId && { walletAccountId }),
      ...(walletAccount?.name && { walletAccountName: walletAccount.name }),
      transactionId: txRef.key!,
      createdAt: now,
      updatedAt: now,
    }

    const tx: Transaction = {
      id: txRef.key!,
      userId,
      type: 'loan_given',
      amount: principalAmount,
      categoryId: 'loan_given',
      categoryName: 'Piutang',
      categoryIcon: '🤝',
      description: `Pinjam ke ${personName}`,
      date: loanDate,
      wallet,
      ...(walletAccountId && { walletAccountId }),
      loanId: loanRef.key!,
      loanPersonName: personName,
      tags: ['loan', 'piutang'],
      createdAt: now,
      updatedAt: now,
    }

    const updates: Record<string, unknown> = {
      [`users/${userId}/loans/${loanRef.key}`]: loan,
      [`users/${userId}/transactions/${txRef.key}`]: tx,
    }
    if (walletAccountId && walletAccount) {
      updates[`users/${userId}/walletAccounts/${walletAccountId}/balance`] = Number(walletAccount.balance || 0) - principalAmount
      updates[`users/${userId}/walletAccounts/${walletAccountId}/updatedAt`] = now
    }

    await db.ref().update(updates)
    return NextResponse.json({ success: true, data: loan }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/loans]', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
