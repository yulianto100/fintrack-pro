# 🏠 Finuvo — Setup Lokal (Windows)

Panduan biar app jalan di laptop kamu dalam **5–10 menit**.

> Status environment kamu: Node.js sudah ke-install, dependencies (`node_modules`) udah ada.
> Yang masih kurang cuma file `.env.local` dengan kredensial Firebase.

---

## TL;DR — kalau udah punya Firebase project

```powershell
copy .env.local.template .env.local
notepad .env.local      # isi blok 3 + blok 4
npm run dev
```

Buka http://localhost:3000 — selesai.

---

## Step 1 — Siapin Firebase project (5 menit)

Cuma sekali setup. Skip kalau udah punya.

### 1.1 Buat project
1. Buka https://console.firebase.google.com
2. Klik **Add project** → kasih nama bebas (misal `finuvo-dev`)
3. Disable Google Analytics (gak perlu untuk dev) → **Create**

### 1.2 Aktifkan Realtime Database
1. Sidebar kiri → **Build → Realtime Database**
2. **Create Database** → pilih lokasi `Singapore (asia-southeast1)`
3. Pilih **Start in test mode** (sementara, nanti diubah)
4. **Enable**

> Setelah test, ganti rules ke yang aman. Lihat `FIREBASE_RULES.json` di root project.

### 1.3 Aktifkan Storage (untuk avatar + struk)
1. Sidebar kiri → **Build → Storage**
2. **Get started** → **Start in test mode** → pilih lokasi sama dengan database
3. **Done**

### 1.4 Daftarkan Web App
1. ⚙️ **Project settings** (icon gear di kiri atas)
2. Tab **General** → scroll bawah ke **Your apps** → klik **Web** (`</>`)
3. Kasih nickname (misal `finuvo-local`) → **Register app**
4. **Penting:** muncul block kode dengan `firebaseConfig = {...}`. Biarkan tab ini tetap kebuka — nilainya buat di-copy ke `.env.local` nanti.

### 1.5 Generate Service Account (Admin SDK)
1. Tab **Service accounts** (di Project settings)
2. **Generate new private key** → **Generate key**
3. File JSON otomatis ke-download. Buka file-nya pakai Notepad.
4. Tiga field yang dipake: `project_id`, `client_email`, `private_key`.

---

## Step 2 — Buat `.env.local`

```powershell
copy .env.local.template .env.local
```

Buka `.env.local` di Notepad atau VS Code:

```powershell
code .env.local
```

### 2.1 Isi blok **3. Firebase Web (Client)**

Dari output `firebaseConfig` di step 1.4, mapping-nya gini:

| `firebaseConfig` | env var |
|---|---|
| `apiKey` | `NEXT_PUBLIC_FIREBASE_API_KEY` |
| `authDomain` | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` |
| `databaseURL`* | `NEXT_PUBLIC_FIREBASE_DATABASE_URL` |
| `projectId` | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` |
| `storageBucket` | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` |
| `messagingSenderId` | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` |
| `appId` | `NEXT_PUBLIC_FIREBASE_APP_ID` |

*`databaseURL` kalau gak muncul di config: ambil dari halaman Realtime Database (URL yang ditampilkan di atas tabel data).

### 2.2 Isi blok **4. Firebase Admin (Server)**

Dari file JSON service account yang didownload tadi:

```env
FIREBASE_PROJECT_ID=ganti-dengan-nilai-project_id
FIREBASE_CLIENT_EMAIL=ganti-dengan-nilai-client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nXXXX...XXXX\n-----END PRIVATE KEY-----\n"
```

> ⚠️ **Hati-hati `FIREBASE_PRIVATE_KEY`:**
> 1. Bungkus seluruh nilai dengan tanda kutip ganda `"..."`
> 2. Newline di dalam private key di JSON terlihat sebagai `\n` literal — biarkan begitu (jangan diganti enter beneran)
> 3. Kalau dari Notepad copy-paste-nya berantakan, cara aman: buka JSON di VS Code → `Ctrl+Shift+L` di field `private_key` → copy isinya → paste apa adanya di antara `"..."`.

### 2.3 (opsional) Login Google — blok 2

Skip kalau cuma mau test cepet (tinggal pakai email+password).

Kalau mau:
1. https://console.cloud.google.com/apis/credentials
2. **Create Credentials → OAuth Client ID → Web application**
3. **Authorized redirect URIs** isi:
   `http://localhost:3000/api/auth/callback/google`
4. Copy Client ID + Secret ke `.env.local`

---

## Step 3 — Jalanin

```powershell
npm run dev
```

Buka http://localhost:3000

Pertama kali bakal redirect ke `/login`. Klik **Daftar** untuk register dengan email+password, atau klik **Login dengan Google** kalau udah set Google OAuth.

---

## Troubleshooting

### `Error: Service account object must contain a string "private_key" property`
Private key kepotong. Cek:
- Sudah dibungkus tanda kutip ganda?
- `\n` masih ada di antara baris (bukan enter beneran)?
- File `.env.local` di-save sebagai UTF-8 tanpa BOM?

### `FIREBASE_DATABASE_URL` undefined / can't connect
- Pastikan Realtime Database udah dibuat (bukan Firestore — beda).
- URL formatnya: `https://xxx-default-rtdb.asia-southeast1.firebasedatabase.app`
- Singapore region: `asia-southeast1`. US region: tanpa region di hostname.

### `Module not found` / TypeScript errors
```powershell
rmdir /s /q node_modules
del package-lock.json
npm install
```

### Port 3000 udah dipake
```powershell
npm run dev -- -p 3001
```

### Login Google: `Error 400 redirect_uri_mismatch`
Authorized redirect URIs di Google Console harus persis `http://localhost:3000/api/auth/callback/google` — perhatikan `/api/auth/callback/google`, bukan `/login` atau `/callback`.

### Push notif error
Kalau `NEXT_PUBLIC_VAPID_PUBLIC_KEY` kosong, fitur push otomatis di-disable. Aman buat lokal.

### Avatar / upload struk gagal
Buka Firebase Console → **Storage** → tab **Rules**, ubah jadi:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
(Untuk dev. Production harus lebih ketat.)

---

## Build Production (cek build before deploy)

```powershell
npm run build
npm start
```

Akan jalan di port 3000 dengan optimized build.

---

## Setelah Login pertama

Coba alur ini biar yakin semua jalan:

1. Login → harusnya masuk ke halaman dashboard
2. Klik FAB `+` → tambah transaksi pengeluaran Rp 25.000 "Kopi"
3. Buka tab **Transaksi** → transaksi terlihat
4. Buka tab **Atur** → bagian Kategori expand → ada 14 kategori default
5. Buka tab **Akun** → tambah akun bank (misal BCA) dengan saldo 0
6. Coba transfer cash → bank di FAB

Kalau semua jalan, environment udah siap ✓.
