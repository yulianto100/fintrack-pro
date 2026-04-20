import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { getAdminDatabase } from './firebase-admin'
import bcrypt from 'bcryptjs'

// ─── User setup ───────────────────────────────────────────────────────────────
export async function ensureUserSetup(uid: string, data: {
  email?: string | null; name?: string | null; image?: string | null
}) {
  try {
    const db   = getAdminDatabase()
    const ref  = db.ref(`users/${uid}/profile`)
    const snap = await ref.get()
    if (!snap.exists()) {
      await ref.set({
        id: uid, email: data.email ?? '', name: data.name ?? '',
        image: data.image ?? '', createdAt: new Date().toISOString(),
      })
      await createDefaultCategories(uid)
    } else {
      const upd: Record<string, string> = { lastLogin: new Date().toISOString() }
      if (data.name)  upd.name  = data.name
      if (data.image) upd.image = data.image
      await ref.update(upd)
    }
  } catch (err) {
    console.error('[ensureUserSetup]', err)
  }
}

async function createDefaultCategories(uid: string) {
  const db  = getAdminDatabase()
  const ref = db.ref(`users/${uid}/categories`)
  const defaults = [
    { name: 'Gaji',          icon: '💼', type: 'income',  color: '#34d36e' },
    { name: 'Freelance',     icon: '💻', type: 'income',  color: '#63b3ed' },
    { name: 'Investasi',     icon: '📈', type: 'income',  color: '#d6aaff' },
    { name: 'Bonus',         icon: '🎁', type: 'income',  color: '#f6cc60' },
    { name: 'Lainnya',       icon: '💰', type: 'income',  color: '#68d391' },
    { name: 'Makan & Minum', icon: '🍜', type: 'expense', color: '#fc8181' },
    { name: 'Transport',     icon: '🚗', type: 'expense', color: '#f6ad55' },
    { name: 'Belanja',       icon: '🛍️', type: 'expense', color: '#f687b3' },
    { name: 'Tagihan',       icon: '📱', type: 'expense', color: '#b794f4' },
    { name: 'Kesehatan',     icon: '🏥', type: 'expense', color: '#4fd1c5' },
    { name: 'Hiburan',       icon: '🎬', type: 'expense', color: '#fbd38d' },
    { name: 'Pendidikan',    icon: '📚', type: 'expense', color: '#63b3ed' },
    { name: 'Tabungan',      icon: '🏦', type: 'expense', color: '#34d36e' },
    { name: 'Lainnya',       icon: '📋', type: 'expense', color: '#718096' },
  ]
  const batch: Record<string, object> = {}
  defaults.forEach((cat) => {
    const key = ref.push().key!
    batch[key] = { ...cat, id: key, userId: uid, createdAt: new Date().toISOString() }
  })
  await ref.set(batch)
}

// ─── NextAuth ─────────────────────────────────────────────────────────────────
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    CredentialsProvider({
      id: 'credentials',
      name: 'Email & Password',
      credentials: {
        identifier: { label: 'Email atau Username', type: 'text'     },
        password:   { label: 'Password',            type: 'password' },
      },
      async authorize(creds) {
        if (!creds?.identifier || !creds?.password) return null

        const db         = getAdminDatabase()
        const identifier = creds.identifier.trim()
        const isEmail    = identifier.includes('@')

        let uid: string | null = null

        if (isEmail) {
          // Lookup via emailIndex (flat, no orderByChild needed)
          const emailKey = identifier.toLowerCase().replace(/\./g, '_dot_').replace(/@/g, '_at_')
          const snap = await db.ref(`emailIndex/${emailKey}`).get()
          if (snap.exists()) uid = snap.val() as string
        } else {
          // Lookup via usernameIndex
          const snap = await db.ref(`usernameIndex/${identifier}`).get()
          if (snap.exists()) uid = snap.val() as string
        }

        if (!uid) throw new Error('Email atau username tidak ditemukan')

        const authSnap = await db.ref(`users/${uid}/auth`).get()
        if (!authSnap.exists()) throw new Error('Data akun tidak ditemukan')

        const auth = authSnap.val() as { passwordHash?: string; username?: string; email?: string }
        if (!auth.passwordHash) throw new Error('Akun ini tidak memiliki password. Gunakan login Google.')

        const valid = await bcrypt.compare(creds.password, auth.passwordHash)
        if (!valid) throw new Error('Password salah')

        const profileSnap = await db.ref(`users/${uid}/profile`).get()
        const profile     = profileSnap.exists() ? profileSnap.val() : {}

        return {
          id:    uid,
          email: auth.email || identifier,
          name:  auth.username || profile.name || identifier,
          image: profile.image || null,
        }
      },
    }),
  ],

  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },

  callbacks: {
    async jwt({ token, user, account }) {
      if (user?.id)   token.uid = user.id
      if (account?.provider === 'google' && account.providerAccountId) {
        token.uid = account.providerAccountId
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = (token.uid as string) || token.sub || ''
      return session
    },
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const uid = account.providerAccountId
        user.id   = uid
        await ensureUserSetup(uid, { email: user.email, name: user.name, image: user.image })
      }
      return true
    },
  },

  pages:  { signIn: '/login', error: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
}
