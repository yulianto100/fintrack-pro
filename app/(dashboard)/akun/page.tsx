'use client'

import { useState, useMemo, useCallback, memo, useEffect, useRef, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import {
  ChevronLeft, Trash2, ReceiptText, ArrowRight,
  Building2, CreditCard as CreditCardIcon, Wallet,
  Hash, Calendar, TrendingUp, ArrowDownUp,
  Phone, ShieldCheck, Repeat, AlertTriangle,
} from 'lucide-react'

import { useAccounts }        from '@/hooks/useAccounts'
import { AccountSummary }     from '@/components/account/AccountSummary'
import { AccountInsights }    from '@/components/account/AccountInsights'
import { AccountTabs, type AccountTab } from '@/components/account/AccountTabs'
import { AccountSection }     from '@/components/account/AccountSection'
import { AccountItem }        from '@/components/account/AccountItem'
import { AccountFAB }         from '@/components/account/AccountFAB'
import { AddAccountModal }    from '@/components/account/AddAccountModal'
import { PayCreditCardModal } from '@/components/credit-card/PayCreditCardModal'
import { CreditCardTransactionList } from '@/components/credit-card/CreditCardTransactionList'
import { AccountTransactionList }    from '@/components/account/AccountTransactionList'

import {
  LiveIndicator,
  InsightStrip,
  QuickActionsRow,
  CreditUsageBar,
  BillingStatusCard,
  InfoSection,
  SectionLabel,
  StatusBadge,
  fmtRp,
  getBillingStatus,
  getCreditUsageColor,
  getAccountInsights,
  type InfoGroupData,
  type QuickActionItem,
} from '@/components/account/AccountDetailShared'

import type { UnifiedAccount, AccountType } from '@/types/account'
import { getProviderInfo, calcAccountSummary } from '@/types/account'
import type { CreditCard } from '@/types'

// ── Provider logo map (same as AccountItem) ─────────────────
const PROVIDER_LOGOS: Record<string, string> = {
  bca:       '/bank-icons/bca.png',
  mandiri:   '/bank-icons/mandiri.png',
  bri:       '/bank-icons/bri.png',
  bni:       '/bank-icons/bni.png',
  cimb:      '/bank-icons/cimb.png',
  jago:      '/bank-icons/jago.png',
  jenius:    '/bank-icons/jenius.png',
  bsi:       '/bank-icons/bsi.png',
  permata:   '/bank-icons/permata.png',
  danamon:   '/bank-icons/danamon.png',
  ocbc:      '/bank-icons/ocbc.png',
  btn:       '/bank-icons/btn.png',
  sinarmas:  '/bank-icons/sinarmas.png',
  panin:     '/bank-icons/panin.png',
  mega:      '/bank-icons/mega.png',
  gopay:     '/bank-icons/gopay.png',
  ovo:       '/bank-icons/ovo.png',
  dana:      '/bank-icons/dana.png',
  shopeepay: '/bank-icons/shopeepay.png',
  linkaja:   '/bank-icons/linkaja.png',
  flip:      '/bank-icons/flip.png',
}

function getLogoUrl(providerId?: string, providerName?: string): string | null {
  const key = ((providerId ?? '') + ' ' + (providerName ?? '')).toLowerCase().replace(/\s+/g, '')
  for (const [id, url] of Object.entries(PROVIDER_LOGOS)) {
    if (key.includes(id)) return url
  }
  return null
}

function ProviderIcon({ providerId, providerName, size = 44 }: {
  providerId?: string; providerName?: string; size?: number
}) {
  const info    = getProviderInfo(providerId ?? '', providerName ?? '')
  const logoUrl = getLogoUrl(providerId, providerName)
  const [errored, setErrored] = useState(false)
  const hasLogo = logoUrl && !errored

  return (
    <div className="flex-shrink-0 overflow-hidden" style={{
      width: size, height: size, borderRadius: 12,
      background:  hasLogo ? 'transparent' : info.bg,
      border:      hasLogo ? '1px solid rgba(255,255,255,0.08)' : 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {hasLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl!} alt={providerName ?? ''} onError={() => setErrored(true)}
          style={{ width: size, height: size, objectFit: 'cover', display: 'block' }} />
      ) : (
        <span className="font-extrabold" style={{ color: info.color, fontSize: size * 0.26 }}>
          {info.abbr}
        </span>
      )}
    </div>
  )
}

// ── Tab ↔ URL param mapping ─────────────────────────────────
const TAB_TO_PARAM: Record<AccountTab, string> = {
  all: '', bank: 'rekening', credit: 'kredit', ewallet: 'ewallet',
}
const PARAM_TO_TAB: Record<string, AccountTab> = {
  rekening: 'bank', kredit: 'credit', ewallet: 'ewallet',
}

// ── Due date helper ─────────────────────────────────────────
function getDueDays(dueDate: number): { days: number; label: string; urgent: boolean } {
  const today = new Date()
  let d = new Date(today.getFullYear(), today.getMonth(), dueDate)
  if (d < today) d = new Date(today.getFullYear(), today.getMonth() + 1, dueDate)
  const days  = Math.ceil((d.getTime() - today.getTime()) / 86_400_000)
  const label = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  return { days, label, urgent: days <= 7 }
}

// ── CREDIT CARD DETAIL ──────────────────────────────────────
const CreditDetailSheet = memo(function CreditDetailSheet({ account, hidden, onClose, onDelete, onPay }: {
  account: UnifiedAccount; hidden: boolean; onClose: () => void; onDelete: () => void; onPay?: () => void
}) {
  const [infoExpanded, setInfoExpanded] = useState(false)

  const used      = account.creditUsed ?? 0
  const limit     = account.creditLimit ?? 0
  const pct       = limit > 0 ? Math.min((used / limit) * 100, 100) : 0
  const due       = account.dueDate ? getDueDays(account.dueDate) : null
  const billing   = getBillingStatus(pct, due?.days ?? 999)
  const minPayment = Math.round(used * 0.10)

  const cardTypeLabel = (() => {
    const id = (account.providerId ?? '').toLowerCase()
    if (id.includes('bni'))                         return 'Visa Gold'
    if (id.includes('mandiri'))                     return 'Visa'
    if (id.includes('bri'))                         return 'Mastercard'
    if (id.includes('cimb') || id.includes('ocbc')) return 'Visa Platinum'
    return 'Visa'
  })()

  // Insights
  const insights = getAccountInsights({
    type: 'credit',
    usagePercent: Math.round(pct),
    monthlyChangePct: 20, // TODO: wire from real data
  })

  // Quick actions
  const quickActions: QuickActionItem[] = [
    { label: 'Bayar Sekarang', icon: <ReceiptText size={14} />, primary: true, onClick: onPay },
    { label: 'Lihat Tagihan',  icon: <ArrowRight size={14} />,  primary: false },
  ]

  // Info groups
  const infoGroups: InfoGroupData[] = [
    {
      title: 'Informasi Kartu',
      rows: [
        { icon: <Building2 size={14} />,   label: 'Bank Penerbit',   value: account.providerName || '-' },
        { icon: <Hash size={14} />,         label: 'Jenis Kartu',     value: cardTypeLabel },
        { icon: <Calendar size={14} />,     label: 'Tanggal Tagihan', value: `${account.billingDate} tiap bulan` },
        { icon: <AlertTriangle size={14} />,label: 'Jatuh Tempo',     value: `${account.dueDate} tiap bulan` },
      ],
    },
    {
      title: 'Detail Finansial',
      rows: [
        { icon: <CreditCardIcon size={14} />, label: 'Limit Total',  value: fmtRp(limit, hidden) },
        { icon: <TrendingUp size={14} />,     label: 'Mata Uang',    value: 'IDR' },
      ],
    },
  ]

  return (
    <motion.div key="detail-credit"
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className="absolute inset-0 overflow-y-auto pb-10"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-2 pb-3">
        <button onClick={onClose} className="flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
          <ChevronLeft size={18} /><span className="text-[13px] font-semibold">Akun</span>
        </button>
        <button onClick={onDelete} className="p-2 rounded-xl" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)' }}>
          <Trash2 size={16} />
        </button>
      </div>

      {/* Card identity */}
      <div className="px-4 mb-1">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[18px] font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-syne)' }}>
              {account.name}
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {account.last4 ? `••••• ${account.last4}` : ''} · {cardTypeLabel}
            </p>
          </div>
          <StatusBadge
            label={due ? (due.urgent ? '⚠ Segera bayar' : '✓ Aktif') : '✓ Aktif'}
            variant={due?.urgent ? 'warn' : 'safe'}
          />
        </div>
      </div>

      {/* Hero balance card */}
      <div className="mx-4 rounded-3xl overflow-hidden mb-4 mt-3 relative" style={{
        background: `linear-gradient(145deg, #0B3B2E 0%, #071f18 60%, #040f0b 100%)`,
        border: '1px solid rgba(34,197,94,0.15)', padding: '20px', boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
      }}>
        <div className="absolute pointer-events-none" style={{
          top: 0, right: 0, width: 140, height: 140, borderRadius: '50%',
          background: `radial-gradient(circle, ${account.color || '#22c55e'}18 0%, transparent 70%)`,
        }} />

        {/* Live indicator */}
        <div className="mb-3">
          <LiveIndicator text="Diperbarui baru saja" />
        </div>

        {/* Balance */}
        <p className="text-[9px] font-bold tracking-[0.18em] mb-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>TAGIHAN BERJALAN</p>
        <p className="text-[30px] font-bold leading-none" style={{
          color: getCreditUsageColor(pct), fontFamily: 'var(--font-syne)',
        }}>
          {fmtRp(used, hidden)}
        </p>
      </div>

      {/* Insight strip */}
      {insights.length > 0 && <InsightStrip lines={insights} />}

      {/* Credit usage bar */}
      <CreditUsageBar used={used} limit={limit} hidden={hidden} billingStatus={billing} />

      {/* Billing status */}
      {due && (
        <BillingStatusCard
          dueLabel={due.label}
          daysLeft={due.days}
          urgent={due.urgent}
          minimumPayment={minPayment}
          totalBill={used}
          hidden={hidden}
        />
      )}

      {/* Quick actions */}
      <QuickActionsRow actions={quickActions} />

      {/* Info groups */}
      <InfoSection groups={infoGroups} />

      {/* Transactions */}
      <div className="mb-4">
        <SectionLabel title="Transaksi Terakhir" action="Lihat Semua" />
        <div className="px-4">
          <CreditCardTransactionList creditCardId={account.id} hidden={hidden} />
        </div>
      </div>
    </motion.div>
  )
})

