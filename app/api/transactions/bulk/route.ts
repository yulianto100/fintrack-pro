import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase, getAdminStorageBucket } from '@/lib/firebase-admin'
import type { Transaction } from '@/types'

export const runtime = 'nodejs'

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

function getIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

export async function DELETE(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const ids = getIds((body as { ids?: unknown })?.ids)
    if (ids.length === 0) return NextResponse.json({ success: false, error: 'Pilih transaksi dulu' }, { status: 400 })

    const db = getAdminDatabase()
    let deleted = 0
    const failed: string[] = []
    let bucket: ReturnType<typeof getAdminStorageBucket> | null = null

    try {
      bucket = getAdminStorageBucket()
    } catch {
      bucket = null
    }

    for (const id of ids) {
      try {
        const ref = db.ref(`users/${userId}/transactions/${id}`)
        const snap = await ref.get()
        if (!snap.exists()) continue

        const tx = snap.val() as Transaction
        if (bucket && tx.attachmentPath?.startsWith(`users/${userId}/transactions/${id}/`)) {
          try {
            await bucket.file(tx.attachmentPath).delete({ ignoreNotFound: true })
          } catch {
            // Storage cleanup should not block the transaction delete.
          }
        }

        if (tx.type === 'credit_expense' && tx.creditCardId) {
          const ccSnap = await db.ref(`users/${userId}/creditCards/${tx.creditCardId}`).get()
          if (ccSnap.exists()) {
            const cc = ccSnap.val() as { used?: number }
            await db.ref().update({
              [`users/${userId}/transactions/${id}`]: null,
              [`users/${userId}/creditCards/${tx.creditCardId}/used`]: Math.max(0, Number(cc.used || 0) - tx.amount),
              [`users/${userId}/creditCards/${tx.creditCardId}/updatedAt`]: new Date().toISOString(),
            })
            deleted++
            continue
          }
        }

        await ref.remove()
        deleted++
      } catch (error) {
        failed.push(id)
        console.warn(`[bulk delete] gagal ${id}`, error)
      }
    }

    return NextResponse.json({ success: true, data: { deleted, failed } })
  } catch (err) {
    console.error('[DELETE /api/transactions/bulk]', err)
    return NextResponse.json({ success: false, error: 'Gagal menghapus transaksi' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const payload = body as { ids?: unknown; categoryId?: unknown }
    const ids = getIds(payload.ids)
    const categoryId = typeof payload.categoryId === 'string' ? payload.categoryId : null

    if (ids.length === 0 || !categoryId) {
      return NextResponse.json({ success: false, error: 'Transaksi dan kategori wajib dipilih' }, { status: 400 })
    }

    const db = getAdminDatabase()
    const catSnap = await db.ref(`users/${userId}/categories/${categoryId}`).get()
    if (!catSnap.exists()) {
      return NextResponse.json({ success: false, error: 'Kategori tidak ditemukan' }, { status: 404 })
    }

    const cat = catSnap.val() as { name?: string; icon?: string }
    const now = new Date().toISOString()
    let updated = 0
    const failed: string[] = []

    for (const id of ids) {
      try {
        const ref = db.ref(`users/${userId}/transactions/${id}`)
        const snap = await ref.get()
        if (!snap.exists()) {
          failed.push(id)
          continue
        }

        await ref.update({
          categoryId,
          categoryName: cat.name || '',
          categoryIcon: cat.icon || '',
          updatedAt: now,
        })
        updated++
      } catch (error) {
        failed.push(id)
        console.warn(`[bulk recategorize] gagal ${id}`, error)
      }
    }

    return NextResponse.json({ success: true, data: { updated, failed } })
  } catch (err) {
    console.error('[PATCH /api/transactions/bulk]', err)
    return NextResponse.json({ success: false, error: 'Gagal mengubah kategori' }, { status: 500 })
  }
}
