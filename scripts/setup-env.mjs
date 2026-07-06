#!/usr/bin/env node
// ╔════════════════════════════════════════════════════════════╗
// ║  Finuvo — Setup .env.local otomatis                       ║
// ║                                                             ║
// ║  Cara pakai:                                                ║
// ║    1. Letakkan file service-account.json di root project   ║
// ║       (file dari Firebase Console → Service Accounts)      ║
// ║    2. Buat file firebase-config.json di root, isinya       ║
// ║       block "firebaseConfig" dari Firebase Console (Web App)║
// ║       Contoh:                                               ║
// ║       {                                                     ║
// ║         "apiKey": "...",                                    ║
// ║         "authDomain": "...",                                ║
// ║         ...                                                 ║
// ║       }                                                     ║
// ║    3. Jalankan:  node scripts/setup-env.mjs                ║
// ║                                                             ║
// ║  Script otomatis ngisi .env.local. File JSON dihapus       ║
// ║  setelah selesai (keamanan).                               ║
// ╚════════════════════════════════════════════════════════════╝

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SERVICE_ACCOUNT = resolve(root, 'service-account.json')
const FIREBASE_CONFIG = resolve(root, 'firebase-config.json')
const ENV_LOCAL       = resolve(root, '.env.local')

const COLOR = {
  reset: '\x1b[0m', dim: '\x1b[2m', red: '\x1b[31m',
  green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m', bold: '\x1b[1m',
}
const log = (msg, color = 'reset') => console.log(COLOR[color] + msg + COLOR.reset)

// ── Validate prerequisite files ──────────────────────────────────────
function readJson(path, label) {
  if (!existsSync(path)) {
    log(`✗ File ${label} tidak ditemukan di:`, 'red')
    log(`  ${path}`, 'dim')
    log('', 'reset')
    log('Setup yang dibutuhkan:', 'yellow')
    if (label === 'service-account.json') {
      log('  1. Firebase Console → ⚙ Project Settings → Service Accounts', 'dim')
      log('  2. Generate new private key → download JSON', 'dim')
      log(`  3. Letakkan file di: ${path}`, 'dim')
    } else {
      log('  1. Firebase Console → ⚙ Project Settings → General', 'dim')
      log('  2. Scroll ke "Your apps" → klik web app → "Config"', 'dim')
      log('  3. Salin block JSON-nya ke firebase-config.json', 'dim')
      log('     (cuma object firebaseConfig-nya, tanpa "const firebaseConfig =")', 'dim')
    }
    process.exit(1)
  }
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch (err) {
    log(`✗ ${label} bukan JSON valid: ${err.message}`, 'red')
    process.exit(1)
  }
}

const sa  = readJson(SERVICE_ACCOUNT, 'service-account.json')
const fbc = readJson(FIREBASE_CONFIG, 'firebase-config.json')

// ── Validate fields ──────────────────────────────────────────────────
const requiredSA = ['project_id', 'client_email', 'private_key']
const requiredFBC = ['apiKey', 'authDomain', 'projectId', 'appId']

for (const f of requiredSA) {
  if (!sa[f]) {
    log(`✗ service-account.json: field "${f}" kosong/hilang`, 'red')
    process.exit(1)
  }
}
for (const f of requiredFBC) {
  if (!fbc[f]) {
    log(`✗ firebase-config.json: field "${f}" kosong/hilang`, 'red')
    process.exit(1)
  }
}

// Derive databaseURL kalau gak ada (jaga2)
if (!fbc.databaseURL) {
  log('! databaseURL tidak ada di firebase-config.json. Coba derive...', 'yellow')
  fbc.databaseURL = `https://${fbc.projectId}-default-rtdb.asia-southeast1.firebasedatabase.app`
  log(`  → ${fbc.databaseURL}`, 'dim')
  log('  Cek di Firebase Console kalau ini salah lokasi (mis. us-central1).', 'dim')
}

// ── Existing secrets if .env.local sudah ada (preserve) ──────────────
let existingSecret = ''
let existingCron = ''
if (existsSync(ENV_LOCAL)) {
  const cur = readFileSync(ENV_LOCAL, 'utf-8')
  const m1 = cur.match(/^NEXTAUTH_SECRET=(.+)$/m)
  const m2 = cur.match(/^CRON_SECRET=(.+)$/m)
  if (m1) existingSecret = m1[1].trim()
  if (m2) existingCron = m2[1].trim()
}

const NEXTAUTH_SECRET = existingSecret || randomBytes(32).toString('base64')
const CRON_SECRET     = existingCron   || randomBytes(24).toString('base64url')

// ── Build .env.local ─────────────────────────────────────────────────
const privateKey = String(sa.private_key)
  .replace(/\r/g, '')
  .replace(/\n/g, '\\n')

const env = `# Auto-generated oleh scripts/setup-env.mjs pada ${new Date().toISOString()}
# Aman di-commit? TIDAK. File ini ada di .gitignore.

# ── 1. NextAuth ──────────────────────────────────────────
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}

# ── 2. Google OAuth (opsional) ───────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ── 3. Firebase Web (Client) ─────────────────────────────
NEXT_PUBLIC_FIREBASE_API_KEY=${fbc.apiKey}
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${fbc.authDomain}
NEXT_PUBLIC_FIREBASE_DATABASE_URL=${fbc.databaseURL}
NEXT_PUBLIC_FIREBASE_PROJECT_ID=${fbc.projectId}
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${fbc.storageBucket || `${fbc.projectId}.appspot.com`}
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${fbc.messagingSenderId || ''}
NEXT_PUBLIC_FIREBASE_APP_ID=${fbc.appId}

# ── 4. Firebase Admin (Server) ───────────────────────────
FIREBASE_PROJECT_ID=${sa.project_id}
FIREBASE_CLIENT_EMAIL=${sa.client_email}
FIREBASE_PRIVATE_KEY="${privateKey}"

# ── 5. Push notif (opsional) ─────────────────────────────
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=mailto:admin@finuvo.local

# ── 6. SMTP (opsional) ───────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# ── 7. Cron ──────────────────────────────────────────────
CRON_SECRET=${CRON_SECRET}

# ── 8. Stock fallback (opsional) ─────────────────────────
ALPHA_VANTAGE_API_KEY=
`

writeFileSync(ENV_LOCAL, env, 'utf-8')
log('✓ .env.local berhasil dibuat', 'green')
log(`  Project ID  : ${COLOR.cyan}${sa.project_id}${COLOR.reset}`, 'reset')
log(`  Auth domain : ${COLOR.cyan}${fbc.authDomain}${COLOR.reset}`, 'reset')
log(`  DB URL      : ${COLOR.cyan}${fbc.databaseURL}${COLOR.reset}`, 'reset')

// ── Cleanup: hapus file kredensial mentah ────────────────────────────
let cleaned = 0
for (const f of [SERVICE_ACCOUNT, FIREBASE_CONFIG]) {
  try { unlinkSync(f); cleaned++ } catch { /* ignore */ }
}
if (cleaned > 0) {
  log(`✓ ${cleaned} file kredensial mentah dihapus (keamanan)`, 'green')
}

log('', 'reset')
log('Selanjutnya:', 'bold')
log('  npm run dev', 'cyan')
log('  → buka http://localhost:3000', 'dim')
