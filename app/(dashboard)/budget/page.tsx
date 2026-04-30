/**
 * app/(dashboard)/budget/page.tsx
 *
 * This page now redirects to the unified Goals page (Budget tab).
 * All budget functionality lives at /goals?tab=budget.
 *
 * This redirect preserves any external links to /budget while
 * keeping the navigation clean with a single "Goals" entry.
 */
import { redirect } from 'next/navigation'

export default function BudgetRedirectPage() {
  redirect('/goals?tab=budget')
}
