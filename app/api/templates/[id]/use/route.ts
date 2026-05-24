import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import type { Transaction, TransactionTemplate } from '@/types'

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

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const db = getAdminDatabase()
    const tplRef = db.ref(`users/${userId}/templates/${params.id}`)
    const tplSnap = await tplRef.get()
    if (!tplSnap.exists()) {
      return NextResponse.json({ success: false, error: 'Pintasan tidak ditemukan' }, { status: 404 })
    }

    const tpl = tplSnap.val() as TransactionTemplate
    const txRef = db.ref(`users/${userId}/transactions`).push()
    const now = new Date().toISOString()
    const today = now.split('T')[0]
    const tx: Transaction = {
      id: txRef.key!,
      userId,
      type: tpl.type,
      amount: tpl.amount,
      categoryId: tpl.categoryId,
      categoryName: tpl.categoryName,
      categoryIcon: tpl.categoryIcon,
      description: tpl.description,
      date: today,
      wallet: tpl.wallet,
      walletAccountId: tpl.walletAccountId,
      createdAt: now,
      updatedAt: now,
    }

    await db.ref().update({
      [`users/${userId}/transactions/${txRef.key}`]: tx,
      [`users/${userId}/templates/${params.id}/useCount`]: (tpl.useCount || 0) + 1,
      [`users/${userId}/templates/${params.id}/lastUsedAt`]: now,
      [`users/${userId}/templates/${params.id}/updatedAt`]: now,
    })

    return NextResponse.json({ success: true, data: tx })
  } catch (err) {
    console.error('[POST /api/templates/[id]/use]', err)
    return NextResponse.json({ success: false, error: 'Gagal memakai pintasan' }, { status: 500 })
  }
}
