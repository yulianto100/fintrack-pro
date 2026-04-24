# FinTrack Pro — v3 Changes & Implementation Guide

## Overview of All 8 Improvements

---

## 1. AUTH SYSTEM FIX — `user.hasPassword` (CRITICAL)

### Problem Solved
Previously the UI showed/hid the password form based on session provider (`google` vs `credentials`).
This was wrong: a user originally registered with email+password who later logs in via Google
would lose access to their password settings.

### What Changed

**`app/api/profile/me/route.ts`**
- Now reads `auth.passwordHash` from Firebase DB to determine `hasPassword`
- Returns `hasPassword: true/false` in API response — this is the source of truth

**`app/api/profile/set-password/route.ts`** *(NEW)*
- Allows Google-only users to set a new password (no current password required)
- After set, user can login with email + password in addition to Google
- Registers email index so credentials login works

**`app/api/profile/change-password/route.ts`** *(UPDATED)*
- Works for ALL users who have a password set (both credentials AND Google who set one)
- No longer gated by provider

**`app/(dashboard)/profile/page.tsx`** *(REWRITTEN)*
- Fetches `hasPassword` from `/api/profile/me`
- `if (hasPassword)` → shows **Change Password** form
- `else` → shows **Set Password** form
- Username change always visible regardless of login method

### Logic Summary
```
GET /api/profile/me → { hasPassword: !!auth.passwordHash }

if (hasPassword) {
  show: Change Password (requires current password)
} else {
  show: Set Password (new password only — for Google users)
}
```

---

## 2. WALLET SYSTEM — Multi-account under Bank & E-Wallet

### Database Schema (Firebase Realtime DB)
```
users/{userId}/walletAccounts/{accountId}
  id:        string
  userId:    string
  type:      'bank' | 'ewallet'
  name:      string      (e.g. 'BCA', 'Mandiri', 'OVO', 'GoPay')
  balance:   number      (synced from transactions)
  createdAt: string (ISO)
  updatedAt: string (ISO)
```

### New API Routes
| Endpoint | Method | Description |
|---|---|---|
| `/api/wallet-accounts` | GET | List all accounts (optional `?type=bank\|ewallet`) |
| `/api/wallet-accounts` | POST | Create new account `{ type, name }` |
| `/api/wallet-accounts/[id]` | PATCH | Rename account `{ name }` |
| `/api/wallet-accounts/[id]` | DELETE | Remove account |
| `/api/wallet-accounts/sync` | POST | Recompute all balances from transactions |
| `/api/wallet-accounts/sync` | GET | Preview balances (read-only) |

---

## 3. SETTINGS PAGE — Wallet Account Management

**`app/(dashboard)/settings/page.tsx`** *(REWRITTEN)*

New sections added:
- **Rekening Bank** — list of bank accounts with add/edit/delete
- **E-Wallet** — list of ewallet accounts with add/edit/delete

Both sections include:
- Quick-suggestion chips (BCA, Mandiri, OVO, GoPay, etc.)
- Inline edit modal with save/cancel
- Auto-capitalization on name input
- Count badge showing how many accounts exist

---

## 4. PORTFOLIO PAGE — Bank & E-Wallet Sections

**`app/(dashboard)/portfolio/page.tsx`** *(REWRITTEN)*

Changes:
- Added **"AKUN DOMPET"** section with Bank and E-Wallet cards above investments
- Each card shows account count and navigates to filtered view
- `?type=bank` → filtered portfolio listing all bank accounts with balances
- `?type=ewallet` → filtered portfolio listing all ewallet accounts with balances
- Filtered view has back-navigation and "Add Account" shortcut to Settings

### Navigation Behavior
```
Dashboard → WalletCard "Bank"    → /portfolio?type=bank    → Bank account list
Dashboard → WalletCard "E-Wallet"→ /portfolio?type=ewallet → E-Wallet account list
Portfolio → "Bank" card          → /portfolio?type=bank
Portfolio → "E-Wallet" card      → /portfolio?type=ewallet
```

---

## 5. TRANSACTION INPUT — Wallet Account Selection

**`components/transactions/TransactionModal.tsx`** *(REWRITTEN)*

Two-step wallet selection:
1. Select wallet type: `Cash | Bank | E-Wallet`
2. If bank/ewallet selected → show child account chips dynamically

```
Income  → Bank    → [BCA ✓] [Mandiri] [Jago]
Expense → E-Wallet→ [OVO ✓] [GoPay] [Dana]
```

