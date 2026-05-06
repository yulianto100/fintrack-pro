'use client'

import { useState, useMemo, useCallback, memo, useEffect, useRef, Suspense } from 'react'
import type { ReactNode } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import {
  ChevronLeft, Trash2, ReceiptText, ArrowRight,
  Building2, CreditCard as CreditCardIcon, Wallet,
  Hash, Calendar, TrendingUp,
  Phone, ShieldCheck, Repeat, AlertTriangle,
  Eye, EyeOff, Sparkles, Activity, Clock3, TrendingDown,
} from 'lucide-react'

import { useAccounts }        from '@/hooks/useAccounts'
import { useApiList }         from '@/hooks/useApiData'
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
import type { CreditCard, Transaction } from '@/types'

// â”€â”€ Provider logo map (same as AccountItem) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

function safeNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function formatCurrencyIDR(value: unknown, hidden = false): string {
  if (hidden) return 'Rp â€¢â€¢â€¢â€¢â€¢â€¢'
  return `Rp ${safeNumber(value).toLocaleString('id-ID')}`
}

function maskAccountNumber(value?: string): string | null {
  const cleaned = (value ?? '').replace(/\s+/g, '')
  if (!cleaned) return null
  if (cleaned.length <= 4) return cleaned
  return `â€¢â€¢â€¢â€¢ ${cleaned.slice(-4)}`
}

function getLastSyncText(updatedAt?: string): string {
  if (!updatedAt) return 'Diperbarui otomatis'
  const date = new Date(updatedAt)
  if (Number.isNaN(date.getTime())) return 'Diperbarui otomatis'
  return `Sinkron ${date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`
}

function isCurrentMonth(dateValue?: string): boolean {
  if (!dateValue) return false
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return false
  const now = new Date()
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
}

interface WalletMonthlySummary {
  income: number
  expense: number
  net: number
  count: number
  topExpenseCategory?: string
  mostFrequentCategory?: string
}

