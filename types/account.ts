// ============================================================
// FINUVO — Unified Account Types
// Backward-compatible: does NOT modify existing CreditCard or
// WalletAccount types.  These are ADDITIVE definitions only.
// ============================================================

import type { CreditCard, WalletAccount } from './index'

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

const PROVIDER_MAP: Record<string, ProviderInfo> = {
  bca:          { label: 'BCA',        abbr: 'BCA', color: '#005ea6', bg: 'rgba(0,94,166,0.15)'    },
  mandiri:      { label: 'Mandiri',    abbr: 'MDR', color: '#003f80', bg: 'rgba(0,63,128,0.15)'    },
  bri:          { label: 'BRI',        abbr: 'BRI', color: '#00529b', bg: 'rgba(0,82,155,0.15)'    },
  bni:          { label: 'BNI',        abbr: 'BNI', color: '#f68b1e', bg: 'rgba(246,139,30,0.15)'  },
  cimbniaga:    { label: 'CIMB',       abbr: 'CMB', color: '#cc0001', bg: 'rgba(204,0,1,0.15)'     },
  cimb:         { label: 'CIMB',       abbr: 'CMB', color: '#cc0001', bg: 'rgba(204,0,1,0.15)'     },
  ocbc:         { label: 'OCBC',       abbr: 'OBC', color: '#e2231a', bg: 'rgba(226,35,26,0.15)'   },
  danamon:      { label: 'Danamon',    abbr: 'DNM', color: '#e94e1b', bg: 'rgba(233,78,27,0.15)'   },
  permata:      { label: 'Permata',    abbr: 'PMT', color: '#e30613', bg: 'rgba(227,6,19,0.15)'    },
  jago:         { label: 'Jago',       abbr: 'JGO', color: '#ff6a00', bg: 'rgba(255,106,0,0.15)'   },
  jenius:       { label: 'Jenius',     abbr: 'JNS', color: '#0099a9', bg: 'rgba(0,153,169,0.15)'   },
  bsimobile:    { label: 'BSI',        abbr: 'BSI', color: '#00563f', bg: 'rgba(0,86,63,0.15)'     },
  bsi:          { label: 'BSI',        abbr: 'BSI', color: '#00563f', bg: 'rgba(0,86,63,0.15)'     },
  gopay:        { label: 'GoPay',      abbr: 'GP',  color: '#00aed6', bg: 'rgba(0,174,214,0.15)'   },
  ovo:          { label: 'OVO',        abbr: 'OVO', color: '#4c3494', bg: 'rgba(76,52,148,0.15)'   },
  dana:         { label: 'DANA',       abbr: 'DNA', color: '#118eea', bg: 'rgba(17,142,234,0.15)'  },
  shopeepay:    { label: 'ShopeePay', abbr: 'SPY', color: '#ee4d2d', bg: 'rgba(238,77,45,0.15)'   },
  linkaja:      { label: 'LinkAja',   abbr: 'LJA', color: '#e82529', bg: 'rgba(232,37,41,0.15)'   },
  flip:         { label: 'Flip',       abbr: 'FLP', color: '#3d7cbf', bg: 'rgba(61,124,191,0.15)'  },
}

export function getProviderInfo(providerId: string, fallbackName: string): ProviderInfo {
  const id = (providerId ?? '').toLowerCase().replace(/\s+/g, '')
  // exact match
  if (PROVIDER_MAP[id]) return PROVIDER_MAP[id]
  // partial match
  for (const [key, info] of Object.entries(PROVIDER_MAP)) {
    if (id.includes(key) || key.includes(id)) return info
  }
  // fallback: derive abbr and use accent color
  const abbr = fallbackName
    ?.split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase() || '?'
  return { label: fallbackName || id, abbr, color: '#22c55e', bg: 'rgba(34,197,94,0.15)' }
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
