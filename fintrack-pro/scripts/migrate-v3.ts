/**
 * FinTrack Pro - Database Migration Script v3
 * Run: npx ts-node scripts/migrate-v3.ts
 *
 * What it does:
 * 1. Adds `hasPassword: true` to all existing credential user auth nodes
 * 2. Ensures all existing transactions have backward-compatible wallet fields
 * 3. Recomputes wallet account balances for any pre-existing wallet accounts
 */

import * as admin from 'firebase-admin'

// Load env
require('dotenv').config({ path: '.env.local' })

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  })
}

const db = admin.database()

async function migrate() {
  console.log('🚀 Starting FinTrack Pro v3 migration...\n')

  const usersSnap = await db.ref('users').get()
  if (!usersSnap.exists()) { console.log('No users found. Done.'); return }

  const users = usersSnap.val() as Record<string, Record<string, unknown>>
  const userIds = Object.keys(users)
  console.log(`Found ${userIds.length} users\n`)

  for (const userId of userIds) {
    const userData = users[userId]
    console.log(`\n── User: ${userId}`)

    // ─── 1. Fix hasPassword for credential users ───
    const auth = userData.auth as Record<string, unknown> | undefined
    if (auth && auth.passwordHash && !auth.hasPassword) {
      await db.ref(`users/${userId}/auth`).update({ hasPassword: true })
      console.log('  ✓ Added hasPassword: true to auth node')
    }

    // ─── 2. Ensure transactions have walletAccountId field (nullable) ───
    const txSnap = await db.ref(`users/${userId}/transactions`).get()
    if (txSnap.exists()) {
      const txs = txSnap.val() as Record<string, Record<string, unknown>>
      let patched = 0
      const updates: Record<string, null> = {}
      // No-op migration: existing transactions without walletAccountId
      // are already backward-compatible (optional field). Just log.
      console.log(`  ✓ ${Object.keys(txs).length} transactions OK (walletAccountId is optional/backward-compatible)`)
    }

    // ─── 3. Sync wallet account balances if accounts exist ───
    const accountSnap = await db.ref(`users/${userId}/walletAccounts`).get()
    if (accountSnap.exists()) {
      const accounts = accountSnap.val() as Record<string, { id: string; type: string; name: string; balance: number }>
      const balances: Record<string, number> = {}
      Object.keys(accounts).forEach((id) => { balances[id] = 0 })

      if (txSnap.exists()) {
        const txs = txSnap.val() as Record<string, {
          type: string; amount: number
          walletAccountId?: string; toWalletAccountId?: string
        }>
        Object.values(txs).forEach((tx) => {
          const { type, amount, walletAccountId, toWalletAccountId } = tx
          if (!amount || !type) return
          if (type === 'income'  && walletAccountId   && balances[walletAccountId]   !== undefined) balances[walletAccountId]   += amount
          if (type === 'expense' && walletAccountId   && balances[walletAccountId]   !== undefined) balances[walletAccountId]   -= amount
          if (type === 'transfer') {
            if (walletAccountId   && balances[walletAccountId]   !== undefined) balances[walletAccountId]   -= amount
            if (toWalletAccountId && balances[toWalletAccountId] !== undefined) balances[toWalletAccountId] += amount
          }
        })
      }

      const balanceUpdates: Record<string, number> = {}
      Object.entries(balances).forEach(([id, balance]) => {
        balanceUpdates[`users/${userId}/walletAccounts/${id}/balance`] = balance
      })
      if (Object.keys(balanceUpdates).length > 0) {
        await db.ref().update(balanceUpdates)
        console.log(`  ✓ Synced ${Object.keys(balances).length} wallet account balances`)
      }
    }
  }

  console.log('\n✅ Migration complete!')
  process.exit(0)
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
