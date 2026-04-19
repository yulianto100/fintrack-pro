import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { getAdminDatabase } from './firebase-admin'
import bcrypt from 'bcryptjs'

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
export async function ensureUserSetup(userId: string, profile: {
  email?: string | null
  name?: string | null
  image?: string | null
}) {
  const db = getAdminDatabase()
  const userRef = db.ref(`users/${userId}/profile`)
  const snap = await userRef.get()

  if (!snap.exists()) {
    await userRef.set({
      id: userId,
      email: profile.email ?? '',
      name: profile.name ?? '',
      image: profile.image ?? '',
      createdAt: new Date().toISOString(),
    })
    await createDefaultCategories(userId)
  } else {
    await userRef.update({
      lastLogin: new Date().toISOString(),
      ...(profile.name  && { name:  profile.name  }),
      ...(profile.image && { image: profile.image }),
    })
  }
}

async function createDefaultCategories(userId: string) {
  const db = getAdminDatabase()
  const ref = db.ref(`users/${userId}/categories`)

  const defaults = [
    { name: 'Gaji',        icon: '💼', type: 'income',  color: '#22c55e' },
    { name: 'Freelance',   icon: '💻', type: 'income',  color: '#3b82f6' },
    { name: 'Investasi',   icon: '📈', type: 'income',  color: '#a855f7' },
    { name: 'Bonus',       icon: '🎁', type: 'income',  color: '#f59e0b' },
    { name: 'Lainnya',     icon: '💰', type: 'income',  color: '#6b7280' },
    { name: 'Makan & Minum',icon:'🍜', type: 'expense', color: '#ef4444' },
    { name: 'Transport',   icon: '🚗', type: 'expense', color: '#f97316' },
    { name: 'Belanja',     icon: '🛍️', type: 'expense', color: '#ec4899' },
    { name: 'Tagihan',     icon: '📱', type: 'expense', color: '#8b5cf6' },
    { name: 'Kesehatan',   icon: '🏥', type: 'expense', color: '#14b8a6' },
    { name: 'Hiburan',     icon: '🎬', type: 'expense', color: '#f59e0b' },
    { name: 'Pendidikan',  icon: '📚', type: 'expense', color: '#3b82f6' },
    { name: 'Tabungan',    icon: '🏦', type: 'expense', color: '#22c55e' },
    { name: 'Lainnya',     icon: '📋', type: 'expense', color: '#6b7280' },
  ]

  const batch: Record<string, object> = {}
  defaults.forEach((cat) => {
    const key = ref.push().key!
    batch[key] = { ...cat, id: key, userId, createdAt: new Date().toISOString() }
  })
  await ref.set(batch)
}

// ─────────────────────────────────────────────
// NextAuth config
// ─────────────────────────────────────────────
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    CredentialsProvider({
      id: 'credentials',
      name: 'Email & Password',
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
        otp:      { label: 'OTP',      type: 'text'     },
        deviceId: { label: 'DeviceId', type: 'text'     },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const db  = getAdminDatabase()
        const email = credentials.email.toLowerCase().trim()

        // Find user by email
        const usersSnap = await db.ref('users').orderByChild('profile/email').equalTo(email).get()
        if (!usersSnap.exists()) return null

        const users = Object.values(usersSnap.val()) as Record<string, unknown>[]
        const userData = users[0] as { profile?: Record<string, unknown>; auth?: Record<string, unknown> }
        if (!userData?.auth) return null

        const { passwordHash, uid } = userData.auth as { passwordHash: string; uid: string }

        // Check password
        const valid = await bcrypt.compare(credentials.password, passwordHash)
        if (!valid) return null

        // Check if this deviceId is trusted
        const deviceId = credentials.deviceId || ''
        const trustedSnap = await db.ref(`users/${uid}/trustedDevices/${deviceId}`).get()
        const isTrusted = trustedSnap.exists()

        if (!isTrusted) {
          // Require OTP
          if (!credentials.otp) {
            // Signal frontend to ask for OTP (throw special error)
            throw new Error('OTP_REQUIRED')
          }
          // Verify OTP
          const otpSnap = await db.ref(`users/${uid}/otp`).get()
          if (!otpSnap.exists()) throw new Error('OTP kadaluarsa, minta OTP baru')
          const { code, expiresAt } = otpSnap.val() as { code: string; expiresAt: number }
          if (Date.now() > expiresAt) throw new Error('OTP kadaluarsa')
          if (code !== credentials.otp.trim()) throw new Error('OTP tidak valid')

          // Trust this device
          await db.ref(`users/${uid}/trustedDevices/${deviceId}`).set({
            trusted: true, addedAt: new Date().toISOString(),
          })
          // Delete OTP
          await db.ref(`users/${uid}/otp`).remove()
        }

        const profile = userData.profile as Record<string, string>
        return { id: uid, email, name: profile.username || email, image: null }
      },
    }),
  ],

  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },

  callbacks: {
    async jwt({ token, user, account }) {
      // On every sign-in, persist the user's ID into the token
      if (user?.id) token.uid = user.id
      if (account?.providerAccountId && !token.uid) token.uid = account.providerAccountId
      // Fallback: token.sub is set by NextAuth from Google's sub claim
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        // Use our explicit uid, then sub as fallback
        session.user.id = (token.uid as string) || token.sub || ''
      }
      return session
    },
    async signIn({ user, account, profile: oAuthProfile }) {
      // Google OAuth — setup user on first login
      if (account?.provider === 'google') {
        // For Google, uid = providerAccountId (stable Google sub)
        const uid = account.providerAccountId
        // Patch user.id so JWT callback gets it
        user.id = uid
        try {
          await ensureUserSetup(uid, {
            email: user.email,
            name:  user.name,
            image: user.image,
          })
        } catch (err) {
          console.error('[signIn] ensureUserSetup failed:', err)
          // Don't block login — Firebase issue shouldn't lock users out
        }
      }
      return true
    },
  },

  pages: { signIn: '/login', error: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
}
