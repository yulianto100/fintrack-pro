# Navigation — Add Credit Card Link

Find your sidebar/bottom nav component (e.g. `components/layout/Sidebar.tsx`,
`components/layout/BottomNav.tsx`, or `app/(dashboard)/layout.tsx`).

Add this nav item alongside existing items:

```tsx
{ href: '/credit-card', icon: <CreditCard size={20} />, label: 'Kartu Kredit' }
```

Import:
```tsx
import { CreditCard } from 'lucide-react'
```