// ── BANK / EWALLET DETAIL ───────────────────────────────────
const WalletDetailSheet = memo(function WalletDetailSheet({ account, hidden, onClose, onDelete }: {
  account: UnifiedAccount; hidden: boolean; onClose: () => void; onDelete: () => void
}) {
  const isEwallet = account.type === 'ewallet'
  const balance   = account.balance ?? 0

  // Insights
  const insights = getAccountInsights(
    isEwallet
      ? { type: 'ewallet', lastTopUpDays: 2, topCategory: 'Transport' }
      : { type: 'bank', biggestCategory: 'Transfer', monthlyChangePct: -8 }
  )

  // Quick actions
  const quickActions: QuickActionItem[] = isEwallet
    ? [
        { label: 'Top Up', icon: <TrendingUp size={14} />, primary: true },
        { label: 'Kirim',  icon: <ArrowRight size={14} />, primary: false },
      ]
    : [
        { label: 'Transfer',      icon: <ArrowDownUp size={14} />, primary: true },
        { label: 'Tambah Saldo',  icon: <TrendingUp size={14} />,  primary: false },
      ]

  // Info groups
  const accountInfoRows = [
    { icon: <Building2 size={14} />,  label: 'Provider',    value: account.providerName || '-' },
    { icon: <Wallet size={14} />,     label: 'Tipe Akun',   value: isEwallet ? 'E-Wallet' : 'Rekening Bank' },
    { icon: <ShieldCheck size={14} />,label: 'Status',      value: <StatusBadge label="✓ Aktif" variant="safe" /> },
    ...(account.accountNumber
      ? [{ icon: <Hash size={14} />, label: 'No. Rekening', value: account.accountNumber }]
      : []),
    ...(isEwallet && account.accountNumber
      ? [{ icon: <Phone size={14} />, label: 'No. HP Terdaftar', value: account.accountNumber }]
      : []),
  ]

  const financialInfoRows = [
    { icon: <TrendingUp size={14} />,  label: 'Total keluar bulan ini', value: fmtRp(0, hidden) },
    { icon: <Repeat size={14} />,      label: 'Transaksi bulan ini',    value: '0 transaksi' },
  ]

  const infoGroups: InfoGroupData[] = [
    { title: 'Informasi Akun',    rows: accountInfoRows },
    { title: 'Detail Finansial',  rows: financialInfoRows },
  ]

  return (
    <motion.div key="detail-wallet"
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className="absolute inset-0 overflow-y-auto pb-10"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-2 pb-3">
        <button onClick={onClose} className="flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
          <ChevronLeft size={18} /><span className="text-[13px] font-semibold">Akun</span>
        </button>
        <button onClick={onDelete} className="p-2 rounded-xl" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)' }}>
          <Trash2 size={16} />
        </button>
      </div>

      {/* Identity */}
      <div className="px-4 mb-1">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[18px] font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-syne)' }}>
              {account.name}
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {isEwallet ? 'E-Wallet' : 'Rekening Bank'} · {account.providerName || '-'}
            </p>
          </div>
          <StatusBadge label="✓ Aktif" variant="safe" />
        </div>
      </div>

      {/* Hero balance card */}
      <div className="mx-4 rounded-3xl overflow-hidden mb-4 mt-3" style={{
        background: 'var(--surface-card)',
        border: '1px solid rgba(255,255,255,0.07)',
        padding: '20px',
      }}>
        {/* Provider + live */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ProviderIcon providerId={account.providerId} providerName={account.providerName} size={44} />
            <div>
              <p className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>{account.name}</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{isEwallet ? 'E-Wallet' : 'Rekening Bank'}</p>
            </div>
          </div>
        </div>

        {/* Balance */}
        <p className="text-[9px] font-bold tracking-[0.18em] mb-1" style={{ color: 'var(--text-muted)' }}>SALDO</p>
        <p className="text-[32px] font-bold leading-none" style={{ color: 'var(--accent)', fontFamily: 'var(--font-syne)', fontVariantNumeric: 'tabular-nums' }}>
          {fmtRp(balance, hidden)}
        </p>

        {balance === 0 && (
          <p className="text-[12px] mt-2" style={{ color: 'var(--text-muted)' }}>
            Belum ada saldo · Mulai gunakan akun ini
          </p>
        )}
      </div>

      {/* Insight strip */}
      {insights.length > 0 && <InsightStrip lines={insights} />}

      {/* Quick actions */}
      <QuickActionsRow actions={quickActions} />

      {/* Info groups */}
      <InfoSection groups={infoGroups} />

      {/* Transactions */}
      <div className="mb-4">
        <SectionLabel title="Transaksi Terakhir" />
        <div className="px-4">
          <AccountTransactionList
            accountId={account.id}
            accountType={account.type as 'bank' | 'ewallet'}
            hidden={hidden}
          />
        </div>
      </div>
    </motion.div>
  )
})

