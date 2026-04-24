import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import type { WalletAccount } from '@/types'

async function getUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions)
    const id = session?.user?.id
    if (!id || id === 'undefined' || id === 'null') return null
    return id
  } catch { return null }
}

// GET /api/wallet-accounts?type=bank|ewallet
export async function GET(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') // optional filter

  try {
    const db   = getAdminDatabase()
    const snap = await db.ref(`users/${userId}/walletAccounts`).get()

    if (!snap.exists()) return NextResponse.json({ success: true, data: [] })

    let accounts: WalletAccount[] = Object.values(snap.val())
    if (type) accounts = accounts.filter((a) => a.type === type)
    accounts.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    return NextResponse.json({ success: true, data: accounts })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

// POST /api/wallet-accounts
export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { type, name } = body

    if (!type || !['bank', 'ewallet'].includes(type))
      return NextResponse.json({ success: false, error: 'Tipe akun tidak valid (bank/ewallet)' }, { status: 400 })
    if (!name?.trim())
      return NextResponse.json({ success: false, error: 'Nama akun wajib diisi' }, { status: 400 })

    const db     = getAdminDatabase()
    const ref    = db.ref(`users/${userId}/walletAccounts`)
    const newRef = ref.push()
    const now    = new Date().toISOString()

    const account: WalletAccount = {
      id:        newRef.key!,
      userId,
      type,
      name:      name.trim(),
      balance:   0,
      createdAt: now,
      updatedAt: now,
    }

    await newRef.set(account)
    return NextResponse.json({ success: true, data: account }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
