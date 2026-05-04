import { redirect } from 'next/navigation'

/**
 * Backward-compatibility redirect.
 * Any old links or bookmarks to /credit-card will land on /akun.
 * The original credit card data is fully preserved in Firebase.
 */
export default function CreditCardRedirectPage() {
  redirect('/akun')
}
