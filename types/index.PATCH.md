# types/index.ts — Credit Card Extension Patch

---

## 1. Add CreditCard types (append to end of file)

```ts
// ── CREDIT CARD ──────────────────────────────────────────────────────────────
export interface CreditCard {
  id: string
  userId: string
  name: string
  bankName: string
  last4?: string
  limit: number
  used: number
  billingDate: number   // day of month 1–31
  dueDate: number       // day of month 1–31
  color?: string
  createdAt: string
  updatedAt: string
}

export interface CreditCardPayment {
  id: string
  userId: string
  creditCardId: string
  creditCardName?: string
  walletType: 'cash' | 'bank' | 'ewallet'
  walletAccountId?: string
  amount: number
  date: string
  notes?: string
  createdAt: string
}

export interface CreditCardInsight {
  type: 'warning' | 'info' | 'success' | 'danger'
  icon: string
  title: string
  message: string
}
```

---

## 2. Extend existing Transaction interface

Find the `Transaction` interface and add these optional fields:

```ts
// Inside the Transaction interface:
paymentMethod?:  'wallet' | 'credit_card'
creditCardId?:   string
creditCardName?: string
```

