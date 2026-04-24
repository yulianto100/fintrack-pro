# 🚀 FinTrack Pro — Panduan Deploy

## 📋 Prasyarat

- Node.js 18+
- npm / yarn / pnpm
- Akun Google Cloud Console
- Akun Firebase
- Akun Vercel

---

## 1️⃣ Setup Google OAuth

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru atau pilih yang sudah ada
3. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client IDs**
4. Application type: **Web application**
5. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (dev)
   - `https://your-app.vercel.app/api/auth/callback/google` (prod)
6. Salin **Client ID** dan **Client Secret**

---

## 2️⃣ Setup Firebase

### Database
1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Create project → Pilih "Realtime Database"
3. Start in **test mode** (lalu update rules)
4. Salin **Database URL** (format: `https://xxx-default-rtdb.firebaseio.com`)

### Firebase Rules (Realtime Database)
```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

### Service Account (untuk Admin SDK)
1. Firebase Console → Project Settings → **Service Accounts**
2. **Generate new private key** → download JSON
3. Salin nilai `project_id`, `client_email`, `private_key`

### Client Config
1. Firebase Console → Project Settings → **General** → Your apps
2. **Add app → Web app**
3. Salin config object

---

## 3️⃣ Generate VAPID Keys (Push Notifications)

```bash
npx web-push generate-vapid-keys
```

Salin `Public Key` dan `Private Key`.

---

## 4️⃣ Setup Environment Variables

```bash
cp .env.example .env.local
```

Isi semua nilai di `.env.local`:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<jalankan: openssl rand -base64 32>

GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx

NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://project-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:xxx:web:xxx

FIREBASE_PROJECT_ID=project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nXXX\n-----END PRIVATE KEY-----\n"

NEXT_PUBLIC_VAPID_PUBLIC_KEY=BXxx...
VAPID_PRIVATE_KEY=xxx...
VAPID_EMAIL=mailto:admin@yourdomain.com

CRON_SECRET=<random-secret-for-cron>
```

---

## 5️⃣ Jalankan Lokal

```bash
# Install dependencies
npm install

# Jalankan dev server
npm run dev
```

Buka `http://localhost:3000`

---

## 6️⃣ Deploy ke Vercel

### Via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Atau langsung ke production
vercel --prod
```

### Via GitHub
1. Push code ke GitHub repository
2. Buka [vercel.com](https://vercel.com) → **New Project**
3. Import repository Anda
4. **Environment Variables**: masukkan semua dari `.env.example`
5. **Deploy!**

### Update NEXTAUTH_URL
Setelah deploy, update environment variable:
```
NEXTAUTH_URL=https://your-app.vercel.app
```
Dan tambahkan redirect URI ke Google Console.

---

## 7️⃣ Firebase Security Rules (Production)

Update rules agar lebih ketat:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid",
        "transactions": {
          "$txId": {
            ".validate": "newData.hasChildren(['type','amount','categoryId','date','wallet'])"
          }
        }
      }
    }
  }
}
```

---

## 8️⃣ PWA Icons

Buat icons untuk PWA (taruh di `/public/icons/`):

```
icon-72x72.png
icon-96x96.png
icon-128x128.png
icon-144x144.png
icon-152x152.png
icon-192x192.png
icon-384x384.png
icon-512x512.png
apple-touch-icon.png (180x180)
badge-72x72.png
```

Tool gratis: [pwa-asset-generator](https://github.com/elegantapp/pwa-asset-generator)

```bash
npx pwa-asset-generator logo.png public/icons --manifest public/manifest.json
```

---

## 9️⃣ Cron Job (Deposit Notifications)

`vercel.json` sudah dikonfigurasi. Cron berjalan setiap hari jam 8 pagi:

```json
{
  "crons": [{
    "path": "/api/cron/deposits",
    "schedule": "0 8 * * *"
  }]
}
```

> ⚠️ Cron Jobs tersedia di Vercel **Pro** plan. Untuk free tier, gunakan layanan eksternal seperti [cron-job.org](https://cron-job.org) untuk hit endpoint `/api/cron/deposits` dengan header `Authorization: Bearer <CRON_SECRET>`.

---

## 🏗️ Struktur Folder

```
fintrack-pro/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/    # NextAuth handler
│   │   ├── prices/
│   │   │   ├── gold/              # Gold price scraper
│   │   │   └── stock/[symbol]/    # Stock price (Yahoo Finance)
│   │   ├── transactions/          # CRUD transaksi
│   │   ├── categories/            # CRUD kategori
│   │   ├── portfolio/
│   │   │   ├── gold/              # CRUD emas
│   │   │   ├── stocks/            # CRUD saham
│   │   │   └── deposits/          # CRUD deposito
│   │   ├── export/                # Excel + JSON export
│   │   ├── notifications/
│   │   │   └── subscribe/         # Push subscription
│   │   └── cron/deposits/         # Daily notif checker
│   ├── (auth)/login/              # Login page
│   └── (dashboard)/
│       ├── page.tsx               # Dashboard home
│       ├── transactions/          # Transaksi page
│       ├── portfolio/
│       │   ├── page.tsx           # Portfolio overview
│       │   ├── emas/              # Gold portfolio
│       │   ├── saham/             # Stock portfolio
│       │   └── deposito/          # Deposit management
│       └── settings/              # Settings & categories
├── components/
│   ├── dashboard/                 # Dashboard widgets
│   └── transactions/              # Transaction modal & FAB
├── hooks/
│   ├── useFirebaseRealtime.ts     # Realtime DB hooks
│   ├── useTransactions.ts         # Transaction state
│   ├── usePrices.ts               # Price polling hooks
│   └── usePushNotifications.ts    # Push notif hook
├── lib/
│   ├── firebase.ts                # Client Firebase
│   ├── firebase-admin.ts          # Server Firebase Admin
│   ├── auth.ts                    # NextAuth config
│   ├── cache.ts                   # Server-side price cache
│   ├── notifications.ts           # Push notification sender
│   └── utils.ts                   # Utility functions
├── types/index.ts                 # TypeScript types
├── public/
│   ├── manifest.json              # PWA manifest
│   └── sw.js                      # Service Worker
├── .env.example                   # Environment template
└── vercel.json                    # Vercel + Cron config
```

---

## 🐛 Troubleshooting

**Firebase private key error:**
```
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nXXX\n-----END PRIVATE KEY-----\n"
```
Pastikan newline menggunakan `\n` literal di `.env.local`.

**NEXTAUTH_SECRET missing:**
```bash
openssl rand -base64 32
```

**Gold price not loading:**
Harga emas di-scrape dari logammulia.com. Jika gagal, fallback price digunakan.
Pertimbangkan menggunakan paid API di production.

**Stock price not loading:**
Yahoo Finance unofficial API bisa tidak stabil. Daftar Alpha Vantage API key (free 500 req/day) sebagai fallback.

---

## 📱 Install sebagai PWA

1. Buka app di Chrome mobile
2. Ketuk menu (⋮) → **Add to Home screen**
3. Atau banner install muncul otomatis

---

*Built with Next.js 14 · Firebase Realtime DB · NextAuth · Vercel*
