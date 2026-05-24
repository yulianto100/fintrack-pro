import { NextResponse } from 'next/server'
import { getAdminDatabase } from '@/lib/firebase-admin'
import { persistNotificationOnce } from '@/lib/notifications-store'
import type { Bill } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function parseDateKey(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const db = getAdminDatabase()
    const usersSnap = await db.ref('users').get()
    if (!usersSnap.exists()) return NextResponse.json({ success: true, processed: 0 })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let processed = 0

    const users = usersSnap.val() as Record<string, { bills?: Record<string, Bill> }>
    for (const [userId, userData] of Object.entries(users)) {
      const bills = userData.bills ? Object.values(userData.bills) : []
      for (const bill of bills) {
        if (bill.isPaid) continue

        const due = parseDateKey(bill.dueDate)
        due.setHours(0, 0, 0, 0)
        const days = Math.floor((due.getTime() - today.getTime()) / 86400000)
        if (days > 3 || days < -1) continue

        const title = days < 0
          ? `Tagihan ${bill.name} terlewat`
          : days === 0
            ? `Tagihan ${bill.name} jatuh tempo hari ini`
            : `Tagihan ${bill.name} ${days} hari lagi`

        await persistNotificationOnce(userId, `bill_${bill.id}_d${days}`, {
          type: 'bill_due',
          title,
          message: `Rp ${bill.amount.toLocaleString('id-ID')}`,
          icon: days < 0 ? '⚠️' : days === 0 ? '🔔' : '📅',
          link: '/goals?tab=bills',
        })
        processed++
      }
    }

    return NextResponse.json({ success: true, processed })
  } catch (err) {
    console.error('[GET /api/cron/bills]', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
