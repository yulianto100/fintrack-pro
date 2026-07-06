# Finuvo v4 — Mega Upgrade Prompt for Codex

> **ROLE:** You are a senior full-stack engineer working on **Finuvo** (Next.js 14 App Router + Firebase Realtime DB + Firebase Storage + NextAuth). The project lives at `d:\Master-app\fintrack-pro`. Read existing code before changing anything. Match the existing style, design tokens (`var(--accent)`, `var(--surface-2)`, etc.), and folder conventions exactly. **Do not introduce new dependencies unless explicitly listed below.**

---

## 0. NON-NEGOTIABLE RULES

1. **Type-safe.** Every new file is TypeScript. Reuse existing types in `types/index.ts` and `types/account.ts`. Extend them — do **not** duplicate.
2. **No regressions.** All existing routes, hooks, and components must keep working. If a refactor changes a public signature, update *every* caller.
3. **Backwards-compatible Firebase data.** New fields on existing nodes are optional. Never delete an existing field. Migrations must be idempotent.
4. **`next build` must succeed** with zero TypeScript errors. Run it after every major task.
5. **Indonesian UI copy.** All user-visible strings in Bahasa Indonesia, matching the existing tone (e.g., "Tambah", "Hapus", "Berhasil ✓").
6. **Design tokens only.** Never hardcode colors except inside `tailwind.config.js` or design tokens. Use `var(--accent)`, `var(--text-primary)`, etc.
7. **Mobile-first.** Every new UI works at 360px width. Bottom safe-area respected.
8. **Loading & error states required.** Every new fetch shows a skeleton or spinner, and toasts on error using `react-hot-toast`.
9. **No `any`.** Use proper generics or `unknown` + narrowing.
10. **Animations** use `framer-motion` matching existing transitions (`{ type: 'spring', damping: 30, stiffness: 350 }` for modals, `{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }` for fades).
11. **Self-check after each task:**
    - `npm run lint`
    - `npm run build`
    - manually trace at least one happy path + one error path

---

## 1. REAL BANK & E-WALLET LOGOS (CENTRALIZED) — **DO THIS FIRST**

### 1.1 Problem
Currently bank/e-wallet logos are loaded from `/public/bank-icons/*.png` (low-res, outdated, duplicated in 3+ files: `components/account/AccountItem.tsx`, `app/(dashboard)/akun/page.tsx`, `components/account/AddAccountModal.tsx`). User wants real, up-to-date logos pulled from the internet.

### 1.2 Solution — Single source of truth
Create **`lib/bank-logos.ts`** with the following exports:

```ts
export interface BankLogoEntry {
  id: string            // canonical lowercase id, e.g. 'bca'
  name: string          // display name, e.g. 'BCA'
  domain: string        // official domain for Clearbit fallback
  logoUrl: string       // primary remote URL (Wikipedia Commons or official CDN)
  fallbackUrl: string   // secondary remote URL (Clearbit Logo API)
  brandColor: string    // hex, used as tinted bg
  abbr: string          // 2-3 letter abbreviation for text fallback
  type: 'bank' | 'ewallet'
}

export const BANK_LOGOS: BankLogoEntry[]
export function getBankLogo(query: string): BankLogoEntry | null
export function getBankLogoUrl(query: string): string | null
```

### 1.3 Logo URL Strategy (PRIORITY ORDER)

For each entry, populate `logoUrl` and `fallbackUrl` like this:

