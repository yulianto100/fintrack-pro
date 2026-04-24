import { NextResponse } from 'next/server'
import { checkDepositNotifications } from '@/lib/notifications'

// This route is called by Vercel Cron Jobs
// Add to vercel.json:
// { "crons": [{ "path": "/api/cron/deposits", "schedule": "0 8 * * *" }] }

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await checkDepositNotifications()
    return NextResponse.json({ success: true, checkedAt: new Date().toISOString() })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
