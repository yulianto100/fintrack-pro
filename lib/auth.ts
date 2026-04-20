import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { getAdminDatabase } from './firebase-admin'
import bcrypt from 'bcryptjs'

// ─── Setup user profile + default categories on first login ───────────────────
export async function ensureUserSetup(uid: string, data: {
  email?: string | null; name?: string | null; image?: string | null
}) {
  try {
    const db  = getAdminDatabase()
    const ref = db.ref(`users/${uid}/profile`)
    const snap = await ref.get()
    if (!snap.exists()) {
      await ref.set({ id: uid, email: data.email ?? '', name: data.name ?? '', image: data.image ?? '', createdAt: new Date().toISOString() })
      await createDefaultCategories(uid)
    } else {
      const updates: Record<string, string> = { lastLogin: new Date().toISOString() }
      if (data.name)  updates.name  = data.name
      if (data.image) updates.image = data.image
      await ref.update(updates)
    }
  } catch (err) {
    // Log but don't block login
    console.error('[ensureUserSetup]', err)
  }
}

async function createDefaultCategories(uid: string) {
  const db  = getAdminDatabase()
  const ref = db.ref(`users/${uid}/categories`)
  const defaults = [
    { name:'Gaji',         icon:'💼', type:'income',  color:'#34d36e' },
    { name:'Freelance',    icon:'💻', type:'income',  color:'#63b3ed' },
    { name:'Investasi',    icon:'📈', type:'income',  color:'#d6aaff' },
    { name:'Bonus',        icon:'🎁', type:'income',  color:'#f6cc60' },
    { name:'Lainnya',      icon:'💰', type:'income',  color:'#68d391' },
    { name:'Makan & Minum',icon:'🍜', type:'expense', color:'#fc8181' },
    { name:'Transport',    icon:'🚗', type:'expense', color:'#f6ad55' },
    { name:'Belanja',      icon:'🛍️', type:'expense', color:'#f687b3' },
    { name:'Tagihan',      icon:'📱', type:'expense', color:'#b794f4' },
    { name:'Kesehatan',    icon:'🏥', type:'expense', color:'#4fd1c5' },
    { name:'Hiburan',      icon:'🎬', type:'expense', color:'#fbd38d' },
    { name:'Pendidikan',   icon:'📚', type:'expense', color:'#63b3ed' },
    { name:'Tabungan',     icon:'🏦', type:'expense', color:'#34d36e' },
    { name:'Lainnya',      icon:'📋', type:'expense', color:'#718096' },
  ]
  const batch: Record<string, object> = {}
  defaults.forEach((cat) => {
    const key = ref.push().key!
    batch[key] = { ...cat, id: key, userId: uid, createdAt: new Date().toISOString() }
  })
  await ref.set(batch)
}

// ─── NextAuth config ──────────────────────────────────────────────────────────
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
        identifier: { label: 'Email atau Username', type: 'text'     },
        password:   { label: 'Password',            type: 'password' },
      },
      async authorize(creds) {
        if (!creds?.identifier || !creds?.password) return null

        const db         = getAdminDatabase()
        const identifier = creds.identifier.trim().toLowerCase()

        // ── Try find by email first ──
        let uid: string | null = null
        let userData: Record<string, unknown> | null = null

        const byEmail = await db.ref('users')
          .orderByChild('profile/email')
          .equalTo(identifier)
          .get()

        if (byEmail.exists()) {
          const entries = Object.entries(byEmail.val())
          uid      = entries[0][0]
          userData = entries[0][1] as Record<string, unknown>
        } else {
          // ── Try find by username ──
          const byUsername = await db.ref('users')
            .orderByChild('auth/username')
            .equalTo(creds.identifier.trim()) // username is case-sensitive
            .get()
          if (byUsername.exists()) {
            const entries = Object.entries(byUsername.val())
            uid      = entries[0][0]
            userData = entries[0][1] as Record<string, unknown>
          }
        }

        if (!uid || !userData) throw new Error('Email/username tidak ditemukan')

        const auth = userData.auth as { passwordHash?: string; username?: string } | undefined
        if (!auth?.passwordHash) throw new Error('Akun ini tidak memiliki password. Gunakan login Google.')

        const valid = await bcrypt.compare(creds.password, auth.passwordHash)
        if (!valid) throw new Error('Password salah')

        const profile = userData.profile as Record<string, string> | undefined
        return {
          id:    uid,
          email: profile?.email || identifier,
          name:  auth.username  || profile?.name || identifier,
          image: profile?.image || null,
        }
      },
    }),
  ],

  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },

  callbacks: {
    async jwt({ token, user, account }) {
      // Persist uid on sign-in
      if (user?.id)   token.uid = user.id
      // For Google, use providerAccountId as stable uid
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
        user.id   = uid  // patch so jwt callback gets it
        await ensureUserSetup(uid, { email: user.email, name: user.name, image: user.image })
      }
      return true
    },
  },

  pages:  { signIn: '/login', error: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
}
