import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { getAdminDatabase } from './firebase-admin'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.sub = token.sub || account.providerAccountId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      return session
    },
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.id) {
        try {
          const db = getAdminDatabase()
          const userRef = db.ref(`users/${user.id}/profile`)
          const snapshot = await userRef.get()
          
          if (!snapshot.exists()) {
            // First time login - create user profile
            await userRef.set({
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              createdAt: new Date().toISOString(),
            })
            
            // Create default categories for new user
            await createDefaultCategories(user.id)
          } else {
            // Update last login
            await userRef.update({
              lastLogin: new Date().toISOString(),
              name: user.name,
              image: user.image,
            })
          }
        } catch (error) {
          console.error('Error during sign in:', error)
        }
      }
      return true
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

async function createDefaultCategories(userId: string) {
  const db = getAdminDatabase()
  const categoriesRef = db.ref(`users/${userId}/categories`)
  
  const defaultCategories = [
    // Income
    { name: 'Gaji', icon: '💼', type: 'income', color: '#22c55e' },
    { name: 'Freelance', icon: '💻', type: 'income', color: '#3b82f6' },
    { name: 'Investasi', icon: '📈', type: 'income', color: '#a855f7' },
    { name: 'Bonus', icon: '🎁', type: 'income', color: '#f59e0b' },
    { name: 'Lainnya', icon: '💰', type: 'income', color: '#6b7280' },
    // Expense
    { name: 'Makan & Minum', icon: '🍜', type: 'expense', color: '#ef4444' },
    { name: 'Transport', icon: '🚗', type: 'expense', color: '#f97316' },
    { name: 'Belanja', icon: '🛍️', type: 'expense', color: '#ec4899' },
    { name: 'Tagihan', icon: '📱', type: 'expense', color: '#8b5cf6' },
    { name: 'Kesehatan', icon: '🏥', type: 'expense', color: '#14b8a6' },
    { name: 'Hiburan', icon: '🎬', type: 'expense', color: '#f59e0b' },
    { name: 'Pendidikan', icon: '📚', type: 'expense', color: '#3b82f6' },
    { name: 'Tabungan', icon: '🏦', type: 'expense', color: '#22c55e' },
    { name: 'Lainnya', icon: '📋', type: 'expense', color: '#6b7280' },
  ]
  
  const batch: Record<string, object> = {}
  defaultCategories.forEach((cat) => {
    const key = categoriesRef.push().key!
    batch[key] = {
      ...cat,
      id: key,
      userId,
      createdAt: new Date().toISOString(),
    }
  })
  
  await categoriesRef.set(batch)
}