function getWalletMonthlySummary(transactions: Transaction[], accountId: string): WalletMonthlySummary {
  const expenseByCategory = new Map<string, number>()
  const countByCategory = new Map<string, number>()
  const summary: WalletMonthlySummary = { income: 0, expense: 0, net: 0, count: 0 }

  const bump = (map: Map<string, number>, key: string, value = 1) => {
    map.set(key, (map.get(key) ?? 0) + value)
  }

  const topKey = (map: Map<string, number>) =>
    [...map.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]

  ;(Array.isArray(transactions) ? transactions : []).forEach((tx) => {
    if (!isCurrentMonth(tx.date || tx.createdAt)) return
    const amount = safeNumber(tx.amount)
    const fromThisAccount = tx.walletAccountId === accountId
    const toThisAccount = tx.toWalletAccountId === accountId
    if (!fromThisAccount && !toThisAccount) return

    const category = tx.categoryName || (tx.type === 'transfer' ? 'Transfer' : tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran')
    const isIncoming = tx.type === 'income' || (tx.type === 'transfer' && toThisAccount && !fromThisAccount)

    summary.count += 1
    bump(countByCategory, category)
    if (isIncoming) {
      summary.income += amount
    } else {
      summary.expense += amount
      bump(expenseByCategory, category, amount)
    }
  })

  summary.net = summary.income - summary.expense
  summary.topExpenseCategory = topKey(expenseByCategory)
  summary.mostFrequentCategory = topKey(countByCategory)
  return summary
}

function getAccountTransactions(transactions: Transaction[], accountId: string) {
  return (Array.isArray(transactions) ? transactions : [])
    .filter(tx => tx.walletAccountId === accountId || tx.toWalletAccountId === accountId)
    .sort((a, b) => new Date(b.date || b.createdAt || '').getTime() - new Date(a.date || a.createdAt || '').getTime())
}

function CountUpBalance({ value, hidden }: { value: number; hidden: boolean }) {
  const reducedMotion = useReducedMotion()
  const [displayValue, setDisplayValue] = useState(value)

  useEffect(() => {
    if (hidden || reducedMotion) {
      setDisplayValue(value)
      return
    }

    const start = displayValue
    const delta = value - start
    const startedAt = performance.now()
    const duration = 520
    let raf = 0

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(Math.round(start + delta * eased))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, hidden, reducedMotion])

  return <>{formatCurrencyIDR(displayValue, hidden)}</>
}

function SectionReveal({ children, delay = 0, className = '' }: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, delay, ease: [0.23, 1, 0.32, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function MonthlySummaryCards({ summary, hidden, loading }: {
  summary: WalletMonthlySummary
  hidden: boolean
  loading?: boolean
}) {
  const cards = [
    { label: 'Total Masuk', value: formatCurrencyIDR(summary.income, hidden), color: '#16a34a', marker: 'rgba(34,197,94,0.22)' },
    { label: 'Total Keluar', value: formatCurrencyIDR(summary.expense, hidden), color: '#ef4444', marker: 'rgba(239,68,68,0.20)' },
    { label: 'Net Flow', value: formatCurrencyIDR(summary.net, hidden), color: summary.net >= 0 ? '#16a34a' : '#ef4444', marker: summary.net >= 0 ? 'rgba(34,197,94,0.22)' : 'rgba(239,68,68,0.20)' },
    { label: 'Transaksi', value: loading ? '...' : `${summary.count}x`, color: 'var(--text-primary)', marker: 'rgba(37,99,235,0.18)' },
  ]

  return (
    <div>
      <SectionLabel title="Ringkasan Bulan Ini" />
      <div className="grid grid-cols-2 gap-3 px-4">
        {cards.map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: index * 0.035 }}
            className="rounded-2xl px-4 py-3.5"
            style={{
              background: 'rgba(255,255,255,0.58)',
              border: '1px solid rgba(34,197,94,0.14)',
              boxShadow: '0 14px 32px rgba(15,23,42,0.08)',
              backdropFilter: 'blur(14px)',
            }}
          >
            <div className="h-1.5 w-8 rounded-full mb-3" style={{ background: card.marker }} />
            <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
              {card.label}
            </p>
            <p
              className="text-[14px] font-bold truncate"
              style={{ color: card.color, fontFamily: 'var(--font-jetbrains)', fontVariantNumeric: 'tabular-nums' }}
            >
              {card.value}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// â”€â”€ Tab â†” URL param mapping â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AccountBalanceCard({
  account,
  providerName,
  isEwallet,
  balance,
  hidden,
  onToggleHidden,
}: {
  account: UnifiedAccount
  providerName: string
  isEwallet: boolean
  balance: number
  hidden: boolean
  onToggleHidden: () => void
}) {
  const maskedAccount = maskAccountNumber(account.accountNumber ?? account.last4)
  const lastSyncText = getLastSyncText(account.updatedAt)

  return (
    <motion.div
      whileTap={{ scale: 0.995 }}
      className="mx-4 rounded-3xl overflow-hidden relative"
      style={{
        background: 'linear-gradient(145deg, rgba(220,252,231,0.88) 0%, rgba(187,247,208,0.58) 42%, rgba(240,253,244,0.88) 100%)',
        border: '1px solid rgba(134,239,172,0.48)',
        padding: '22px 22px 20px',
        boxShadow: '0 24px 54px rgba(21,128,61,0.18), inset 0 1px 0 rgba(255,255,255,0.72)',
        backdropFilter: 'blur(18px) saturate(1.2)',
      }}
    >
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full" style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.32), transparent 68%)' }} />
        <div className="absolute -left-10 bottom-[-70px] h-40 w-40 rounded-full" style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.18), transparent 70%)' }} />
        <div className="absolute inset-x-6 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.95), transparent)' }} />
      </div>

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <ProviderIcon providerId={account.providerId} providerName={providerName} size={46} />
            <div className="min-w-0">
              <p className="text-[14px] font-bold truncate" style={{ color: '#13251b' }}>{account.name}</p>
              <p className="text-[12px] mt-0.5 truncate" style={{ color: 'rgba(19,37,27,0.58)' }}>
                {isEwallet ? 'E-Wallet' : 'Rekening Bank'}{maskedAccount ? ` | ${maskedAccount}` : ''}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a' }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#4ade80', boxShadow: '0 0 10px rgba(74,222,128,0.8)' }} />
              <span className="text-[11px] font-semibold">Saldo sinkron</span>
            </div>
            <button
              type="button"
              onClick={onToggleHidden}
              aria-label={hidden ? 'Tampilkan saldo' : 'Sembunyikan saldo'}
              className="h-8 w-8 rounded-full flex items-center justify-center active:scale-95 transition-transform"
              style={{ background: 'rgba(255,255,255,0.70)', color: '#15803d', border: '1px solid rgba(34,197,94,0.18)' }}
            >
              {hidden ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
          </div>
        </div>

        <div className="mt-7">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: 'rgba(19,37,27,0.46)' }}>
              Saldo tersedia
            </p>
            <p className="text-[10px] font-semibold flex items-center gap-1" style={{ color: 'rgba(19,37,27,0.52)' }}>
              <Clock3 size={11} /> {lastSyncText}
            </p>
          </div>
          <p
            className="mt-2 text-[36px] font-bold leading-none tracking-normal"
            style={{ color: '#22c55e', fontFamily: 'var(--font-syne)', fontVariantNumeric: 'tabular-nums' }}
          >
            <CountUpBalance value={balance} hidden={hidden} />
          </p>
          {balance === 0 && !hidden && (
            <p className="text-[12px] mt-3" style={{ color: 'rgba(19,37,27,0.58)' }}>
              Belum ada saldo tercatat di akun ini.
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function SmartInsights({ summary, transactions, hidden }: {
  summary: WalletMonthlySummary
  transactions: Transaction[]
  hidden: boolean
}) {
  const hasTransactions = transactions.length > 0
  const cashflowPositive = summary.net >= 0
  const insights = [
    {
      icon: summary.topExpenseCategory ? <TrendingUp size={15} /> : <Sparkles size={15} />,
      title: summary.topExpenseCategory ? 'Pengeluaran terbesar' : 'Belum ada pola kuat',
      description: summary.topExpenseCategory
        ? `${summary.topExpenseCategory} memimpin pengeluaran bulan ini.`
        : 'Transaksi baru akan dipakai untuk membaca pola rekening ini.',
      color: '#f97316',
      bg: 'rgba(249,115,22,0.09)',
    },
    {
      icon: cashflowPositive ? <TrendingUp size={15} /> : <TrendingDown size={15} />,
      title: cashflowPositive ? 'Cashflow positif' : 'Cashflow negatif',
      description: hasTransactions
        ? `${cashflowPositive ? 'Surplus' : 'Defisit'} bulan ini ${formatCurrencyIDR(Math.abs(summary.net), hidden)}.`
        : 'Belum ada cashflow bulan ini.',
      color: cashflowPositive ? '#16a34a' : '#ef4444',
      bg: cashflowPositive ? 'rgba(34,197,94,0.09)' : 'rgba(239,68,68,0.08)',
    },
    {
      icon: <Activity size={15} />,
      title: summary.mostFrequentCategory ? 'Kategori paling sering' : 'Aktivitas rekening',
      description: summary.mostFrequentCategory
        ? `${summary.mostFrequentCategory} paling sering muncul bulan ini.`
        : 'Belum cukup data untuk menentukan kategori dominan.',
      color: '#2563eb',
      bg: 'rgba(37,99,235,0.08)',
    },
  ]

  return (
    <div>
      <SectionLabel title="Insight Finansial" />
      <div className="px-4 grid gap-2.5">
        {insights.map((insight, index) => (
          <motion.div
            key={insight.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: index * 0.04 }}
            className="flex items-start gap-3 rounded-2xl px-3.5 py-3"
            style={{
              background: 'rgba(255,255,255,0.58)',
              border: '1px solid rgba(34,197,94,0.12)',
              boxShadow: '0 12px 26px rgba(15,23,42,0.07)',
              backdropFilter: 'blur(14px)',
            }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: insight.bg, color: insight.color }}>
              {insight.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>{insight.title}</p>
              <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{insight.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

const TAB_TO_PARAM: Record<AccountTab, string> = {
  all: '', bank: 'rekening', credit: 'kredit', ewallet: 'ewallet',
}
const PARAM_TO_TAB: Record<string, AccountTab> = {
  rekening: 'bank', kredit: 'credit', ewallet: 'ewallet',
}

// â”€â”€ Due date helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getDueDays(dueDate: number): { days: number; label: string; urgent: boolean } {
  const today = new Date()
  let d = new Date(today.getFullYear(), today.getMonth(), dueDate)
  if (d < today) d = new Date(today.getFullYear(), today.getMonth() + 1, dueDate)
  const days  = Math.ceil((d.getTime() - today.getTime()) / 86_400_000)
  const label = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  return { days, label, urgent: days <= 7 }
}

// â”€â”€ CREDIT CARD DETAIL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CreditDetailSheet = memo(function CreditDetailSheet({ account, hidden, onClose, onDelete, onPay }: {
  account: UnifiedAccount; hidden: boolean; onClose: () => void; onDelete: () => void; onPay?: () => void
}) {
  const used      = account.creditUsed ?? 0
  const limit     = account.creditLimit ?? 0
  const pct       = limit > 0 ? Math.min((used / limit) * 100, 100) : 0
  const due       = account.dueDate ? getDueDays(account.dueDate) : null
  const billing   = getBillingStatus(pct, due?.days ?? 999)
  const minPayment = Math.round(used * 0.10)
  const providerName = account.providerName || account.name

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
      className="absolute inset-0 overflow-y-auto pb-[calc(7rem+env(safe-area-inset-bottom))]"
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
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <ProviderIcon providerId={account.providerId} providerName={providerName} size={46} />
            <div className="min-w-0">
            <p className="text-[18px] font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-syne)' }}>
              {account.name}
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {account.last4 ? `â€¢â€¢â€¢â€¢â€¢ ${account.last4}` : ''} Â· {cardTypeLabel}
            </p>
            </div>
          </div>
          <StatusBadge
            label={due ? (due.urgent ? 'âš  Segera bayar' : 'âœ“ Aktif') : 'âœ“ Aktif'}
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
      {insights.length > 0 && (
        <SectionReveal className="relative z-10 mb-6" delay={0.06}>
          <InsightStrip lines={insights} />
        </SectionReveal>
      )}

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

// â”€â”€ BANK / EWALLET DETAIL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const WalletDetailSheet = memo(function WalletDetailSheet({ account, hidden, onClose, onDelete, onToggleHidden }: {
  account: UnifiedAccount; hidden: boolean; onClose: () => void; onDelete: () => void; onToggleHidden: () => void
}) {
  const isEwallet = account.type === 'ewallet'
  const balance   = safeNumber(account.balance)
  const { data: allTransactions, loading: transactionsLoading } = useApiList<Transaction>('/api/transactions', { refreshMs: 15000 })
  const providerName = account.providerName || account.name

  const monthlySummary = useMemo(
    () => getWalletMonthlySummary(allTransactions, account.id),
    [allTransactions, account.id]
  )
  const accountTransactions = useMemo(
    () => getAccountTransactions(allTransactions, account.id),
    [allTransactions, account.id]
  )

  // Insights
  const insights = getAccountInsights(
    isEwallet
      ? { type: 'ewallet', lastTopUpDays: 2, topCategory: 'Transport' }
      : { type: 'bank', biggestCategory: 'Transfer', monthlyChangePct: -8 }
  )

  // Info groups
  const accountInfoRows = [
    { icon: <Building2 size={14} />,  label: 'Provider',    value: providerName || '-' },
    { icon: <Wallet size={14} />,     label: 'Tipe Akun',   value: isEwallet ? 'E-Wallet' : 'Rekening Bank' },
    { icon: <ShieldCheck size={14} />,label: 'Status',      value: <StatusBadge label="âœ“ Aktif" variant="safe" /> },
    ...(account.accountNumber
      ? [{ icon: <Hash size={14} />, label: 'No. Rekening', value: account.accountNumber }]
      : []),
    ...(isEwallet && account.accountNumber
      ? [{ icon: <Phone size={14} />, label: 'No. HP Terdaftar', value: account.accountNumber }]
      : []),
  ]

  const financialInfoRows = [
    { icon: <TrendingUp size={14} />,  label: 'Total masuk bulan ini',  value: formatCurrencyIDR(monthlySummary.income, hidden) },
    { icon: <Repeat size={14} />,      label: 'Transaksi bulan ini',    value: `${monthlySummary.count} transaksi` },
  ]

  const infoGroups: InfoGroupData[] = [
    { title: 'Informasi Akun',    rows: accountInfoRows },
    { title: 'Detail Finansial',  rows: financialInfoRows },
  ]

  return (
    <motion.div key="detail-wallet"
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className="absolute inset-0 overflow-y-auto pb-[calc(8.5rem+env(safe-area-inset-bottom))]"
      style={{
        background:
          'radial-gradient(circle at 82% 4%, rgba(34,197,94,0.22), transparent 32%), radial-gradient(circle at 4% 42%, rgba(20,184,166,0.12), transparent 34%), linear-gradient(180deg, rgba(240,253,244,0.82) 0%, rgba(248,250,252,0.52) 46%, transparent 100%)',
      }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-24 top-14 h-64 w-64 rounded-full blur-3xl" style={{ background: 'rgba(34,197,94,0.16)' }} />
        <div className="absolute -left-24 top-56 h-56 w-56 rounded-full blur-3xl" style={{ background: 'rgba(14,165,233,0.10)' }} />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-3 pb-4">
        <button onClick={onClose} className="flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
          <ChevronLeft size={18} /><span className="text-[13px] font-semibold">Akun</span>
        </button>
        <button onClick={onDelete} className="p-2 rounded-xl" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)' }}>
          <Trash2 size={16} />
        </button>
      </div>

      {/* Identity */}
      <SectionReveal className="relative z-10 px-4 mb-5" delay={0.02}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <ProviderIcon providerId={account.providerId} providerName={providerName} size={46} />
            <div className="min-w-0">
            <p className="text-[22px] font-bold truncate" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-syne)' }}>
              {account.name}
            </p>
            <p className="text-[13px] mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
              {isEwallet ? 'E-Wallet' : 'Rekening Bank'} | {providerName || '-'}
            </p>
            </div>
          </div>
          <StatusBadge label="âœ“ Aktif" variant="safe" />
        </div>
      </SectionReveal>

      <SectionReveal className="relative z-10 mb-6" delay={0.04}>
        <AccountBalanceCard
          account={account}
          providerName={providerName}
          isEwallet={isEwallet}
          balance={balance}
          hidden={hidden}
          onToggleHidden={onToggleHidden}
        />
      </SectionReveal>
      {/* Insight strip */}
      {insights.length > 0 && (
        <SectionReveal className="relative z-10 mb-6" delay={0.06}>
          <InsightStrip lines={insights} />
        </SectionReveal>
      )}

      <SectionReveal className="relative z-10 mb-6" delay={0.08}>
        <MonthlySummaryCards summary={monthlySummary} hidden={hidden} loading={transactionsLoading} />
      </SectionReveal>

      <SectionReveal className="relative z-10 mb-6" delay={0.1}>
        <SmartInsights summary={monthlySummary} transactions={accountTransactions} hidden={hidden} />
      </SectionReveal>

      {/* Info groups */}
      <SectionReveal className="relative z-10" delay={0.12}>
        <InfoSection groups={infoGroups} />
      </SectionReveal>

      {/* Transactions */}
      <SectionReveal className="relative z-10 mb-4" delay={0.14}>
        <SectionLabel title="Transaksi Terakhir" />
        <div className="px-4">
          <AccountTransactionList
            accountId={account.id}
            accountType={account.type as 'bank' | 'ewallet'}
            hidden={hidden}
            limit={8}
          />
        </div>
      </SectionReveal>
    </motion.div>
  )
})

// â”€â”€ Empty state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function EmptyState({ type, onAdd }: { type: string; onAdd: () => void }) {
  const config: Record<string, { emoji: string; label: string; hint: string }> = {
    bank:    { emoji: 'ðŸ¦', label: 'rekening bank',  hint: 'Hubungkan rekening untuk mulai melacak saldo' },
    credit:  { emoji: 'ðŸ’³', label: 'kartu kredit',   hint: 'Pantau limit dan tagihan kartu kamu' },
    ewallet: { emoji: 'ðŸ“±', label: 'e-wallet',        hint: 'Tambah GoPay, OVO, DANA, dan lainnya' },
    all:     { emoji: 'ðŸ’°', label: 'akun',            hint: 'Tambahkan akun untuk mulai melacak keuangan kamu' },
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

// â”€â”€ Main page content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
              onToggleHidden={() => setHidden(v => !v)}
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
