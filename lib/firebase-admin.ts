import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'

let adminApp: App

function getAdminApp(): App {
  if (getApps().length === 0) {
    adminApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    })
  } else {
    adminApp = getApps()[0]
  }
  return adminApp
}

export function getAdminDatabase() {
  return getDatabase(getAdminApp())
}

// Helper: Get user-scoped database ref
export function getUserRef(userId: string, path: string) {
  const db = getAdminDatabase()
  return db.ref(`users/${userId}/${path}`)
}

// Helper: Get all data from a ref
export async function getRefData<T>(ref: ReturnType<typeof db.ref>): Promise<T | null> {
  const db = getAdminDatabase()
  const snapshot = await ref.get()
  if (!snapshot.exists()) return null
  return snapshot.val() as T
}
