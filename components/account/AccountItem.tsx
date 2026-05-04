'use client'

import { memo, useState } from 'react'
import { ChevronRight }  from 'lucide-react'
import type { UnifiedAccount } from '@/types/account'
import { getProviderInfo }     from '@/types/account'

// ── Logo map by provider name/id ──────────────────────────────
const PROVIDER_LOGOS: Record<string, string> = {
  bca:        'https://upload.wikimedia.org/wikipedia/commons/5/5c/Bank_Central_Asia.svg',
  mandiri:    'https://upload.wikimedia.org/wikipedia/commons/a/ad/Bank_Mandiri_logo_2016.svg',
  bri:        'https://upload.wikimedia.org/wikipedia/commons/6/68/BANK_BRI_logo.svg',
  bni:        'https://upload.wikimedia.org/wikipedia/commons/5/55/BNI_logo.svg',
  cimb:       'https://upload.wikimedia.org/wikipedia/commons/7/7e/CIMB_Niaga.svg',
  jago:       'https://upload.wikimedia.org/wikipedia/commons/b/bd/Bank_Jago_logo.svg',
  jenius:     'https://upload.wikimedia.org/wikipedia/commons/f/f0/Jenius_logo.svg',
  bsi:        'https://upload.wikimedia.org/wikipedia/commons/0/06/Bank_Syariah_Indonesia.svg',
  permata:    'https://upload.wikimedia.org/wikipedia/commons/a/a3/Bank_Permata.svg',
  danamon:    'https://upload.wikimedia.org/wikipedia/commons/c/cc/Bank-danamon.svg',
  ocbc:       'https://upload.wikimedia.org/wikipedia/commons/2/27/OCBC_NISP.svg',
  btn:        'https://upload.wikimedia.org/wikipedia/commons/5/52/Logo_Bank_BTN.svg',
  sinarmas:   'https://upload.wikimedia.org/wikipedia/commons/0/09/Bank_Sinarmas_logo.svg',
  panin:      'https://upload.wikimedia.org/wikipedia/commons/e/e8/Panin_Bank_logo.svg',
  mega:       'https://upload.wikimedia.org/wikipedia/commons/d/db/Logo-bank-mega.svg',
  gopay:      'https://upload.wikimedia.org/wikipedia/commons/8/86/Gopay_logo.svg',
  ovo:        'https://upload.wikimedia.org/wikipedia/commons/e/eb/Logo_ovo_purple.svg',
  dana:       'https://upload.wikimedia.org/wikipedia/commons/7/72/Logo_dana_blue.svg',
  shopeepay:  'https://upload.wikimedia.org/wikipedia/commons/f/fe/Shopee.svg',
  linkaja:    'https://upload.wikimedia.org/wikipedia/commons/8/85/LinkAja.svg',
  flip:       'https://upload.wikimedia.org/wikipedia/commons/c/c6/Flip_logo_%28company%29.svg',
}

function getLogoUrl(providerId?: string, providerName?: string): string | null {
  const key = ((providerId ?? '') + ' ' + (providerName ?? '')).toLowerCase().replace(/\s+/g, '')
  for (const [id, url] of Object.entries(PROVIDER_LOGOS)) {
    if (key.includes(id)) return url
  }
  return null
}

// ── helpers ──────────────────────────────────────────────────
function fmtBalance(n: number, hidden: boolean): string {
  if (hidden) return 'Rp ••••••'
  return `Rp ${n.toLocaleString('id-ID')}`
}

function usageColor(pct: number) {
  if (pct >= 80) return '#ef4444'
  if (pct >= 50) return '#f59e0b'
  return 'var(--accent)'
}

// ── Provider icon badge ───────────────────────────────────────
function ProviderBadge({ providerId, providerName }: { providerId?: string; providerName?: string }) {
  const info    = getProviderInfo(providerId ?? '', providerName ?? '')
  const logoUrl = getLogoUrl(providerId, providerName)
  const [errored, setErrored] = useState(false)

  return (
    <div
      className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden"
      style={{ background: info.bg }}
    >
      {logoUrl && !errored ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={providerName ?? ''}
          width={28}
          height={28}
          onError={() => setErrored(true)}
          style={{ objectFit: 'contain', width: 28, height: 28 }}
        />
      ) : (
        <span
          className="text-[10px] font-extrabold tracking-tight leading-none"
          style={{ color: info.color }}
        >
          {info.abbr}
        </span>
      )}
    </div>
  )
}

// ── Credit card row ───────────────────────────────────────────
function CreditRow({ account, hidden }: { account: UnifiedAccount; hidden: boolean }) {
  const used  = account.creditUsed  ?? 0
  const limit = account.creditLimit ?? 0
  const pct   = limit > 0 ? Math.min((used / limit) * 100, 100) : 0
  const bar   = usageColor(pct)

  return (
    <>
      {/* top row */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col min-w-0">
          <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {account.name}
          </span>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {account.last4 ? `•••• ${account.last4}` : account.providerName}
          </span>
        </div>
        <div className="text-right ml-3 flex-shrink-0">
          <p className="text-[12px] font-bold" style={{ color: bar }}>
            {hidden ? 'Rp ••••••' : `Rp ${used.toLocaleString('id-ID')}`}
          </p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            dari {hidden ? '••••••' : `Rp ${limit.toLocaleString('id-ID')}`}
          </p>
        </div>
      </div>

      {/* usage bar */}
      <div
        className="mt-2.5 rounded-full overflow-hidden"
        style={{ height: 4, background: 'rgba(255,255,255,0.08)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: bar }}
        />
      </div>

      {/* pct label */}
      <p className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
        {pct.toFixed(0)}% terpakai
      </p>
    </>
  )
}

// ── Bank / e-wallet row ───────────────────────────────────────
function AssetRow({ account, hidden }: { account: UnifiedAccount; hidden: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col min-w-0">
        <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {account.name}
        </span>
        {account.last4 && (
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            •••• {account.last4}
          </span>
        )}
      </div>
      <p className="text-[13px] font-bold ml-3 flex-shrink-0" style={{ color: 'var(--text-primary)' }}>
        {fmtBalance(account.balance ?? 0, hidden)}
      </p>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────
interface Props {
  account:    UnifiedAccount
  hidden?:    boolean
  onTap?:     (account: UnifiedAccount) => void
  isLast?:    boolean
}

export const AccountItem = memo(function AccountItem({
  account,
  hidden  = false,
  onTap,
  isLast  = false,
}: Props) {
  const isCredit = account.type === 'credit'

  return (
    <button
      onClick={() => onTap?.(account)}
      className="w-full flex items-center gap-3 px-4 transition-colors active:opacity-70"
      style={{
        paddingTop:    14,
        paddingBottom: 14,
        borderBottom:  isLast ? 'none' : '1px solid var(--border)',
        textAlign:     'left',
        background:    'transparent',
      }}
    >
      {/* Provider badge */}
      <ProviderBadge providerId={account.providerId} providerName={account.providerName} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isCredit ? (
          <CreditRow account={account} hidden={hidden} />
        ) : (
          <AssetRow account={account} hidden={hidden} />
        )}
      </div>

      {/* Chevron */}
      <ChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
    </button>
  )
})
