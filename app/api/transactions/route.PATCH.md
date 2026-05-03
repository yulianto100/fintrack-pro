# /api/transactions/route.ts — Credit Card Extension Patch

Apply to existing `app/api/transactions/route.ts`.

---

## In POST handler — after existing validations, before `const db = getAdminDatabase()`

Add wallet field override for credit card payments:

```ts
// Wallet validation is skipped for credit card expenses —
// they do not deduct from wallet balance.
const isCreditCardExpense =
  type === 'expense' && body.paymentMethod === 'credit_card' && body.creditCardId

// Override balance check for credit card payments
const needsBalanceCheck = (type === 'expense' || type === 'transfer') && !isCreditCardExpense
```

Replace:
```ts
const needsBalanceCheck = type === 'expense' || type === 'transfer'
```
With:
```ts
const needsBalanceCheck = (type === 'expense' || type === 'transfer') && !isCreditCardExpense
```

---

## In POST handler — after wallet validation, add credit card limit check

```ts
// ── CREDIT CARD VALIDATION ────────────────────────────────────────────────
if (isCreditCardExpense) {
  const ccSnap = await db.ref(`users/${userId}/creditCards/${body.creditCardId}`).get()
  if (!ccSnap.exists()) {
    return NextResponse.json({ success: false, error: 'Kartu kredit tidak ditemukan' }, { status: 400 })
  }
  const cc = ccSnap.val()
  const remaining = cc.limit - cc.used
  if (amt > remaining) {
    return NextResponse.json({
      success: false,
      error: `Melebihi sisa limit kartu. Sisa limit: Rp ${remaining.toLocaleString('id-ID')}`,
    }, { status: 400 })
  }
}
```

---

## In POST handler — update the `tx` object to include credit card fields

After `const tx: Transaction = {`, add:
```ts
paymentMethod:  body.paymentMethod  || 'wallet',
creditCardId:   body.creditCardId   || undefined,
creditCardName: body.creditCardName || undefined,
```

---

## After `await newRef.set(tx)` — increment creditCard.used if CC expense

```ts
// ── UPDATE CREDIT CARD USED AMOUNT ───────────────────────────────────────
if (isCreditCardExpense) {
  const ccRef = db.ref(`users/${userId}/creditCards/${body.creditCardId}`)
  const ccSnap = await ccRef.get()
  if (ccSnap.exists()) {
    const cc = ccSnap.val()
    await ccRef.update({
      used:      (cc.used || 0) + amt,
      updatedAt: new Date().toISOString(),
    })
  }
}
```

