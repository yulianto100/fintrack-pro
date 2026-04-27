import { NextResponse } from 'next/server'
import { getAdminDatabase } from '@/lib/firebase-admin'
import type { RecurringTransaction, RecurringFrequency } from '@/types'

function nextRunDate(frequency: RecurringFrequency, from: Date = new Date()): string {
  const d = new Date(from)
  if (frequency === 'daily') d.setDate(d.getDate() + 1)
  else if (frequency === 'weekly') d.setDate(d.getDate() + 7)
  else d.setMonth(d.getMonth() + 1)
  return d.toISOString().split('T')[0]
}

// Cron endpoint — called by Vercel cron or external scheduler
// Processes all due recurring transactions and inserts them
export async function GET(req: Request) {
  // Simple auth: check cron secret
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const db = getAdminDatabase()
    const usersRef = db.ref('users')
    const usersSnap = await usersRef.get()
    if (!usersSnap.exists()) return NextResponse.json({ success: true, processed: 0 })

    const today = new Date().toISOString().split('T')[0]
    let processed = 0

    const users = usersSnap.val() as Record<string, Record<string, unknown>>
    for (const [userId, userData] of Object.entries(users)) {
      const recurring = (userData as { recurringTransactions?: Record<string, RecurringTransaction> }).recurringTransactions
      if (!recurring) continue

      for (const [recurId, item] of Object.entries(recurring)) {
        if (!item.isActive) continue
        if (item.nextRunDate > today) continue

        // Insert the transaction
        const txRef = db.ref(`users/${userId}/transactions`).push()
        const now = new Date().toISOString()
        await txRef.set({
          userId, type: item.type, amount: item.amount,
          categoryId: item.categoryId, categoryName: item.categoryName,
          categoryIcon: item.categoryIcon, description: `[Auto] ${item.description}`,
          date: today, wallet: item.wallet,
          walletAccountId: item.walletAccountId || null,
          tags: ['recurring'], createdAt: now, updatedAt: now,
        })

        // Update nextRunDate
        await db.ref(`users/${userId}/recurringTransactions/${recurId}`).update({
          nextRunDate: nextRunDate(item.frequency, new Date(today)),
          updatedAt: now,
        })

        processed++
      }
    }

    return NextResponse.json({ success: true, processed })
  } catch (err) {
    console.error('Cron recurring error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
