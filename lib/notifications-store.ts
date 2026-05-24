import { getAdminDatabase } from './firebase-admin'
import type { Notification } from '@/types'

type NotificationDraft = Omit<Notification, 'id' | 'userId' | 'read' | 'createdAt'>

export async function persistNotification(
  userId: string,
  data: NotificationDraft,
): Promise<string> {
  const db = getAdminDatabase()
  const ref = db.ref(`users/${userId}/notifications`).push()
  const id = ref.key!
  const notification: Notification = {
    ...data,
    id,
    userId,
    read: false,
    createdAt: new Date().toISOString(),
  }

  await ref.set(notification)
  return id
}

export async function persistNotificationOnce(
  userId: string,
  dedupeKey: string,
  data: NotificationDraft,
): Promise<string | null> {
  const db = getAdminDatabase()
  const indexRef = db.ref(`users/${userId}/notificationIndex/${dedupeKey}`)
  const existing = await indexRef.get()
  if (existing.exists()) return null

  const id = await persistNotification(userId, data)
  await indexRef.set({ id, at: new Date().toISOString() })
  return id
}