// ── Empty state ─────────────────────────────────────────────
function EmptyState({ type, onAdd }: { type: string; onAdd: () => void }) {
  const config: Record<string, { emoji: string; label: string; hint: string }> = {
    bank:    { emoji: '🏦', label: 'rekening bank',  hint: 'Hubungkan rekening untuk mulai melacak saldo' },
    credit:  { emoji: '💳', label: 'kartu kredit',   hint: 'Pantau limit dan tagihan kartu kamu' },
    ewallet: { emoji: '📱', label: 'e-wallet',        hint: 'Tambah GoPay, OVO, DANA, dan lainnya' },
    all:     { emoji: '💰', label: 'akun',            hint: 'Tambahkan akun untuk mulai melacak keuangan kamu' },
  }
  const { emoji, label, hint } = config[type] ?? config['all']
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4" style={{ background: 'var(--accent-dim)' }}>
        <span className="text-3xl">{emoji}</span>
      </div>
      <p className="text-[15px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Belum ada {label}</p>
      <p className="text-[12px] mb-5 max-w-xs" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>{hint}</p>
      <button onClick={onAdd} className="px-6 py-2.5 rounded-full text-[13px] font-bold" style={{ background: 'var(--accent)', color: '#fff' }}>
        Tambah Sekarang
      </button>
    </motion.div>
  )
}

