import { App, cert, getApp, getApps, initializeApp } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'

function getAdminApp(): App {
  if (getApps().length > 0) return getApp()

  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '')
    .replace(/\\n/g, '\n')
    .replace(/^"/, '')
    .replace(/"$/, '')

  return initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  })
}

export function getAdminDatabase() {
  return getDatabase(getAdminApp())
}
