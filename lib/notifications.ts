import webpush from 'web-push'
import { getAdminDatabase } from './firebase-admin'

type StoredSubscription = {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

type UserData = {
  portfolio?: {
    deposits?: Record<string, any>
  }
}

type Deposit = {
  status: string
  maturityDate: string
  bankName: string
  notificationSent?: Record<string, boolean>
}

// Configure web-push
webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:admin@fintrackpro.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
)

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<boolean> {
  try {
    const db = getAdminDatabase()
    const subsRef = db.ref(`users/${userId}/pushSubscriptions`)
    const snapshot = await subsRef.get()
    
    if (!snapshot.exists()) return false
    
    const subscriptions = Object.values(snapshot.val()) as StoredSubscription[]
    const payload = JSON.stringify({
      title,
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: { url: '/portfolio/deposito', ...data },
    })
    
    const results = await Promise.allSettled(
  subscriptions.map((sub) => {
    // validasi dulu biar gak crash
    if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
      return Promise.reject('Invalid subscription format')
    }

    const pushSub: webpush.PushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      },
    }

    return webpush.sendNotification(pushSub, payload)
  })
)
    
    // Remove invalid subscriptions
    const subEntries = Object.entries(snapshot.val())
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const [key] = subEntries[index]
        db.ref(`users/${userId}/pushSubscriptions/${key}`).remove()
      }
    })
    
    return results.some((r) => r.status === 'fulfilled')
  } catch (error) {
    console.error('Push notification error:', error)
    return false
  }
}

export async function checkDepositNotifications(): Promise<void> {
  try {
    const db = getAdminDatabase()
    const usersRef = db.ref('users')
    const snapshot = await usersRef.get()
    if (!snapshot.exists()) return
    
    const users = snapshot.val()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    for (const [userId, userData] of Object.entries(users as Record<string, UserData>)) {
      const deposits = userData.portfolio?.deposits
      if (!deposits) continue
      
      for (const [depositId, deposit] of Object.entries(deposits as Record<string, Record<string, unknown>>)) {
        if (deposit.status !== 'active') continue
        
        const maturityDate = new Date(deposit.maturityDate as string)
        maturityDate.setHours(0, 0, 0, 0)
        
        const daysUntilMaturity = Math.round(
          (maturityDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        )
        
        const notifSent = deposit.notificationSent || {}
        
        // Check each notification milestone
        const milestones = [
          { days: 3, key: 'h3', msg: `Deposito ${deposit.bankName} jatuh tempo dalam 3 hari!` },
          { days: 2, key: 'h2', msg: `Deposito ${deposit.bankName} jatuh tempo dalam 2 hari!` },
          { days: 1, key: 'h1', msg: `Deposito ${deposit.bankName} jatuh tempo BESOK!` },
          { days: 0, key: 'h0', msg: `Deposito ${deposit.bankName} cair HARI INI! 🎉` },
        ]
        
        for (const milestone of milestones) {
          if (daysUntilMaturity === milestone.days && !(notifSent as Record<string, boolean>)[milestone.key]) {
            await sendPushNotification(
              userId,
              '🏦 Deposito Alert',
              milestone.msg,
              { depositId, daysRemaining: milestone.days }
            )
            
            // Mark as sent
            await db.ref(`users/${userId}/portfolio/deposits/${depositId}/notificationSent/${milestone.key}`).set(true)
          }
        }
        
        // Move to history if matured
        if (daysUntilMaturity < 0 && deposit.status === 'active') {
          await db.ref(`users/${userId}/portfolio/deposits/${depositId}/status`).set('matured')
        }
      }
    }
  } catch (error) {
    console.error('Error checking deposit notifications:', error)
  }
}
