import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import { persistNotificationOnce } from '@/lib/notifications-store'
import type { UserStreak } from '@/types'

async function getUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions)
    const id = session?.user?.id
    if (!id || id === 'undefined' || id === 'null') return null
    return id
  } catch { return null }
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function emptyStreak(userId: string): UserStreak {
  return { userId, currentStreak: 0, bestStreak: 0, lastInputDate: '', updatedAt: '' }
}

// GET /api/streak — fetch current streak + check if txn exists today
export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const db         = getAdminDatabase()
    const streakSnap = await db.ref(`users/${userId}/streak`).get()
    const streak: UserStreak = streakSnap.exists() ? streakSnap.val() : emptyStreak(userId)

    // Check if user has any transaction today
    const today   = todayStr()
    const txSnap  = await db.ref(`users/${userId}/transactions`).orderByChild('date').equalTo(today).limitToFirst(1).get()
    const hasToday = txSnap.exists()

    return NextResponse.json({ success: true, data: { ...streak, hasToday } })
  } catch (err) {
    console.error('[GET /api/streak]', err)
    return NextResponse.json({
      success: true,
      data: { ...emptyStreak(userId), hasToday: false },
      warning: 'Streak sementara tidak tersedia',
    })
  }
}

// POST /api/streak — called after a transaction is added; recalculates streak
export async function POST() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const db         = getAdminDatabase()
    const today      = todayStr()
    const yesterday  = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    const streakSnap = await db.ref(`users/${userId}/streak`).get()
    const prev: UserStreak = streakSnap.exists() ? streakSnap.val() : emptyStreak(userId)

    // Already counted today — no change
    if (prev.lastInputDate === today) {
      return NextResponse.json({ success: true, data: prev })
    }

    let newStreak = 1
    if (prev.lastInputDate === yesterday) {
      newStreak = (prev.currentStreak || 0) + 1
    }

    const updated: UserStreak = {
      userId,
      currentStreak: newStreak,
      bestStreak:    Math.max(newStreak, prev.bestStreak || 0),
      lastInputDate: today,
      updatedAt:     new Date().toISOString(),
    }

    await db.ref(`users/${userId}/streak`).set(updated)

    try {
      const milestones = [3, 7, 14, 30, 100, 365]
      if (milestones.includes(updated.currentStreak)) {
        await persistNotificationOnce(userId, `streak_${updated.currentStreak}`, {
          type: 'streak_milestone',
          title: `Streak ${updated.currentStreak} hari! 🔥`,
          message: 'Pertahankan kebiasaan baik catat keuangan.',
          icon: '🔥',
        })
      }
    } catch (err) {
      console.warn('[streak notification persist]', err)
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (err) {
    console.error('[POST /api/streak]', err)
    return NextResponse.json({
      success: true,
      data: emptyStreak(userId),
      warning: 'Streak tidak tersimpan sementara',
    })
  }
}
