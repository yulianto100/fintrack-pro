# TransactionModal.tsx — Credit Card Extension Patch

Apply these changes to the existing `TransactionModal.tsx`.
Only the **diff sections** are shown. Do NOT rewrite the entire file.

---

## 1. Add imports (at top of file, after existing imports)

```tsx
import { useApiList }    from '@/hooks/useApiData'
import type { CreditCard } from '@/types'
```

---

## 2. Add state inside the component (after existing `walletAccountId` states)

```tsx
// ── Credit card state ──────────────────────────────────────────────────────
const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'credit_card'>('wallet')
const [creditCardId,  setCreditCardId ] = useState<string>('')

const { data: creditCards } = useApiList<CreditCard>('/api/credit-cards')
```

---

## 3. Update `handleSave` — build transaction payload (inside the data object)

Replace:
```tsx
const data = {
  type, amount: raw,
  categoryId:        categoryId || 'transfer',
  description:       description ? capitalizeWords(description) : '',
  date, wallet,
  toWallet:          type === 'transfer' ? toWallet           : undefined,
  walletAccountId:   walletAccountId     || undefined,
  toWalletAccountId: type === 'transfer' ? (toWalletAccountId || undefined) : undefined,
}
```

With:
```tsx
const isCreditCard = type === 'expense' && paymentMethod === 'credit_card'
const data = {
  type, amount: raw,
  categoryId:        categoryId || 'transfer',
  description:       description ? capitalizeWords(description) : '',
  date, wallet,
  toWallet:          type === 'transfer' ? toWallet           : undefined,
  walletAccountId:   isCreditCard ? undefined : (walletAccountId || undefined),
  toWalletAccountId: type === 'transfer' ? (toWalletAccountId || undefined) : undefined,
  // ── Credit card fields ──────────────────────────────────────────────────
  paymentMethod:     isCreditCard ? 'credit_card' : 'wallet',
  creditCardId:      isCreditCard ? creditCardId  : undefined,
  creditCardName:    isCreditCard
    ? creditCards.find((c) => c.id === creditCardId)?.name
    : undefined,
}
```

---

## 4. Add credit-card validation before `setSaving(true)` in `handleSave`

```tsx
// Validate credit card selection
if (type === 'expense' && paymentMethod === 'credit_card') {
  if (!creditCardId) { toast.error('Pilih kartu kredit'); return }
  const card = creditCards.find((c) => c.id === creditCardId)
  if (!card) { toast.error('Kartu kredit tidak ditemukan'); return }
  const remaining = card.limit - card.used
  if (raw > remaining) {
    toast.error(`Melebihi sisa limit. Sisa: Rp ${remaining.toLocaleString('id-ID')}`)
    return
  }
}
```

---

## 5. Add UI block inside `<div className="px-5 pb-7 space-y-5">` — AFTER the amount input, BEFORE wallet picker

Only show when `type === 'expense'`:

```tsx
{/* ── Payment method selector — expenses only ────────────────────────── */}
{type === 'expense' && (
  <div>
    <label className="text-xs mb-2 block font-semibold" style={{ color: 'var(--text-muted)' }}>
      METODE BAYAR
    </label>
    <div className="grid grid-cols-2 gap-2">
      {[
        { value: 'wallet'      as const, icon: '👛', label: 'Dompet / Bank' },
        { value: 'credit_card' as const, icon: '💳', label: 'Kartu Kredit'  },
      ].map((m) => (
        <button
          key={m.value}
          onClick={() => { setPaymentMethod(m.value); setCreditCardId('') }}
          className="py-2.5 px-3 rounded-xl text-left transition-all"
          style={{
            background: paymentMethod === m.value
              ? 'rgba(34,197,94,0.12)'
              : 'var(--surface-btn)',
            border: `1px solid ${paymentMethod === m.value
              ? 'rgba(34,197,94,0.35)'
              : 'var(--border)'}`,
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">{m.icon}</span>
            <p className="text-xs font-semibold"
              style={{ color: paymentMethod === m.value ? 'var(--accent)' : 'var(--text-primary)' }}>
              {m.label}
            </p>
          </div>
        </button>
      ))}
    </div>

    {/* Credit card dropdown */}
    {paymentMethod === 'credit_card' && (
      <div className="mt-3">
        {creditCards.length === 0 ? (
          <p className="text-xs py-2 text-center" style={{ color: 'var(--text-muted)' }}>
            Belum ada kartu kredit. Tambah di halaman{' '}
            <a href="/credit-card" style={{ color: 'var(--accent)' }}>Kartu Kredit</a>.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {creditCards.map((card) => {
              const remaining = card.limit - card.used
              const pct       = card.limit > 0 ? (card.used / card.limit) * 100 : 0
              const barColor  = pct >= 80 ? '#ef4444' : pct >= 50 ? '#f59e0b' : '#22c55e'
              return (
                <button
                  key={card.id}
                  onClick={() => setCreditCardId(card.id)}
                  className="p-3 rounded-xl text-left transition-all"
                  style={{
                    background: creditCardId === card.id ? 'rgba(34,197,94,0.10)' : 'var(--surface-btn)',
                    border: `1px solid ${creditCardId === card.id ? 'rgba(34,197,94,0.30)' : 'var(--border)'}`,
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {card.name}
                    </p>
                    {creditCardId === card.id && (
                      <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>✓</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    <span>Sisa: <b style={{ color: barColor }}>Rp {remaining.toLocaleString('id-ID')}</b></span>
                    <span>{pct.toFixed(0)}% terpakai</span>
                  </div>
                  <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )}
  </div>
)}
```

---

## 6. Hide wallet picker when paymentMethod === 'credit_card'

Wrap the existing `<WalletPicker label="Wallet" ...>` (for non-transfer expenses) like this:

```tsx
{/* Wallet picker — hide for credit card payments */}
{!(type === 'expense' && paymentMethod === 'credit_card') && (
  // ... existing WalletPicker JSX
)}
```

