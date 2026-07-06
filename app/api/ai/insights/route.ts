import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import { detectAnomalies } from '@/lib/anomaly-detection'
import { generateSavingTips } from '@/lib/saving-tips'
import type { Transaction } from '@/types'

/**
 * GET /api/ai/insights
 * Returns AI-powered insights: anomalies + saving tips
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const db = getAdminDatabase()
    const userId = session.user.id

    // Fetch transactions
    const txSnap = await db.ref(`users/${userId}/transactions`).get()
    const transactions: Transaction[] = txSnap.exists()
      ? Object.values(txSnap.val())
      : []

    // Run anomaly detection
    const anomalies = detectAnomalies(transactions)

    // Generate saving tips
    const tips = generateSavingTips(transactions)

    return NextResponse.json({
      success: true,
      data: {
        anomalies,
        tips,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (err) {
    console.error('[GET /api/ai/insights]', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
