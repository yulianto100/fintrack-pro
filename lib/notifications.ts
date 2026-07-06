import { getAdminDatabase } from './firebase-admin'
import { persistNotificationOnce } from './notifications-store'
import type { Deposit } from '@/types'

type UserData = {
  portfolio?: {
    deposits?: Record<string, Deposit>
  }
}

// web-push removed — no-op, returns false so callers skip push gracefully
export async function sendPushNotification(
  _userId: string,
  _title: string,
  _body: string,
  _data?: Record<string, unknown>
): Promise<boolean> {
  return false
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
      
      for (const [depositId, deposit] of Object.entries(deposits)) {
        if (deposit.status !== 'active') continue
        
        const maturityDate = new Date(deposit.maturityDate)
        maturityDate.setHours(0, 0, 0, 0)
        
        const daysUntilMaturity = Math.round(
          (maturityDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        )
        
        const notifSent = deposit.notificationSent || {}
        
        const milestones = [
          { days: 3, key: 'h3', msg: `Deposito ${deposit.bankName} jatuh tempo dalam 3 hari!` },
          { days: 2, key: 'h2', msg: `Deposito ${deposit.bankName} jatuh tempo dalam 2 hari!` },
          { days: 1, key: 'h1', msg: `Deposito ${deposit.bankName} jatuh tempo BESOK!` },
          { days: 0, key: 'h0', msg: `Deposito ${deposit.bankName} cair HARI INI! 🎉` },
        ]
        
        for (const milestone of milestones) {
          if (daysUntilMaturity === milestone.days && !(notifSent as Record<string, boolean>)[milestone.key]) {
            // Push removed; in-app notification persists via store
            try {
              await persistNotificationOnce(userId, `deposit_maturity_${depositId}_${milestone.days}`, {
                type: 'deposit_maturity',
                title: `Deposito ${deposit.bankName} jatuh tempo ${milestone.days === 0 ? 'hari ini' : `dalam ${milestone.days} hari`}`,
                message: `Nominal Rp ${deposit.nominal.toLocaleString('id-ID')} akan kembali ke saldo.`,
                icon: '🏦',
                link: '/portfolio/deposito',
              })
            } catch (err) {
              console.warn('[deposit notification persist]', err)
            }
            
            await db.ref(`users/${userId}/portfolio/deposits/${depositId}/notificationSent/${milestone.key}`).set(true)
          }
        }
        
        if (daysUntilMaturity < 0 && deposit.status === 'active') {
          await db.ref(`users/${userId}/portfolio/deposits/${depositId}/status`).set('matured')
        }
      }
    }
  } catch (error) {
    console.error('Error checking deposit notifications:', error)
  }
}
