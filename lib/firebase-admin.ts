import { App, cert, getApp, getApps, initializeApp } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'
import { getStorage } from 'firebase-admin/storage'

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
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  })
}

export function getAdminDatabase() {
  return getDatabase(getAdminApp())
}

export function getAdminStorageBucket() {
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  if (!bucketName) {
    throw new Error('Firebase storage bucket belum dikonfigurasi')
  }

  return getStorage(getAdminApp()).bucket(bucketName)
}
