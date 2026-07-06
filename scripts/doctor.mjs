#!/usr/bin/env node
// ╔════════════════════════════════════════════════════════════╗
// ║  Finuvo — Doctor                                            ║
// ║  Cek apakah environment lokal udah siap buat dev.          ║
// ║                                                             ║
// ║  Jalanin:  npm run doctor                                   ║
// ╚════════════════════════════════════════════════════════════╝

import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const COLOR = {
  reset: '\x1b[0m', dim: '\x1b[2m', red: '\x1b[31m',
  green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m', bold: '\x1b[1m',
}

let issues = 0
let warnings = 0

function pass(msg) { console.log(`${COLOR.green}✓${COLOR.reset} ${msg}`) }
function fail(msg, hint) {
  console.log(`${COLOR.red}✗ ${msg}${COLOR.reset}`)
  if (hint) console.log(`  ${COLOR.dim}${hint}${COLOR.reset}`)
  issues++
}
function warn(msg, hint) {
  console.log(`${COLOR.yellow}⚠ ${msg}${COLOR.reset}`)
  if (hint) console.log(`  ${COLOR.dim}${hint}${COLOR.reset}`)
  warnings++
}
function section(title) {
  console.log(`\n${COLOR.bold}${title}${COLOR.reset}`)
}

// ── 1. Node version ──────────────────────────────────────────────────
section('Runtime')
const nodeMajor = parseInt(process.versions.node.split('.')[0], 10)
if (nodeMajor >= 18) pass(`Node.js ${process.versions.node}`)
else fail(`Node.js ${process.versions.node} (butuh 18+)`, 'Update di https://nodejs.org')

// ── 2. node_modules ──────────────────────────────────────────────────
section('Dependencies')
if (existsSync(resolve(root, 'node_modules'))) pass('node_modules terinstall')
else fail('node_modules belum terinstall', 'Jalanin: npm install')

// ── 3. .env.local ────────────────────────────────────────────────────
section('Environment Variables')
const envPath = resolve(root, '.env.local')
if (!existsSync(envPath)) {
  fail('.env.local tidak ditemukan', 'Jalanin: npm run setup  (atau copy dari .env.local.template)')
} else {
  pass('.env.local ada')

  const env = Object.fromEntries(
    readFileSync(envPath, 'utf-8')
      .split('\n')
      .filter(l => l && !l.trim().startsWith('#') && l.includes('='))
      .map(l => {
        const i = l.indexOf('=')
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]
      })
  )

  const required = [
    ['NEXTAUTH_URL', 'NextAuth URL'],
    ['NEXTAUTH_SECRET', 'NextAuth secret'],
    ['NEXT_PUBLIC_FIREBASE_API_KEY', 'Firebase API key (client)'],
    ['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'Firebase auth domain'],
    ['NEXT_PUBLIC_FIREBASE_DATABASE_URL', 'Firebase DB URL'],
    ['NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'Firebase project ID'],
    ['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'Firebase storage bucket'],
    ['NEXT_PUBLIC_FIREBASE_APP_ID', 'Firebase app ID'],
    ['FIREBASE_PROJECT_ID', 'Firebase Admin project ID'],
    ['FIREBASE_CLIENT_EMAIL', 'Firebase Admin client email'],
    ['FIREBASE_PRIVATE_KEY', 'Firebase Admin private key'],
  ]

  for (const [key, label] of required) {
    if (!env[key]) fail(`${label} kosong`, `Set ${key} di .env.local`)
    else pass(`${label}`)
  }

  // Validate private key format
  if (env.FIREBASE_PRIVATE_KEY) {
    const pk = env.FIREBASE_PRIVATE_KEY
    if (!pk.includes('BEGIN PRIVATE KEY')) {
      fail('FIREBASE_PRIVATE_KEY format aneh', 'Pastikan ada "-----BEGIN PRIVATE KEY-----"')
    } else if (!pk.includes('\\n') && !pk.includes('\n')) {
      warn('FIREBASE_PRIVATE_KEY mungkin gak punya newline', 'Cek lagi di Notepad/VS Code, harus ada \\n')
    } else pass('FIREBASE_PRIVATE_KEY format ok')
  }

  // Validate URL formats
  if (env.NEXT_PUBLIC_FIREBASE_DATABASE_URL && !env.NEXT_PUBLIC_FIREBASE_DATABASE_URL.startsWith('https://')) {
    fail('NEXT_PUBLIC_FIREBASE_DATABASE_URL harus mulai dengan https://')
  }

  // Optional warnings
  if (!env.GOOGLE_CLIENT_ID) {
    warn('GOOGLE_CLIENT_ID kosong', 'Login Google tidak akan jalan. Boleh skip kalau pakai email+password.')
  } else pass('Google OAuth dikonfigurasi')

  if (!env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    warn('VAPID keys kosong', 'Push notif disabled. OK untuk dev lokal.')
  } else pass('Push notif dikonfigurasi')
}

// ── 4. Firebase Admin connectivity test ──────────────────────────────
section('Firebase Connection (test)')
if (existsSync(envPath)) {
  try {
    // Load env manually
    const env = readFileSync(envPath, 'utf-8')
      .split('\n')
      .filter(l => l && !l.trim().startsWith('#') && l.includes('='))
      .reduce((acc, l) => {
        const i = l.indexOf('=')
        const k = l.slice(0, i).trim()
        const v = l.slice(i + 1).trim().replace(/^["']|["']$/g, '')
        process.env[k] = v
        acc[k] = v
        return acc
      }, {})

    if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
      const adminMod = await import('firebase-admin').catch(() => null)
      if (!adminMod) {
        warn('Skip test: firebase-admin belum bisa di-load', 'Jalanin: npm install')
      } else {
        const admin = adminMod.default
        const privateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        try {
          if (!admin.apps.length) {
            admin.initializeApp({
              credential: admin.credential.cert({
                projectId: env.FIREBASE_PROJECT_ID,
                clientEmail: env.FIREBASE_CLIENT_EMAIL,
                privateKey,
              }),
              databaseURL: env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
            })
          }
          const db = admin.database()
          const t0 = Date.now()
          const snap = await Promise.race([
            db.ref('.info/connected').once('value'),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000)),
          ])
          const ms = Date.now() - t0
          pass(`Firebase Realtime DB connect (${ms}ms)`)
          // Test write/read
          const ref = db.ref('__doctor__/ping')
          await ref.set({ at: Date.now() })
          const back = await ref.once('value')
          if (back.exists()) {
            pass('Firebase write/read ok')
            await ref.remove()
          }
          process.exit(issues > 0 ? 1 : 0)
        } catch (err) {
          fail(`Gagal konek: ${err.message}`, 'Cek FIREBASE_PRIVATE_KEY dan DATABASE_URL.')
        }
      }
    }
  } catch (err) {
    warn(`Tidak bisa test koneksi: ${err.message}`)
  }
}

// ── Summary ──────────────────────────────────────────────────────────
console.log()
if (issues === 0 && warnings === 0) {
  console.log(`${COLOR.green}${COLOR.bold}Semua oke. Siap jalanin: npm run dev${COLOR.reset}`)
} else if (issues === 0) {
  console.log(`${COLOR.yellow}Siap jalan, dengan ${warnings} warning.${COLOR.reset}`)
  console.log(`${COLOR.dim}Jalanin: npm run dev${COLOR.reset}`)
} else {
  console.log(`${COLOR.red}${COLOR.bold}${issues} masalah ditemukan.${COLOR.reset} Fix dulu sebelum dev.`)
  process.exit(1)
}
