import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminApp } from '@/lib/firebase-admin'
import { getAuth } from 'firebase-admin/auth'

// Client calls this after NextAuth login to get a Firebase custom token.
// Then client signs into Firebase SDK with this token, enabling
// Realtime Database reads/writes that respect security rules.
export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const adminAuth = getAuth(getAdminApp())
    const firebaseToken = await adminAuth.createCustomToken(session.user.id)
    return NextResponse.json({ token: firebaseToken })
  } catch (error) {
    console.error('Firebase custom token error:', error)
    return NextResponse.json({ error: 'Failed to create token' }, { status: 500 })
  }
}
