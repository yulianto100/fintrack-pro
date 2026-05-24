// ============================================================
// FINUVO — Unified Account Types
// Backward-compatible: does NOT modify existing CreditCard or
// WalletAccount types.  These are ADDITIVE definitions only.
// ============================================================

import type { CreditCard, WalletAccount } from './index'
import { getBankLogo } from '@/lib/bank-logos'

// ── Unified display type ─────────────────────────────────────
export type AccountType = 'bank' | 'credit' | 'ewallet'

export interface UnifiedAccount {
  id:            string
  userId:        string
  type:          AccountType
  name:          string

  // asset accounts (bank / ewallet)
  balance?:      number

  // credit cards
  creditUsed?:   number
  creditLimit?:  number
  billingDate?:  number
  dueDate?:      number
  color?:        string

  accountNumber?: string
  last4?:         string

  // provider (bank name / wallet brand)
  providerId?:    string
  providerName?:  string

  createdAt:     string
  updatedAt:     string

  // original source record — kept for features that need it
  _raw?: WalletAccount | CreditCard
}

// ── Mappers ───────────────────────────────────────────────────

export function walletAccountToUnified(w: WalletAccount): UnifiedAccount {
  return {
    id:           w.id,
    userId:       w.userId,
    type:         w.type as AccountType, // 'bank' | 'ewallet'
    name:         w.name,
    balance:      w.balance,
    providerId:   deriveProviderId(w.name),
    providerName: w.name,
    createdAt:    w.createdAt,
    updatedAt:    w.updatedAt,
    _raw:         w,
  }
}

export function creditCardToUnified(c: CreditCard): UnifiedAccount {
  return {
    id:           c.id,
    userId:       c.userId,
    type:         'credit',
    name:         c.name,
    creditUsed:   c.used,
    creditLimit:  c.limit,
    billingDate:  c.billingDate,
    dueDate:      c.dueDate,
    color:        c.color,
    last4:        c.last4,
    providerId:   deriveProviderId(c.bankName),
    providerName: c.bankName,
    createdAt:    c.createdAt,
    updatedAt:    c.updatedAt,
    _raw:         c,
  }
}

// ── Provider helpers ──────────────────────────────────────────

function deriveProviderId(name: string): string {
  return (name ?? '').toLowerCase().replace(/\s+/g, '')
}

export interface ProviderInfo {
  label:  string
  abbr:   string
  color:  string
  bg:     string
}

export function getProviderInfo(providerId: string, fallbackName: string): ProviderInfo {
  const id = (providerId ?? '').toLowerCase().replace(/\s+/g, '')
  const logo = getBankLogo(providerId) ?? getBankLogo(fallbackName)
  if (logo) {
    return {
      label: logo.name,
      abbr: logo.abbr,
      color: logo.brandColor,
      bg: `${logo.brandColor}26`,
    }
  }

  const abbr = fallbackName
    ?.split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase() || '?'
  return { label: fallbackName || id, abbr, color: 'var(--accent)', bg: 'var(--accent-dim)' }
}

// ── Summary calculations ──────────────────────────────────────

export interface AccountSummaryData {
  aset:       number
  liabilitas: number
  net:        number
}

export function calcAccountSummary(accounts: UnifiedAccount[]): AccountSummaryData {
  const safe = Array.isArray(accounts) ? accounts : []

  const aset = safe
    .filter(a => a.type === 'bank' || a.type === 'ewallet')
    .reduce((s, a) => s + (a.balance ?? 0), 0)

  const liabilitas = safe
    .filter(a => a.type === 'credit')
    .reduce((s, a) => s + (a.creditUsed ?? 0), 0)

  return { aset, liabilitas, net: aset - liabilitas }
}