- `walletAccountId` stored on transaction when a specific account is selected
- Selecting no specific account (just wallet type) still works — backward compatible
- If no accounts exist yet, shows hint: "Tambah akun di Pengaturan"

---

## 6. TRANSFER FEATURE

**`app/api/transactions/route.ts`** *(UPDATED)*

Transfer improvements:
- ✅ Bank → Bank allowed (no validation error)
- ✅ Bank → E-Wallet allowed
- ✅ E-Wallet → Bank allowed
- ✅ E-Wallet → E-Wallet allowed
- ❌ Only blocks transfers where `walletAccountId === toWalletAccountId` (same exact account)

Transfer stores both:
- `walletAccountId` (source account)
- `toWalletAccountId` (destination account)

Balance sync correctly handles transfers:
```
source account: balance -= amount
destination account: balance += amount
```

---

## 7. DEPOSIT — Auto Capitalization

**`app/(dashboard)/portfolio/deposito/page.tsx`** *(REWRITTEN)*

Bank name input uses `capitalizeFirst()`:
```js
// lib/utils.ts (already existed)
export function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Usage in component
onChange={(e) => handleBankNameChange(e.target.value)}
// bca → Bca, mandiri → Mandiri, sinarmas → Sinarmas
```

Quick-suggestion chips for common banks (BCA, Mandiri, BRI, etc.) also added.

---

## 8. DEPOSIT AUTO-COMPLETE

**`app/(dashboard)/portfolio/deposito/page.tsx`** *(REWRITTEN)*

When `enrichDeposit()` calculates `percentComplete >= 100`:
1. `autoCompleteMatured()` is called automatically via `useEffect`
2. Calls `PATCH /api/portfolio/deposits` with `{ status: 'matured' }`
3. Shows success toast: `"Deposito BCA otomatis ditandai selesai ✓"`
4. Triggers `refetch()` which removes it from the active list
5. It moves to the History section

```js
useEffect(() => {
  if (active.length > 0) autoCompleteMatured(active)
}, [active, autoCompleteMatured])
```

Progress bar also shows "Auto-selesai" badge when `percentComplete >= 95%`.

---

## Migration Steps

### For Existing Users (Production)

1. **Deploy the new code** to your environment

2. **Run the migration script** (one-time):
   ```bash
   npx ts-node scripts/migrate-v3.ts
   ```
   This will:
   - Add `hasPassword: true` to credential user auth nodes
   - Sync wallet account balances (if any pre-existing accounts)

3. **No schema breaking changes** — all new fields are optional and backward compatible:
   - `walletAccountId` on transactions → optional
   - `toWalletAccountId` on transactions → optional
   - `users/{userId}/walletAccounts` → new node, won't affect existing data

4. **No data loss** — existing transactions, categories, portfolio data untouched

### For New Users
No migration needed. All features work automatically from first login.

---

## File Change Summary

### New Files
```
app/api/profile/set-password/route.ts       — Set password for Google users
app/api/wallet-accounts/route.ts            — CRUD for wallet accounts
app/api/wallet-accounts/[id]/route.ts       — Edit/delete wallet accounts
app/api/wallet-accounts/sync/route.ts       — Balance sync from transactions
scripts/migrate-v3.ts                       — One-time DB migration
```

### Modified Files
```
types/index.ts                              — Added WalletAccount, WalletAccountType
app/api/profile/me/route.ts                 — Returns hasPassword flag
app/api/profile/change-password/route.ts    — Works for all users with password
app/api/auth/register/route.ts              — Saves hasPassword: true on register
app/api/transactions/route.ts               — Stores walletAccountId, fixes transfer
app/(dashboard)/profile/page.tsx            — Uses hasPassword, shows set/change UI
app/(dashboard)/settings/page.tsx           — Added bank/ewallet management sections
app/(dashboard)/portfolio/page.tsx          — Added bank/ewallet filtered sections
app/(dashboard)/portfolio/deposito/page.tsx — Auto-cap, auto-complete, suggestions
components/transactions/TransactionModal.tsx — Two-step wallet + account selection
components/dashboard/WalletCard.tsx         — Clickable, navigates to portfolio
hooks/useTransactions.ts                    — Syncs wallet balances after mutations
```

### Unchanged (preserved)
```
All investment portfolio pages (gold, stocks)
All existing API routes not listed above
All styling, CSS variables, layout
Navigation structure
Authentication flow
Push notification system
Export/import functionality
```