| Provider | Primary `logoUrl` (Wikipedia Commons SVG/PNG, hi-res) | `fallbackUrl` (Clearbit) | `domain` |
|---|---|---|---|
| BCA | `https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Bank_Central_Asia.svg/512px-Bank_Central_Asia.svg.png` | `https://logo.clearbit.com/bca.co.id?size=128` | `bca.co.id` |
| Mandiri | `https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Bank_Mandiri_logo_2016.svg/512px-Bank_Mandiri_logo_2016.svg.png` | `https://logo.clearbit.com/bankmandiri.co.id?size=128` | `bankmandiri.co.id` |
| BRI | `https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/BANK_BRI_logo.svg/512px-BANK_BRI_logo.svg.png` | `https://logo.clearbit.com/bri.co.id?size=128` | `bri.co.id` |
| BNI | `https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/BNI_logo.svg/512px-BNI_logo.svg.png` | `https://logo.clearbit.com/bni.co.id?size=128` | `bni.co.id` |
| CIMB Niaga | `https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/CIMB_Niaga_logo.svg/512px-CIMB_Niaga_logo.svg.png` | `https://logo.clearbit.com/cimbniaga.co.id?size=128` | `cimbniaga.co.id` |
| BSI | `https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Bank_Syariah_Indonesia.svg/512px-Bank_Syariah_Indonesia.svg.png` | `https://logo.clearbit.com/bankbsi.co.id?size=128` | `bankbsi.co.id` |
| Permata | `https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/PermataBank_logo.svg/512px-PermataBank_logo.svg.png` | `https://logo.clearbit.com/permatabank.com?size=128` | `permatabank.com` |
| Danamon | `https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Bank_Danamon_logo.svg/512px-Bank_Danamon_logo.svg.png` | `https://logo.clearbit.com/danamon.co.id?size=128` | `danamon.co.id` |
| OCBC | `https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/OCBC_Bank_logo.svg/512px-OCBC_Bank_logo.svg.png` | `https://logo.clearbit.com/ocbc.id?size=128` | `ocbc.id` |
| BTN | `https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/BTN_logo.svg/512px-BTN_logo.svg.png` | `https://logo.clearbit.com/btn.co.id?size=128` | `btn.co.id` |
| Jago | `https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Bank_Jago_logo.svg/512px-Bank_Jago_logo.svg.png` | `https://logo.clearbit.com/jago.com?size=128` | `jago.com` |
| Jenius (BTPN) | `https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Jenius_logo.svg/512px-Jenius_logo.svg.png` | `https://logo.clearbit.com/jenius.co.id?size=128` | `jenius.co.id` |
| Sinarmas | `https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Bank_Sinarmas_logo.svg/512px-Bank_Sinarmas_logo.svg.png` | `https://logo.clearbit.com/banksinarmas.com?size=128` | `banksinarmas.com` |
| Panin | `https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Bank_Panin_logo.svg/512px-Bank_Panin_logo.svg.png` | `https://logo.clearbit.com/panin.co.id?size=128` | `panin.co.id` |
| Mega | `https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Bank_Mega_logo.svg/512px-Bank_Mega_logo.svg.png` | `https://logo.clearbit.com/bankmega.com?size=128` | `bankmega.com` |
| UOB | `https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/UOB_Logo.svg/512px-UOB_Logo.svg.png` | `https://logo.clearbit.com/uob.co.id?size=128` | `uob.co.id` |
| HSBC | `https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/HSBC_logo_%282018%29.svg/512px-HSBC_logo_%282018%29.svg.png` | `https://logo.clearbit.com/hsbc.co.id?size=128` | `hsbc.co.id` |
| Maybank | `https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Maybank_logo.svg/512px-Maybank_logo.svg.png` | `https://logo.clearbit.com/maybank.co.id?size=128` | `maybank.co.id` |
| Standard Chartered | `https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Standard_Chartered.svg/512px-Standard_Chartered.svg.png` | `https://logo.clearbit.com/sc.com?size=128` | `sc.com` |
| Citibank | `https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Citibank.svg/512px-Citibank.svg.png` | `https://logo.clearbit.com/citibank.co.id?size=128` | `citibank.co.id` |
| Bukopin / KB Bukopin | `https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Bank_KB_Bukopin_logo.svg/512px-Bank_KB_Bukopin_logo.svg.png` | `https://logo.clearbit.com/kbbukopin.com?size=128` | `kbbukopin.com` |
| BTPN | `https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/BTPN_2014_logo.svg/512px-BTPN_2014_logo.svg.png` | `https://logo.clearbit.com/btpn.com?size=128` | `btpn.com` |
| Mega Syariah | `https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Bank_Mega_Syariah_logo.svg/512px-Bank_Mega_Syariah_logo.svg.png` | `https://logo.clearbit.com/megasyariah.co.id?size=128` | `megasyariah.co.id` |
| Muamalat | `https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Bank_Muamalat_logo.svg/512px-Bank_Muamalat_logo.svg.png` | `https://logo.clearbit.com/bankmuamalat.co.id?size=128` | `bankmuamalat.co.id` |
| GoPay | `https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Gopay_logo.svg/512px-Gopay_logo.svg.png` | `https://logo.clearbit.com/gopay.co.id?size=128` | `gopay.co.id` |
| OVO | `https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Logo_ovo_purple.svg/512px-Logo_ovo_purple.svg.png` | `https://logo.clearbit.com/ovo.id?size=128` | `ovo.id` |
| DANA | `https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Logo_dana_blue.svg/512px-Logo_dana_blue.svg.png` | `https://logo.clearbit.com/dana.id?size=128` | `dana.id` |
| ShopeePay | `https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Shopee_logo.svg/512px-Shopee_logo.svg.png` | `https://logo.clearbit.com/shopee.co.id?size=128` | `shopee.co.id` |
| LinkAja | `https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/LinkAja.svg/512px-LinkAja.svg.png` | `https://logo.clearbit.com/linkaja.id?size=128` | `linkaja.id` |
| Flip | `https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Flip_logo.svg/512px-Flip_logo.svg.png` | `https://logo.clearbit.com/flip.id?size=128` | `flip.id` |
| Sakuku (BCA) | `https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Bank_Central_Asia.svg/512px-Bank_Central_Asia.svg.png` | `https://logo.clearbit.com/sakuku.bca.co.id?size=128` | `sakuku.bca.co.id` |
| Jenius Pay | same as Jenius | same | same |
| Tokopedia | `https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Tokopedia.svg/512px-Tokopedia.svg.png` | `https://logo.clearbit.com/tokopedia.com?size=128` | `tokopedia.com` |

> **Important:** Wikipedia URLs above are illustrative — Codex must fetch / verify each one resolves to a real image. If a URL 404s, **fall back to** `https://logo.clearbit.com/{domain}?size=128`. If neither resolves, mark `logoUrl = ''` and rely on the abbreviation badge fallback (existing behavior).

### 1.4 API Route — Logo proxy with caching
Create **`app/api/bank-logo/[provider]/route.ts`**:

