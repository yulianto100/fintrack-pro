import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import type { TransactionTemplate, WalletType } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions)
    const id = session?.user?.id
    if (!id || id === 'undefined' || id === 'null') return null
    return id
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function getWallet(value: unknown): WalletType | undefined {
  return value === 'cash' || value === 'bank' || value === 'ewallet' ? value : undefined
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const db = getAdminDatabase()
    const snap = await db.ref(`users/${userId}/templates`).get()
    if (!snap.exists()) return NextResponse.json({ success: true, data: [] })

    const list: TransactionTemplate[] = Object.entries(snap.val() as Record<string, TransactionTemplate>)
      .map(([key, template]) => ({ ...template, id: template.id || key }))
      .sort((a, b) => {
        if (b.useCount !== a.useCount) return b.useCount - a.useCount
        return new Date(b.lastUsedAt || b.createdAt).getTime() - new Date(a.lastUsedAt || a.createdAt).getTime()
      })
      .slice(0, 12)

    return NextResponse.json({ success: true, data: list })
  } catch (err) {
    console.error('[GET /api/templates]', err)
    return NextResponse.json({ success: false, error: 'Gagal mengambil pintasan' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body: unknown = await request.json()
    if (!isRecord(body)) {
      return NextResponse.json({ success: false, error: 'Data tidak valid' }, { status: 400 })
    }

    const type = body.type === 'income' || body.type === 'expense' ? body.type : null
    const amount = Number(body.amount)
    const categoryId = getString(body.categoryId)
    const description = getString(body.description) || ''

    if (!type) return NextResponse.json({ success: false, error: 'Tipe wajib diisi' }, { status: 400 })
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Jumlah tidak valid' }, { status: 400 })
    }
    if (!categoryId) return NextResponse.json({ success: false, error: 'Kategori wajib diisi' }, { status: 400 })

    const db = getAdminDatabase()
    const ref = db.ref(`users/${userId}/templates`).push()
    const now = new Date().toISOString()
    const categoryIcon = getString(body.categoryIcon)
    const template: TransactionTemplate = {
      id: ref.key!,
      userId,
      type,
      amount,
      categoryId,
      categoryName: getString(body.categoryName),
      categoryIcon,
      description,
      wallet: getWallet(body.wallet),
      walletAccountId: getString(body.walletAccountId),
      emoji: getString(body.emoji) || categoryIcon || '⚡',
      createdAt: now,
      updatedAt: now,
      useCount: 0,
    }

    await ref.set(template)
    return NextResponse.json({ success: true, data: template })
  } catch (err) {
    console.error('[POST /api/templates]', err)
    return NextResponse.json({ success: false, error: 'Gagal membuat pintasan' }, { status: 500 })
  }
}
