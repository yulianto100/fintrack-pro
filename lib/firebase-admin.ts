import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'

let adminApp: App

export function getAdminApp(): App {
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
