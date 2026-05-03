# app/(dashboard)/page.tsx — Dashboard Integration Patch

Add Credit Card section to the existing dashboard page.

---

## 1. Add import (top of file, with other imports)

```tsx
import { CreditCardDashboardSection } from '@/components/credit-card/CreditCardDashboardSection'
```

---

## 2. Add section BEFORE the `<QuickAddFAB>` line (end of JSX return)

Find:
```tsx
      {/* ── Recent transactions ──────────────────────────────────────────────── */}
```

Insert BEFORE that block:
```tsx
      {/* ── Credit Card Summary ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.24 }}
      >
        <CreditCardDashboardSection hidden={hidden} />
      </motion.div>
```