```ts
import { NextResponse } from 'next/server'
import { getBankLogo } from '@/lib/bank-logos'

export const runtime = 'nodejs'

export async function GET(_req: Request, { params }: { params: { provider: string } }) {
  const entry = getBankLogo(params.provider)
  if (!entry) return new NextResponse('Not found', { status: 404 })

  // Try primary, then fallback
  for (const url of [entry.logoUrl, entry.fallbackUrl]) {
    if (!url) continue
    try {
      const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 * 7 } }) // 7-day cache
      if (res.ok) {
        const buf = await res.arrayBuffer()
        return new NextResponse(buf, {
          headers: {
            'Content-Type': res.headers.get('content-type') || 'image/png',
            'Cache-Control': 'public, max-age=604800, immutable',
          },
        })
      }
    } catch { /* try next */ }
  }
  return new NextResponse('Logo unavailable', { status: 502 })
}
```

This gives every consumer a stable URL: `/api/bank-logo/bca`, `/api/bank-logo/gopay`, etc., regardless of which upstream is alive.

### 1.5 Shared component
Create **`components/shared/BankLogo.tsx`**:

```tsx
'use client'
import { useState } from 'react'
import { getBankLogo } from '@/lib/bank-logos'

interface Props {
  provider: string         // can be id, name, or display string
  size?: number            // default 40
  rounded?: number         // default 12
  className?: string
}

export function BankLogo({ provider, size = 40, rounded = 12, className }: Props) {
  const entry = getBankLogo(provider)
  const [errored, setErrored] = useState(false)

  if (!entry || errored || !entry.logoUrl) {
    // Abbreviated fallback chip
    return (
      <div
        className={className}
        style={{
          width: size, height: size, borderRadius: rounded,
          background: entry ? `${entry.brandColor}22` : 'rgba(34,197,94,0.15)',
          color: entry?.brandColor ?? 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: Math.max(10, Math.floor(size * 0.28)),
          fontWeight: 800, letterSpacing: '-0.02em',
        }}
      >
        {entry?.abbr ?? provider.slice(0, 2).toUpperCase()}
      </div>
    )
  }

  return (
    <div
      className={className}
      style={{
        width: size, height: size, borderRadius: rounded,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
        background: '#fff',  // many bank logos are designed for white bg
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/bank-logo/${entry.id}`}
        alt={entry.name}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setErrored(true)}
        style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }}
      />
    </div>
  )
}
```

### 1.6 Refactor — replace ALL local PNG references
- Delete `/public/bank-icons/*` (or keep for offline emergency, but stop referencing).
- In **every** file containing a `PROVIDER_LOGOS` map, delete it and use `<BankLogo provider={...} />` instead.
- Files to update:
  - `components/account/AccountItem.tsx`
  - `components/account/AddAccountModal.tsx`
  - `app/(dashboard)/akun/page.tsx`
  - `components/credit-card/CreditCardHero.tsx` (if it shows bank logo)
  - `components/credit-card/AddCreditCardModal.tsx` (if applicable)
  - `app/(dashboard)/portfolio/deposito/page.tsx` bank suggestions
  - `app/(dashboard)/settings/page.tsx` bank/ewallet quick chips
- The `getProviderInfo()` in `types/account.ts` should now delegate to `getBankLogo()` for color/abbr — keep its public signature.

### 1.7 next.config.js
Add `images.remotePatterns` for `upload.wikimedia.org` and `logo.clearbit.com` so any direct `next/image` use also works:

```js
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'upload.wikimedia.org' },
    { protocol: 'https', hostname: 'logo.clearbit.com' },
    { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
  ],
}
```

### 1.8 Acceptance
- `<BankLogo provider="bca" />` renders a real BCA logo on a white rounded square.
- Unknown provider (`<BankLogo provider="random-coop" />`) renders a tinted abbreviation chip without console errors.
- All previously logoed places still show logos (or graceful fallback).
- No file in `app/` or `components/` imports from `/bank-icons/` anymore.

---

## 2. RECEIPT / ATTACHMENT UPLOAD ON TRANSACTIONS

### 2.1 Type changes (`types/index.ts`)
Extend `Transaction`:
```ts
attachmentUrl?: string        // signed Firebase Storage URL
attachmentPath?: string       // storage path for delete
attachmentType?: 'image' | 'pdf'
attachmentSize?: number       // bytes
```

### 2.2 API route — `app/api/transactions/[id]/attachment/route.ts`
- `POST`: multipart form with field `file`. Accept `image/jpeg`, `image/png`, `image/webp`, `application/pdf`. Max 6 MB. Save to `users/{uid}/transactions/{txId}/receipt-{timestamp}.{ext}` with a download token. Update transaction node with `attachmentUrl/Path/Type/Size`. If a previous attachment exists, delete it.
- `DELETE`: remove storage object + clear fields on transaction.
- Auth via `getServerSession` like the avatar route. Reject if transaction does not belong to the user.

### 2.3 UI — `components/transactions/TransactionModal.tsx`
Add a new section **above** the "Recurring" toggle:

```
┌─ Foto Struk (opsional) ────────────┐
│ [📷 Tambah Foto]  or thumbnail+✕  │
└────────────────────────────────────┘
```

- When no attachment: button "📷 Tambah Foto / PDF" → opens `<input type="file" accept="image/*,application/pdf" capture="environment">` (capture lets phones use the camera directly).
- When an attachment exists: 80×80 thumbnail (use `next/image` for images, generic PDF icon for PDFs) with a small `✕` overlay to remove. Tap thumbnail → preview in a lightbox modal.
- Upload happens **after** the transaction is created (so we have an `id`). For NEW transactions:
  1. Save transaction first.
  2. If user attached a file, immediately call `POST /api/transactions/{newId}/attachment`.
  3. Show toast `Struk berhasil disimpan ✓`.
  For EDIT mode, upload directly because `id` is known.
- During upload: show inline spinner inside the thumbnail + disable the save button.

### 2.4 UI — Transaction detail / row
Inside `TransactionGroup.tsx` `SwipeableRow`, when `transaction.attachmentUrl` exists, add a tiny `<Paperclip size={11} />` icon next to the amount.

When user **edits** a transaction with an attachment, the modal pre-fills the thumbnail.

### 2.5 Lightbox (`components/transactions/AttachmentLightbox.tsx`)
- Full-screen modal triggered by tapping the thumbnail.
- For images: zoomable view (use simple CSS `transform: scale()` toggle on tap).
- For PDFs: render via `<iframe src={url} />` with download button.
- Close on backdrop tap or `Esc`.

### 2.6 Acceptance
- Upload from camera works on Android Chrome and iOS Safari.
- Refreshing the page shows the same thumbnail.
- Deleting the transaction also deletes the storage object (extend the existing `DELETE /api/transactions/[id]` to call `bucket.file(attachmentPath).delete({ ignoreNotFound: true })`).
- 7 MB upload returns a friendly "Ukuran maksimal 6 MB" toast.

---

## 3. TAGS UI

### 3.1 `Transaction.tags` already exists. Expose it.

### 3.2 In `TransactionModal.tsx`
Add **after** the Description field:

```
Tag (opsional)
[ #kerja ] [ #liburan ] [ + ]   ← chip-style input
```

- Implement as a simple state `tags: string[]`.
- Input behavior: type word → press Enter / Comma / Space → push to `tags`. Click `✕` on a chip to remove. Lowercase + trim. Max 8 tags. Max 20 chars each.
- Below the input, show **autocomplete suggestions** sourced from `useApiList<{tag:string,count:number}>('/api/tags/recent', { refreshMs: 60000 })`. Suggestions clickable to add.

### 3.3 New API — `app/api/tags/recent/route.ts`
- Reads all transactions for the user, aggregates tag occurrences, returns top 20 sorted by count desc.
- Cache the result for 60 seconds in memory (use the existing `lib/cache.ts` if available).

### 3.4 Filter UI — `app/(dashboard)/transactions/page.tsx`
Inside the filter panel, add a new **"Tag"** section after Wallet:
- Multi-select chip group of all known tags (from `/api/tags/recent`, limit 30).
- When 1+ tags selected, transactions list filters to those tagged with **any** selected tag (OR logic).
- Selected tags appear as filter chips at the top (same style as existing `FilterChip`), removable individually.

### 3.5 Backend filter
Extend `GET /api/transactions` to accept `?tag=foo` (multiple times → AND? NO, OR). Implement in-memory filter `list = list.filter(t => tags.some(tag => t.tags?.includes(tag)))`.

### 3.6 Acceptance
- Adding a transaction with `["kerja","kopi"]` and reopening shows the same chips.
- Filter by `kopi` shows only those.
- Suggestion chips auto-update after a new tag is used 3+ times.

---

## 4. BULK ACTIONS ON TRANSACTIONS LIST

### 4.1 Selection mode
- Long-press (500ms) on a transaction row → enters **selection mode**:
  - Sticky header at top changes to `[← Cancel] 1 dipilih [Hapus] [Ubah Kategori]`
  - All rows now have a checkbox (left of the icon).
  - Tapping any row toggles its selection (no swipe-to-delete in this mode).
- Exit selection mode: tap the back arrow OR after action completes.

### 4.2 Implement with a global Zustand store **OR** lifted state in `useTransactions`:
```ts
selectedIds: Set<string>
toggle(id), clear(), selectAll()
```
Lifted state is fine; pick whichever fits cleaner.

### 4.3 Bulk delete
- Confirms via the same dialog pattern as single delete (reuse `DeleteConfirmDialog` styled for plural: "Hapus 5 transaksi?").
- Calls a new endpoint `DELETE /api/transactions/bulk` with `{ ids: string[] }`. Loops on the server, all-or-nothing within a try/catch (continue on individual failure, return `{success, deleted, failed}`).

### 4.4 Bulk re-categorize
- Opens a sheet "Ubah kategori untuk N transaksi" listing all expense categories (or income, infer from selection — if mixed, show all and let server validate).
- Calls `PATCH /api/transactions/bulk` with `{ ids, categoryId }`. Server updates each.

### 4.5 Acceptance
- Long-press triggers selection on touch and on desktop (use `pointerdown`+timer).
- Tap somewhere outside a row in selection mode does NOT exit (only the back arrow does).
- During bulk delete, optimistic UI removes rows; on error, restore + toast.

---

## 5. SORT OPTIONS ON TRANSACTIONS

### 5.1 Inside the filter panel, add **"Urutkan"**:

Options:
- `Terbaru` (default)
- `Terlama`
- `Terbesar` (amount desc)
- `Terkecil` (amount asc)

### 5.2 Implementation
Extend `useTransactions`:
```ts
sortBy: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'
```

Apply in the same `useMemo` after search filter. Default = `date_desc` (current behavior).

### 5.3 Persistence
Save `sortBy` to `localStorage` key `finuvo:tx-sort`. Restore on mount.

### 5.4 Acceptance
- Switching sort updates the list immediately, no reload.
- Refresh keeps the chosen sort.

---

## 6. UNDO TOAST PATTERN — REPLACE `confirm()`

### 6.1 Pattern
Replace native `window.confirm('Hapus ...?')` calls in:
- `app/(dashboard)/settings/page.tsx` (`handleDeleteCat`, `handleRecurringDelete`)
- `components/transactions/TransactionGroup.tsx` is **kept** (already custom dialog).
- Anywhere else `confirm(` appears — grep and update.

### 6.2 New helper — `lib/toast-undo.ts`
```ts
import toast from 'react-hot-toast'

export function toastUndo(message: string, onUndo: () => void, duration = 5000) {
  const id = toast.custom(
    (t) => (
      <div className={`finuvo-toast-undo ${t.visible ? 'in' : 'out'}`}>
        <span>{message}</span>
        <button onClick={() => { onUndo(); toast.dismiss(id) }}>Batal</button>
      </div>
    ),
    { duration }
  )
  return id
}
```

Add CSS for `.finuvo-toast-undo` in `app/globals.css` (or wherever the toaster is themed) matching app aesthetic: dark surface, rounded-2xl, accent text for the Batal button.

### 6.3 Usage example (category delete):
```ts
const cat = categories.find(c => c.id === id)
if (!cat) return
const previous = [...categories]
// optimistic remove
setCategoriesLocally(prev => prev.filter(c => c.id !== id))
let undone = false
toastUndo(`Kategori "${cat.name}" dihapus`, () => {
  undone = true
  setCategoriesLocally(previous)
})
setTimeout(async () => {
  if (undone) return
  await fetch(`/api/categories/${id}`, { method: 'DELETE' })
  refetchCats()
}, 5000)
```

### 6.4 Acceptance
- Action feels instant (optimistic).
- Tapping Batal within 5s restores the item.
- After 5s the API call fires and the change becomes permanent.

---

## 7. EMPTY STATES UPGRADE

### 7.1 Audit pages with possible empty states:
- `/transactions` (already has `EmptyState` — add a soft accent gradient background and a helpful CTA pair: "Tambah Transaksi" + "Impor CSV").
- `/portfolio` & each sub-page (gold, stocks, deposito, sbn, reksadana) when the list is empty.
- `/goals` empty state.
- `/budget` (= `/goals?tab=budget`) when no budget for the chosen month.
- `/akun` when no accounts at all.
- `/transactions` filter result empty (different from "no data ever").

### 7.2 Shared component — `components/shared/EmptyHint.tsx`
```tsx
interface Props {
  icon: ReactNode | string  // emoji or lucide icon
  title: string
  description: string
  primaryCta?: { label: string; onClick: () => void; href?: string }
  secondaryCta?: { label: string; onClick: () => void; href?: string }
  variant?: 'default' | 'filtered' // 'filtered' uses warning colors
}
```
Use the same illustration scheme as the existing `EmptyState.tsx` (radial gradient circle + emoji + small floating accent dot).

### 7.3 Replace existing inline empty state code in each page with `<EmptyHint>`.

---

## 8. CALENDAR HEATMAP VIEW ON TRANSACTIONS

### 8.1 Component — `components/transactions/SpendingHeatmap.tsx`
- A compact 7-row × N-col grid (last 8 weeks visible by default, swipe horizontally for older).
- Each cell = one day. Color intensity = total expense for that day relative to the user's 90th percentile.
- Tap a day → sets `filters.month = YYYY-MM` and adds a `?date=YYYY-MM-DD` query that further filters the list to that single day; chip shows in active filters.
- Compute percentiles client-side from `allTransactions`.

### 8.2 Place it as a **collapsible** section on `/transactions` between the search bar and SummaryCards. Default: collapsed. Header: "Aktivitas 8 minggu" with a chevron + "Tampilkan" toggle.

### 8.3 Acceptance
- Renders smoothly with 500+ transactions.
- Empty days have low-opacity background, busy days bright accent.
- Selecting a day visibly filters the list and adds a chip "23 Mei 2026" with `✕`.

---

## 9. PULL-TO-REFRESH

### 9.1 Hook — `hooks/usePullToRefresh.ts`
```ts
export function usePullToRefresh(onRefresh: () => Promise<void>, opts?: { threshold?: number }): {
  bind: { onTouchStart, onTouchMove, onTouchEnd }
  pulling: boolean
  pullDistance: number
  refreshing: boolean
}
```
- Only activates when scroll position is at top (`scrollTop === 0`).
- `threshold` default 80px. Past threshold + release triggers refresh.
- Apply rubber-band easing on overshoot.

### 9.2 Apply on:
- `/` (DashboardPage main wrapper)
- `/transactions`
- `/portfolio` (and sub-pages)
- `/akun`

### 9.3 Visual
A thin pill at the top: `[ ↻ Tarik untuk refresh ]` rotating into spinner past threshold. Place inside a fixed container offset by `scrollTop * 0.4`.

### 9.4 Each page wires `onRefresh` to its primary `refetch()` (or a parallel `Promise.all([refetchA(), refetchB()])`).

### 9.5 Acceptance
- Mouse drag also works on desktop (use pointer events).
- Cannot trigger when scrolled mid-page.
- Spinner stays for at least 400ms even on instant refresh, for visual feedback.

---

## 10. SKELETON CONSISTENCY

### 10.1 Audit
Check every place that does `useApiList`/`fetch` and renders content. If `data.length === 0 && loading`, must show a skeleton matching the final layout shape.

### 10.2 Shared components
Add `components/shared/Skeleton.tsx`:
- `<SkeletonCard />` 80px tall rounded-2xl with shimmer.
- `<SkeletonRow />` 64px tall transaction-row look.
- `<SkeletonHero />` 160px tall (for net worth / summary card placeholder).

### 10.3 Replace inline `animate-pulse h-X bg-...` patterns app-wide with these.

### 10.4 Specific fix on `app/(dashboard)/page.tsx`
The NetWorth animated counter currently jumps from 0 → totalWealth on first render. Show `<SkeletonHero />` until `allTx.length > 0 || totalWealth > 0`. (Existing `mounted` flag is OK; just ensure layout shift is zero.)

---

## 11. TRANSACTION TEMPLATES (PINNED FAVORITES)

### 11.1 Concept
A user can mark a recently-used transaction as a "template" (essentially a saved preset: type, amount, category, wallet, description). One tap creates a fresh transaction from that template.

### 11.2 Type
```ts
// types/index.ts
export interface TransactionTemplate {
  id: string
  userId: string
  type: 'income' | 'expense'
  amount: number
  categoryId: string
  categoryName?: string
  categoryIcon?: string
  description: string
  wallet?: WalletType
  walletAccountId?: string
  emoji?: string
  createdAt: string
  updatedAt: string
  lastUsedAt?: string
  useCount: number
}
```

### 11.3 API
- `GET /api/templates` → list, sorted by `useCount desc, lastUsedAt desc`, limit 12.
- `POST /api/templates` → create.
- `DELETE /api/templates/[id]` → remove.
- `POST /api/templates/[id]/use` → increments `useCount`, updates `lastUsedAt`, **and** creates a new transaction with the template's data + today's date. Returns the new transaction.

### 11.4 UI on `/` (Dashboard)
New section **"Pintasan Cepat"** between `MonthlyCashflowCard` and `StreakBanner`:
- Horizontal scroll of pill-cards: `[☕ Kopi · Rp 25.000] [⛽ Bensin · Rp 50.000] [+]`
- Tap a pill → instant create transaction + toast `Transaksi "Kopi" ditambahkan ✓` + brief flash highlight.
- Tap `+` → opens a small modal "Pilih dari 5 transaksi terakhir" listing the last 5 unique (categoryId+description+amount) tuples.
- Long-press a pill → bottom sheet with "Hapus pintasan".

### 11.5 Acceptance
- Adding a template from "last 5" actually persists and survives reload.
- Counts visibly bubble up the most-used to the front.
- Empty state inside section: "Tidak ada pintasan" + "+" button.

---

## 12. COMMAND PALETTE (Ctrl+K / Cmd+K)

### 12.1 Component — `components/shared/CommandPalette.tsx`
- Mounted in `app/(dashboard)/layout.tsx`.
- Toggle on `Ctrl+K` / `Cmd+K`. Close on `Esc`.
- Centered modal, max-w 480px, with a search input and a vertical list of commands grouped by section:
  - **Navigasi** — Dashboard, Transaksi, Portofolio, Goals, Akun, Settings, etc.
  - **Aksi** — Tambah Transaksi, Tambah Goal, Tambah Kartu Kredit, Export Excel, Export JSON.
  - **Cari Transaksi** — fuzzy match against description/category in `allTransactions` (limit 5 results, click → navigate to `/transactions?focus=<id>`).
- Keyboard nav: `↑/↓` to move, `Enter` to run.

### 12.2 Use a tiny fuzzy match — implement inline (no new dep). Score by substring + position.

### 12.3 `/transactions?focus=<id>`
On mount, scroll the row into view and pulse it for 1.5s.

### 12.4 Acceptance
- Opens / closes smoothly.
- Search "kop" finds "Kopi" transaction.
- Enter on a navigation item routes immediately.

---

## 13. IN-APP NOTIFICATION CENTER

### 13.1 Concept
Right now `NotificationBell` likely just toggles push subscription. Add a real activity feed visible via the bell.

### 13.2 Type
```ts
// extend types/index.ts Notification (it exists already)
// add: link?: string  // deep link to navigate when clicked
// add: read: boolean (already exists)
```

### 13.3 API
- `GET /api/notifications` — list latest 50, sorted desc.
- `PATCH /api/notifications` — body `{ ids?: string[], all?: true }` marks read.
- `DELETE /api/notifications/[id]` — remove.

### 13.4 Generation rules
A new helper `lib/notifications-engine.ts` should *also* persist notifications under `users/{uid}/notifications/{nid}` whenever a triggering event happens. Hook into:
- Deposito jatuh tempo (existing cron `app/api/cron/deposits/route.ts`).
- Kartu kredit jatuh tempo (extend or create cron).
- Budget terlampaui >90% (when transaction posts cause overage; check inside `POST /api/transactions`).
- Recurring transaction ran today.
- Streak milestone (3, 7, 30, 100 days).

### 13.5 UI — `components/notifications/NotificationCenter.tsx`
- Triggered by `NotificationBell`. Slides in from the right (or modal on small screens).
- Header: "Aktivitas" + "Tandai semua dibaca".
- List: icon, title, subtitle, relative time ("2 jam lalu"). Unread = subtle accent dot + brighter background.
- Tap an item → if `link` exists, navigate; mark as read.
- Empty state: "Belum ada notifikasi · Aktivitas akan muncul di sini".

### 13.6 Bell badge
Small red dot when there are unread items.

### 13.7 Acceptance
- New deposito running at maturity day shows in the feed.
- Unread count updates in real time (poll every 30s).

---

## 14. CUSTOM ACCENT COLOR

### 14.1 In `Settings` page, add a new section **"Tema"**:

```
Warna aksen
[ ● hijau ] [ ● biru ] [ ● ungu ] [ ● oranye ] [ ● merah-rose ]
```

Color presets:
| name | css value |
|---|---|
| Hijau (default) | `#22c55e` |
| Biru | `#3b82f6` |
| Ungu | `#a855f7` |
| Oranye | `#f97316` |
| Rose | `#f43f5e` |

### 14.2 Implementation
- Save chosen accent to `localStorage` key `finuvo:accent`.
- A small client component `<AccentThemeProvider>` runs on mount in `app/providers.tsx`, reads the value and sets `--accent`, `--accent-dim`, `--accent-strong` on `:root` via `document.documentElement.style.setProperty`.
- `--accent-dim` = same hue at 12% opacity (use a helper to derive). Same for `--accent-strong`.
- Persist across reloads.

### 14.3 Acceptance
- Switching color updates buttons, FAB, NavPill, and active states everywhere instantly.
- Refresh keeps the chosen color.

---

## 15. BILL REMINDERS (One-off due dates)

### 15.1 New type
```ts
export interface Bill {
  id: string
  userId: string
  name: string                  // e.g. 'Indihome', 'BPJS'
  amount: number
  dueDate: string               // ISO date YYYY-MM-DD
  category?: string             // categoryId
  isPaid: boolean
  paidDate?: string
  paidTransactionId?: string
  recurring?: 'monthly' | 'yearly' | 'none'  // if monthly, auto-clone next month after paid
  notes?: string
  createdAt: string
  updatedAt: string
}
```

### 15.2 API — `app/api/bills/route.ts` and `app/api/bills/[id]/route.ts`
- CRUD identical pattern to `recurring-transactions`.
- `POST /api/bills/[id]/pay`: marks paid + creates a transaction (reuse `addTransaction` logic) + if `recurring` is set, clones for next period.

### 15.3 UI — Tab inside `/goals` page **OR** dedicated `/bills` route. Recommended: a third tab next to Goals + Budget called "Tagihan".
- List sorted by `dueDate` asc. Past-due in red badge "Lewat 2 hari". Due in 3 days = amber.
- FAB "+" opens bottom sheet to create.
- Each row: tap "Bayar" → opens transaction modal pre-filled with the bill amount/category, `paidTransactionId` is linked on save.

### 15.4 Cron — `app/api/cron/bills/route.ts`
Daily: enqueue notifications for bills due in 3, 1, 0 days (similar pattern to deposits).

### 15.5 Acceptance
- Creating a bill with `recurring: monthly` → after marking paid, next month's bill auto-appears.
- Notifications fire correctly via the new notification center.

---

## 16. PDF MONTHLY REPORT EXPORT

### 16.1 Dependency
Add `pdf-lib` (no Chromium needed, server-side OK).
```
npm i pdf-lib
```

### 16.2 API — `app/api/export/pdf/route.ts`
- Accept `?month=YYYY-MM`.
- Fetch transactions, budgets, goals, portfolio summaries for that month.
- Build a PDF:
  - Page 1: cover with month, total income, expense, net.
  - Page 2: top categories with bar lengths drawn as rectangles.
  - Page 3: list of all transactions in a table.
  - Page 4 (optional): portfolio snapshot.
- Use built-in fonts only (Helvetica). Currency rendered as `Rp 1.234.567`.
- Return as `application/pdf` with download header.

### 16.3 UI — Settings → Export & Import section, add a new button "Laporan PDF (per bulan)" that opens a small chooser (last 6 months) and triggers download.

### 16.4 Acceptance
- File opens cleanly in any PDF reader.
- Indonesian month names rendered correctly.
- File size < 500 KB for a typical month with 100 transactions.

---

## 17. PROACTIVE AI INSIGHTS

### 17.1 Existing `lib/insights-engine.ts` is descriptive. Make it **actionable**.

### 17.2 New rules to add (each must include `actionLabel` + `actionHref`):
- Category spend YoY change > +30% → "Pengeluaran {category} naik {pct}% dari rata-rata 3 bulan. Set budget?" → `/goals?tab=budget&prefillCategory={id}`
- Recurring expense detected (3+ similar amounts in same category in 3 different months) but not a recurring rule → "Sepertinya {desc} berulang. Buat aturan otomatis?" → opens recurring modal.
- Wallet bank balance > X (X = 3 months of avg expense) → "Saldo BCA cukup besar. Pertimbangkan deposito?" → `/portfolio/deposito?prefillNominal={amount}`
- 3 transactions in same category same day + amount each > Rp 100k → "Pengeluaran besar di {category} hari ini. Set limit harian?"
- Net worth growing 4 months in a row → success insight "Net worth naik 4 bulan berturut-turut 🎉"
- Streak risk: no input for 16+ hours and current streak > 5 → "Catat hari ini biar streak {n} hari tetap aman" → opens TransactionModal.

### 17.3 Render
`SmartInsights` already exists — extend it to render the `actionLabel`/`actionHref` as a small button with an arrow.

### 17.4 Acceptance
- Each new rule fires only when its conditions are met (write small unit tests in `lib/insights-engine.test.ts` if test setup exists; otherwise skip but document inputs).
- Action buttons navigate / open the right modal with prefilled data.

---

## 18. HAPTIC FEEDBACK

### 18.1 Helper — `lib/haptics.ts`
```ts
export const haptics = {
  light: () => navigator.vibrate?.(8),
  medium: () => navigator.vibrate?.(16),
  success: () => navigator.vibrate?.([8, 30, 8]),
  warn: () => navigator.vibrate?.([12, 40, 12]),
  error: () => navigator.vibrate?.([20, 60, 20]),
}
```

### 18.2 Sprinkle
- `light` on FAB tap, on chip select, on tab switch.
- `medium` on save action.
- `success` on transaction saved, goal hit milestone.
- `warn` on confirm dialog open.
- `error` on toast.error.

Wrap all in `try/catch` since older Safari throws.

---

## 19. LOADING STATE ON ALL MODAL BUTTONS

Audit every `<button>` that triggers an async fetch. If it doesn't already, replace its content with a spinner while loading and disable it. Use existing inline pattern:

```tsx
{saving
  ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
  : <><Check size={16} /> Simpan</>}
```

Files to audit (non-exhaustive — grep for `disabled=` or `onClick={async`):
- All modals in `components/account/`
- `components/credit-card/AddCreditCardModal.tsx`
- `components/goals/*`
- `components/transactions/*`
- All Settings sections (kategori, recurring, dll.)

---

## 20. SMOOTHER PAGE TRANSITIONS

The existing `AnimatePresence mode="popLayout"` in `app/(dashboard)/layout.tsx` only fades. Upgrade to a directional slide:

- Determine direction from a small history hook: forward (deeper path) → slide left, back → slide right. Keep fade.
- Duration 0.22s, ease `[0.16, 1, 0.3, 1]`.
- Respect `prefers-reduced-motion`: fall back to a fade only.

---

## DATABASE SUMMARY (Firebase Realtime DB)

Final paths after this PR (new ones marked **NEW**):
```
users/{uid}/profile                                 (existing)
users/{uid}/categories/{cid}                        (existing)
users/{uid}/transactions/{tid}                      (existing, +attachment* +tags)
users/{uid}/walletAccounts/{aid}                    (existing)
users/{uid}/creditCards/{ccid}                      (existing)
users/{uid}/goals/{gid}                             (existing)
users/{uid}/budgets/{bid}                           (existing)
users/{uid}/recurringTransactions/{rid}             (existing)
users/{uid}/portfolio/...                           (existing)
users/{uid}/notifications/{nid}                     **NEW**
users/{uid}/templates/{tplid}                       **NEW**
users/{uid}/bills/{bid}                             **NEW**
users/{uid}/preferences                             **NEW** (accent color, sortBy, etc.)
```

Storage:
```
users/{uid}/profile/avatar-*.{ext}                  (existing)
users/{uid}/transactions/{tid}/receipt-*.{ext}      **NEW**
```

---

## EXECUTION PLAN — DO THESE IN ORDER

1. **Section 1** — Bank logos centralization (foundation, used by many later parts)
2. **Section 19** — Loading state audit (cheap polish)
3. **Section 6** — Undo toast pattern
4. **Section 7** — Empty states
5. **Section 10** — Skeleton consistency
6. **Section 2** — Receipt attachment
7. **Section 3** — Tags UI
8. **Section 5** — Sort options
9. **Section 4** — Bulk actions
10. **Section 11** — Templates
11. **Section 13** — Notification center (extend cron later)
12. **Section 15** — Bills
13. **Section 17** — Proactive insights
14. **Section 8** — Heatmap
15. **Section 14** — Custom accent
16. **Section 9** — Pull-to-refresh
17. **Section 12** — Command palette
18. **Section 16** — PDF report
19. **Section 18** — Haptics
20. **Section 20** — Page transitions

After each section: `npm run build`, fix any errors, commit. Use commit messages like:
```
feat(logos): centralize bank/ewallet logos with online sources
feat(tx): receipt photo attachment via firebase storage
feat(tx): tag input with autocomplete + filter chips
...
```

---

## VERIFICATION CHECKLIST (must all pass before declaring done)

- [ ] `npm run build` clean (zero TS errors, zero warnings)
- [ ] `npm run lint` clean
- [ ] All existing pages still render at `/`, `/transactions`, `/akun`, `/portfolio`, `/portfolio/{deposito,emas,saham,sbn,reksadana}`, `/goals`, `/goals?tab=budget`, `/settings`, `/profile`, `/credit-card`, `/recurring`, `/import`
- [ ] Login → Dashboard works on Google + credentials
- [ ] Add transaction with photo → reload → photo still shows
- [ ] Add transaction with tags → filter by tag → only those show
- [ ] Bulk delete 3 transactions → undo within 5s restores them (if undo applies) OR confirm dialog flow works
- [ ] Sort changes persist after reload
- [ ] Heatmap day click filters list to that date
- [ ] Pull down on `/` triggers refresh on mobile viewport
- [ ] `Cmd/Ctrl+K` opens palette, search works
- [ ] Bell shows notifications, marks read on tap
- [ ] Set accent color to Biru → reload → still Biru
- [ ] Create bill, mark paid → next month's bill (if recurring) appears
- [ ] PDF export downloads valid file
- [ ] BankLogo component shows real BCA logo, real GoPay logo, etc.
- [ ] Long-press transaction triggers selection mode
- [ ] No console errors anywhere

---

## OUT OF SCOPE (do not implement now — flag for v5)
- Multi-currency support
- Shared wallet / split bills with other users
- True offline mode with sync queue
- Native iOS/Android wrapper