// ── Main page content ────────────────────────────────────────
function AkunContent() {
  const { accounts, loading, refetch, deleteAccount, payBill } = useAccounts()
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const router       = useRouter()

  const [hidden,     setHidden]    = useState(false)
  const [activeTab,  setActiveTab] = useState<AccountTab>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [addType,    setAddType]   = useState<AccountType | null | 'open'>(null)
  const [payTarget,  setPayTarget] = useState<UnifiedAccount | null>(null)

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && PARAM_TO_TAB[tabParam]) setActiveTab(PARAM_TO_TAB[tabParam])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleTabChange = useCallback((tab: AccountTab) => {
    setActiveTab(tab)
    const param = TAB_TO_PARAM[tab]
    router.replace(param ? `/akun?tab=${param}` : '/akun', { scroll: false })
  }, [router])

  const isFirstMount = useRef(true)
  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return }
    setSelectedId(null)
  }, [pathname])

  useEffect(() => {
    const handleNavReset = () => setSelectedId(null)
    window.addEventListener('akun:reset', handleNavReset)
    return () => window.removeEventListener('akun:reset', handleNavReset)
  }, [])

  const selected = useMemo(
    () => selectedId ? (accounts.find(a => a.id === selectedId) ?? null) : null,
    [selectedId, accounts]
  )

  const filtered = useMemo(
    () => activeTab === 'all' ? accounts : accounts.filter(a => a.type === activeTab),
    [accounts, activeTab]
  )
  const banks    = useMemo(() => filtered.filter(a => a.type === 'bank'),    [filtered])
  const credits  = useMemo(() => filtered.filter(a => a.type === 'credit'),  [filtered])
  const ewallets = useMemo(() => filtered.filter(a => a.type === 'ewallet'), [filtered])
  const summary  = useMemo(() => calcAccountSummary(filtered), [filtered])

  const handleDelete = useCallback(async (account: UnifiedAccount) => {
    if (!confirm(`Hapus "${account.name}"?`)) return
    try { await deleteAccount(account); setSelectedId(null) } catch { /* toast handled */ }
  }, [deleteAccount])

  const showAll = activeTab === 'all'

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: 'transparent' }}>
      <AnimatePresence mode="popLayout" initial={false}>
        {selected ? (
          selected.type === 'credit' ? (
            <CreditDetailSheet key={`credit-${selected.id}`}
              account={selected} hidden={hidden}
              onClose={() => setSelectedId(null)}
              onDelete={() => handleDelete(selected)}
              onPay={() => setPayTarget(selected)}
            />
          ) : (
            <WalletDetailSheet key={`wallet-${selected.id}`}
              account={selected} hidden={hidden}
              onClose={() => setSelectedId(null)}
              onDelete={() => handleDelete(selected)}
            />
          )
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {/* Page header */}
            <div className="px-4 pt-4 pb-3">
              <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em', fontFamily: 'var(--font-syne)' }}>
                Akun
              </h1>
              <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Semua rekening dan kartu dalam satu tempat
              </p>
            </div>

            <div className="mb-3">
              <AccountSummary summary={summary} hidden={hidden} onToggleHidden={() => setHidden(v => !v)} />
            </div>

            {!loading && accounts.length > 0 && (
              <div className="mb-4">
                <AccountInsights summary={summary} accounts={accounts} />
              </div>
            )}

            <div className="mb-5">
              <AccountTabs active={activeTab} onChange={handleTabChange} />
            </div>

            {loading && (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)' }} />
              </div>
            )}

            {!loading && (
              <div className="flex flex-col gap-5 pb-32">
                {(showAll || activeTab === 'bank') && banks.length > 0 && (
                  <AccountSection title="Rekening Bank" count={banks.length} delay={0}>
                    {banks.map((a, i) => (
                      <AccountItem key={a.id} account={a} hidden={hidden} onTap={a => setSelectedId(a.id)} isLast={i === banks.length - 1} />
                    ))}
                  </AccountSection>
                )}
                {(showAll || activeTab === 'credit') && credits.length > 0 && (
                  <AccountSection title="Kartu Kredit" count={credits.length} delay={0.05}>
                    {credits.map((a, i) => (
                      <AccountItem key={a.id} account={a} hidden={hidden} onTap={a => setSelectedId(a.id)} isLast={i === credits.length - 1} />
                    ))}
                  </AccountSection>
                )}
                {(showAll || activeTab === 'ewallet') && ewallets.length > 0 && (
                  <AccountSection title="E-Wallet" count={ewallets.length} delay={0.1}>
                    {ewallets.map((a, i) => (
                      <AccountItem key={a.id} account={a} hidden={hidden} onTap={a => setSelectedId(a.id)} isLast={i === ewallets.length - 1} />
                    ))}
                  </AccountSection>
                )}
                {!loading && filtered.length === 0 && (
                  <EmptyState type={activeTab} onAdd={() => setAddType('open')} />
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!selected && (
        <AccountFAB
          onAddBank={() => setAddType('bank')}
          onAddCredit={() => setAddType('credit')}
          onAddEwallet={() => setAddType('ewallet')}
        />
      )}

      {addType && (
        <AddAccountModal
          initialType={addType === 'open' ? null : addType}
          onClose={() => { setAddType(null); refetch() }}
        />
      )}

      {payTarget && payTarget._raw && (
        <PayCreditCardModal
          card={payTarget._raw as CreditCard}
          onClose={() => setPayTarget(null)}
          onSuccess={() => { setPayTarget(null); refetch() }}
        />
      )}
    </div>
  )
}

export default function AkunPage() {
  return (
    <Suspense fallback={
      <div className="px-4 py-6 space-y-4">
        <div className="h-8 w-32 rounded-xl animate-pulse" style={{ background: 'var(--surface-card)' }} />
        <div className="h-28 rounded-3xl animate-pulse" style={{ background: 'var(--surface-card)' }} />
        <div className="h-10 rounded-full animate-pulse" style={{ background: 'var(--surface-card)' }} />
      </div>
    }>
      <AkunContent />
    </Suspense>
  )
}
