'use client'

import { memo } from 'react'
import { ChevronRight } from 'lucide-react'
import type { UnifiedAccount } from '@/types/account'
import { BankLogo } from '@/components/shared/BankLogo'

// ── helpers ──────────────────────────────────────────────────
function fmtBalance(n: number, hidden: boolean): string {
  if (hidden) return 'Rp ******'
  return `Rp ${n.toLocaleString('id-ID')}`
}

/**
 * 3-zone color for credit usage:
 *  0–49%  → green  (safe)
 * 50–79%  → amber  (caution)
 * 80–100% → red    (danger)
 */
function usageColor(pct: number): { bar: string; text: string; label: string } {
  if (pct >= 80) return { bar: '#ef4444', text: '#ef4444', label: 'Hampir penuh' }
  if (pct >= 50) return { bar: '#f59e0b', text: '#f59e0b', label: 'Perlu perhatian' }
  return { bar: 'var(--accent)', text: 'var(--accent)', label: 'Aman' }
}

// ── Credit card row ───────────────────────────────────────────
function CreditRow({ account, hidden }: { account: UnifiedAccount; hidden: boolean }) {
  const used  = account.creditUsed  ?? 0
  const limit = account.creditLimit ?? 0
  const pct   = limit > 0 ? Math.min((used / limit) * 100, 100) : 0
  const { bar, text, label } = usageColor(pct)

  const isZeroBalance = used === 0
  const isInactive    = limit === 0

  if (isInactive) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex flex-col min-w-0">
          <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {account.name}
          </span>
          <span className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Akun belum aktif
          </span>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full ml-3 flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
          —
        </span>
      </div>
    )
  }

  return (
    <>
      {/* top row */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col min-w-0">
          <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {account.name}
          </span>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {account.last4 ? `**** ${account.last4}` : account.providerName}
          </span>
        </div>
        <div className="text-right ml-3 flex-shrink-0">
          <p className="text-[13px] font-bold" style={{ color: text }}>
            {hidden ? 'Rp ******' : `Rp ${used.toLocaleString('id-ID')}`}
          </p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            dari {hidden ? '******' : `Rp ${limit.toLocaleString('id-ID')}`}
          </p>
        </div>
      </div>

      {/* usage bar — 3-zone gradient */}
      <div
        className="mt-2.5 rounded-full overflow-hidden"
        style={{ height: 5, background: 'rgba(255,255,255,0.08)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: bar,
            transition: 'width 600ms cubic-bezier(0.23,1,0.32,1)',
          }}
        />
      </div>

      {/* pct label — bold, contextual */}
      <div className="mt-1.5 flex items-center justify-between">
        {isZeroBalance ? (
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Belum ada transaksi bulan ini
          </span>
        ) : (
          <>
            <span className="text-[10px] font-bold" style={{ color: text }}>
              {pct.toFixed(0)}% terpakai
            </span>
            <span
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{
                background: `${bar}14`,
                color: text,
              }}
            >
              {label}
            </span>
          </>
        )}
      </div>
    </>
  )
}

// ── Bank / e-wallet row ───────────────────────────────────────
function AssetRow({ account, hidden }: { account: UnifiedAccount; hidden: boolean }) {
  const balance = account.balance ?? 0
  const isEmpty = balance === 0

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col min-w-0">
        <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {account.name}
        </span>
        {isEmpty ? (
          <span className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Belum ada saldo · Mulai gunakan akun ini
          </span>
        ) : account.last4 ? (
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            **** {account.last4}
          </span>
        ) : null}
      </div>
      <p
        className="text-[13px] font-bold ml-3 flex-shrink-0"
        style={{ color: isEmpty ? 'var(--text-muted)' : 'var(--text-primary)' }}
      >
        {isEmpty ? 'Rp 0' : fmtBalance(balance, hidden)}
      </p>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────
interface Props {
  account: UnifiedAccount
  hidden?: boolean
  onTap?: (account: UnifiedAccount) => void
  isLast?: boolean
}

export const AccountItem = memo(function AccountItem({
  account,
  hidden = false,
  onTap,
  isLast = false,
}: Props) {
  const isCredit = account.type === 'credit'

  return (
    <button
      onClick={() => onTap?.(account)}
      className="w-full flex items-center gap-3 px-4 transition-colors active:opacity-70"
      style={{
        paddingTop:    16,
        paddingBottom: 16,
        borderBottom:  isLast ? 'none' : '1px solid rgba(255,255,255,0.05)',
        textAlign:     'left',
        background:    'transparent',
      }}
    >
      {/* Provider badge */}
      <BankLogo provider={account.providerId || account.providerName || account.name} size={40} rounded={12} className="flex-shrink-0" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isCredit ? (
          <CreditRow account={account} hidden={hidden} />
        ) : (
          <AssetRow account={account} hidden={hidden} />
        )}
      </div>

      {/* Chevron */}
      <ChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0, opacity: 0.5 }} />
    </button>
  )
})
