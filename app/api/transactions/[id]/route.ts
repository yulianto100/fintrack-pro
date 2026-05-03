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

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const db   = getAdminDatabase()
    const ref  = db.ref(`users/${userId}/transactions/${params.id}`)

    const snap = await ref.get()
    if (!snap.exists()) return NextResponse.json({ success: false, error: 'Transaksi tidak ditemukan' }, { status: 404 })

    const original: Transaction = snap.val()

    // ── Resolve effective type ────────────────────────────────────────────────
    // If original was credit_expense OR client sends expense+credit_card,
    // preserve the credit_expense type so it stays excluded from wallet balance.
    const isCreditCardEdit =
      original.type === 'credit_expense' ||
      (body.type === 'expense' && body.paymentMethod === 'credit_card')

    const resolvedType = isCreditCardEdit ? 'credit_expense' : (body.type || original.type)

    // ── Build update payload ──────────────────────────────────────────────────
    const updatePayload: Record<string, unknown> = {
      ...body,
      type: resolvedType,
      updatedAt: new Date().toISOString(),
    }

    // Resolve categoryName & categoryIcon when categoryId changes
    if (body.categoryId && body.categoryId !== 'transfer') {
      try {
        const catSnap = await db.ref(`users/${userId}/categories/${body.categoryId}`).get()
        if (catSnap.exists()) {
          const cat = catSnap.val()
          updatePayload.categoryName = cat.name || ''
          updatePayload.categoryIcon = cat.icon || ''
        }
      } catch { /* keep existing values if lookup fails */ }
    } else if (body.categoryId === 'transfer') {
      updatePayload.categoryName = 'Transfer'
      updatePayload.categoryIcon = '🔄'
    }

    // ── Update credit card used amount if amount changed ──────────────────────
    // Only for credit_expense edits where amount actually changed.
    const dbUpdates: Record<string, unknown> = {
      [`users/${userId}/transactions/${params.id}`]: { ...original, ...updatePayload },
    }

    if (isCreditCardEdit) {
      const newCreditCardId = body.creditCardId || original.creditCardId
      const oldCreditCardId = original.creditCardId
      const newAmount       = body.amount !== undefined ? Number(body.amount) : original.amount
      const oldAmount       = original.amount

      if (newCreditCardId && (newCreditCardId !== oldCreditCardId || newAmount !== oldAmount)) {
        // If target card changed, refund old card and charge new card
        if (oldCreditCardId && oldCreditCardId !== newCreditCardId) {
          const oldCcSnap = await db.ref(`users/${userId}/creditCards/${oldCreditCardId}`).get()
          if (oldCcSnap.exists()) {
            const oldCc   = oldCcSnap.val()
            const refunded = Math.max(0, Number(oldCc.used || 0) - oldAmount)
            dbUpdates[`users/${userId}/creditCards/${oldCreditCardId}/used`]      = refunded
            dbUpdates[`users/${userId}/creditCards/${oldCreditCardId}/updatedAt`] = new Date().toISOString()
          }
          const newCcSnap = await db.ref(`users/${userId}/creditCards/${newCreditCardId}`).get()
          if (newCcSnap.exists()) {
            const newCc    = newCcSnap.val()
            const charged  = Number(newCc.used || 0) + newAmount
            dbUpdates[`users/${userId}/creditCards/${newCreditCardId}/used`]      = charged
            dbUpdates[`users/${userId}/creditCards/${newCreditCardId}/updatedAt`] = new Date().toISOString()
          }
        } else {
          // Same card, only amount changed
          const amountDelta = newAmount - oldAmount
          if (amountDelta !== 0) {
            const ccSnap = await db.ref(`users/${userId}/creditCards/${newCreditCardId}`).get()
            if (ccSnap.exists()) {
              const cc      = ccSnap.val()
              const newUsed = Math.max(0, Number(cc.used || 0) + amountDelta)
              dbUpdates[`users/${userId}/creditCards/${newCreditCardId}/used`]      = newUsed
              dbUpdates[`users/${userId}/creditCards/${newCreditCardId}/updatedAt`] = new Date().toISOString()
            }
          }
        }
      }

      // Also carry over credit card fields from original if not provided in body
      if (!updatePayload.creditCardId && original.creditCardId) {
        updatePayload.creditCardId   = original.creditCardId
        updatePayload.creditCardName = original.creditCardName
      }
      // Ensure paymentMethod is correct
      updatePayload.paymentMethod = 'credit_card'
    }

    // ── Handle credit card payment (transfer) edits ───────────────────────────
    // When a CC bill payment is edited, the target card may change — update tags accordingly
    const isCCPaymentEdit =
      original.type === 'transfer' &&
      (original.categoryId === 'credit_card_payment' || original.tags?.includes('credit_card_payment'))

    if (isCCPaymentEdit && body.creditCardId) {
      // Rebuild tags to reference the new target card
      updatePayload.tags = ['credit_card_payment', `cc_${body.creditCardId}`]
      // Update creditCard used: refund old card, charge new card
      const newCreditCardId = body.creditCardId
      const oldCreditCardId = original.creditCardId
      const newAmount       = body.amount !== undefined ? Number(body.amount) : original.amount
      const oldAmount       = original.amount

      if (oldCreditCardId && oldCreditCardId !== newCreditCardId) {
        // Card changed: refund old, charge new
        const oldCcSnap = await db.ref(`users/${userId}/creditCards/${oldCreditCardId}`).get()
        if (oldCcSnap.exists()) {
          const oldCc = oldCcSnap.val()
          dbUpdates[`users/${userId}/creditCards/${oldCreditCardId}/used`]      = Math.max(0, Number(oldCc.used || 0) - oldAmount)
          dbUpdates[`users/${userId}/creditCards/${oldCreditCardId}/updatedAt`] = new Date().toISOString()
        }
        const newCcSnap = await db.ref(`users/${userId}/creditCards/${newCreditCardId}`).get()
        if (newCcSnap.exists()) {
          const newCc = newCcSnap.val()
          dbUpdates[`users/${userId}/creditCards/${newCreditCardId}/used`]      = Math.max(0, Number(newCc.used || 0) - newAmount)
          dbUpdates[`users/${userId}/creditCards/${newCreditCardId}/updatedAt`] = new Date().toISOString()
        }
      } else if (oldCreditCardId && newAmount !== oldAmount) {
        // Same card, amount changed: adjust used by delta
        const ccSnap = await db.ref(`users/${userId}/creditCards/${oldCreditCardId}`).get()
        if (ccSnap.exists()) {
          const cc = ccSnap.val()
          // Payment = reduces used. More payment = reduce more; less payment = reduce less.
          const newUsed = Math.max(0, Number(cc.used || 0) + (oldAmount - newAmount))
          dbUpdates[`users/${userId}/creditCards/${oldCreditCardId}/used`]      = newUsed
          dbUpdates[`users/${userId}/creditCards/${oldCreditCardId}/updatedAt`] = new Date().toISOString()
        }
      }
    }

    // Commit atomically
    await db.ref().update(dbUpdates)

    const updated = await ref.get()
    return NextResponse.json({ success: true, data: updated.val() })
  } catch (err) {
    console.error('[PATCH /api/transactions/id]', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const db  = getAdminDatabase()
    const ref = db.ref(`users/${userId}/transactions/${params.id}`)

    // If deleting a credit_expense, also reduce the card's used amount
    const snap = await ref.get()
    if (snap.exists()) {
      const tx: Transaction = snap.val()
      if (tx.type === 'credit_expense' && tx.creditCardId) {
        const ccSnap = await db.ref(`users/${userId}/creditCards/${tx.creditCardId}`).get()
        if (ccSnap.exists()) {
          const cc    = ccSnap.val()
          const newUsed = Math.max(0, Number(cc.used || 0) - tx.amount)
          await db.ref().update({
            [`users/${userId}/transactions/${params.id}`]: null,
            [`users/${userId}/creditCards/${tx.creditCardId}/used`]: newUsed,
            [`users/${userId}/creditCards/${tx.creditCardId}/updatedAt`]: new Date().toISOString(),
          })
          return NextResponse.json({ success: true })
        }
      }
    }

    await ref.remove()
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/transactions/id]', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
