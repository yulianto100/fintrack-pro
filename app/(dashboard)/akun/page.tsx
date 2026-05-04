'use client'

import { useState, useMemo, useCallback, memo } from 'react'
import { motion, AnimatePresence }              from 'framer-motion'
import {
  ChevronLeft, Trash2, CreditCard as CreditCardIcon, Wallet,
  CheckCircle2, ChevronDown, ChevronUp,
  ReceiptText, RefreshCw, Settings2, ShieldOff,
  ArrowRight,
} from 'lucide-react'

import { useAccounts }        from '@/hooks/useAccounts'
import { AccountSummary }     from '@/components/account/AccountSummary'
import { AccountTabs, type AccountTab } from '@/components/account/AccountTabs'
import { AccountSection }     from '@/components/account/AccountSection'
import { AccountItem }        from '@/components/account/AccountItem'
import { AccountFAB }         from '@/components/account/AccountFAB'
import { AddAccountModal }    from '@/components/account/AddAccountModal'
import { PayCreditCardModal } from '@/components/credit-card/PayCreditCardModal'
import { CreditCardTransactionList } from '@/components/credit-card/CreditCardTransactionList'
import { AccountTransactionList }    from '@/components/account/AccountTransactionList'

import type { UnifiedAccount, AccountType } from '@/types/account'
import { getProviderInfo }  from '@/types/account'
import type { CreditCard }  from '@/types'

// ── Due date helper
function getDueDays(dueDate: number): { days: number; label: string; urgent: boolean } {
  const today = new Date()
  let d = new Date(today.getFullYear(), today.getMonth(), dueDate)
  if (d < today) d = new Date(today.getFullYear(), today.getMonth() + 1, dueDate)
  const days  = Math.ceil((d.getTime() - today.getTime()) / 86_400_000)
  const label = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  return { days, label, urgent: days <= 7 }
}

function usageColor(pct: number) {
  if (pct >= 80) return { bar: '#ef4444', text: '#ef4444' }
  if (pct >= 50) return { bar: '#f59e0b', text: '#f59e0b' }
  return { bar: 'var(--accent)', text: 'var(--accent)' }
}

function QuickAction({ icon, label, danger = false, onClick }: {
  icon: React.ReactNode; label: string; danger?: boolean; onClick?: () => void
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 flex-shrink-0" style={{ minWidth: 72 }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{
        background: danger ? 'rgba(239,68,68,0.08)' : 'var(--surface-subtle)',
        border: `1px solid ${danger ? 'rgba(239,68,68,0.18)' : 'var(--border)'}`,
      }}>
        <span style={{ color: danger ? '#ef4444' : 'var(--accent)' }}>{icon}</span>
      </div>
      <span className="text-[10px] font-semibold text-center leading-tight" style={{
        color: danger ? '#ef4444' : 'var(--text-muted)', maxWidth: 72
      }}>
        {label}
      </span>
    </button>
  )
}

function InfoRow({ label, value, isLast = false }: { label: string; value: string; isLast?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--border)' }}>
      <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}

function SectionLabel({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 mb-2">
      <p className="text-[11px] font-bold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>{title}</p>
      {action && (
        <button onClick={onAction} className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: 'var(--accent)' }}>
          {action} <ArrowRight size={11} />
        </button>
      )}
    </div>
  )
}

// ── CREDIT CARD DETAIL
const CreditDetailSheet = memo(function CreditDetailSheet({ account, hidden, onClose, onDelete, onPay }: {
  account: UnifiedAccount; hidden: boolean; onClose: () => void; onDelete: () => void; onPay?: () => void
}) {
  const [infoExpanded, setInfoExpanded] = useState(false)

  const pct       = account.creditLimit ? Math.min(((account.creditUsed ?? 0) / account.creditLimit) * 100, 100) : 0
  const remaining = (account.creditLimit ?? 0) - (account.creditUsed ?? 0)
  const due       = account.dueDate ? getDueDays(account.dueDate) : null
  const colors    = usageColor(pct)

  const fmt = (n: number) => hidden ? 'Rp ••••••' : `Rp ${n.toLocaleString('id-ID')}`

  const cardTypeLabel = (() => {
    const id = (account.providerId ?? '').toLowerCase()
    if (id.includes('bni'))                         return 'Visa Gold'
    if (id.includes('mandiri'))                     return 'Visa'
    if (id.includes('bri'))                         return 'Mastercard'
    if (id.includes('cimb') || id.includes('ocbc')) return 'Visa Platinum'
    return 'Visa'
  })()

  const minimumPayment = Math.round((account.creditUsed ?? 0) * 0.10)

  const extendedInfo = [
    { label: 'Bank Penerbit',   value: account.providerName || '-' },
    { label: 'Tanggal Tagihan', value: `${account.billingDate} tiap bulan` },
    { label: 'Jenis Kartu',     value: cardTypeLabel },
    { label: 'Jatuh Tempo',     value: `${account.dueDate} tiap bulan` },
    { label: 'Limit Total',     value: fmt(account.creditLimit ?? 0) },
    { label: 'Mata Uang',       value: 'IDR' },
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
        <p className="text-[18px] font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-syne)' }}>{account.name}</p>
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {account.last4 ? `••••• ${account.last4}` : ''} • {cardTypeLabel}
        </p>
      </div>

      {/* Hero card */}
      <div className="mx-4 rounded-3xl overflow-hidden mb-4 mt-3 relative" style={{
        background: `linear-gradient(145deg, #0B3B2E 0%, #071f18 60%, #040f0b 100%)`,
        border: '1px solid rgba(34,197,94,0.15)', padding: '20px', boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
      }}>
        <div className="absolute pointer-events-none" style={{
          top: 0, right: 0, width: 140, height: 140, borderRadius: '50%',
          background: `radial-gradient(circle, ${account.color || '#22c55e'}18 0%, transparent 70%)`,
        }} />
        <p className="text-[9px] font-bold tracking-[0.18em] mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>TOTAL TERPAKAI</p>
        <p className="text-[30px] font-bold leading-none mb-3" style={{ color: colors.text, fontFamily: 'var(--font-syne)' }}>
          {fmt(account.creditUsed ?? 0)}
        </p>
        <div className="h-[4px] rounded-full overflow-hidden mb-3" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
            transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1], delay: 0.2 }}
            className="h-full rounded-full" style={{ background: colors.bar }} />
        </div>
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[9px] tracking-widest font-semibold mb-0.5" style={{ color: 'rgba(255,255,255,0.28)' }}>LIMIT TOTAL</p>
            <p className="text-[12px] font-bold" style={{ color: 'rgba(255,255,255,0.65)', fontFamily: 'var(--font-jetbrains)' }}>
              {fmt(account.creditLimit ?? 0)}
            </p>
          </div>
          <div className="w-px h-6" style={{ background: 'rgba(255,255,255,0.10)' }} />
          <div>
            <p className="text-[9px] tracking-widest font-semibold mb-0.5" style={{ color: 'rgba(255,255,255,0.28)' }}>SISA LIMIT</p>
            <p className="text-[12px] font-bold" style={{ color: 'rgba(255,255,255,0.65)', fontFamily: 'var(--font-jetbrains)' }}>
              {fmt(remaining)}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <CheckCircle2 size={13} style={{ color: '#22c55e' }} />
            <span className="text-[11px] font-bold" style={{ color: '#22c55e' }}>Aktif</span>
          </div>
        </div>
      </div>

      {/* Tagihan Saat Ini */}
      {due && (
        <div className="mx-4 mb-4">
          <SectionLabel title="Tagihan Saat Ini" />
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--surface-card)' }}>
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[10px] font-semibold mb-0.5" style={{ color: 'var(--text-muted)' }}>TOTAL TAGIHAN</p>
                  <p className="text-[22px] font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-syne)' }}>
                    {fmt(account.creditUsed ?? 0)}
                  </p>
                  <button className="mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(34,197,94,0.10)', color: 'var(--accent)' }}>
                    Belum Lunas
                  </button>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold mb-0.5" style={{ color: 'var(--text-muted)' }}>BAYAR MINIMUM</p>
                  <p className="text-[16px] font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-jetbrains)' }}>
                    {fmt(minimumPayment)}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>10% dari tagihan</p>
                </div>
              </div>

              <div className="flex items-center justify-between px-3 py-2 rounded-xl mb-3" style={{
                background: due.urgent ? 'rgba(239,68,68,0.07)' : 'rgba(34,197,94,0.06)',
                border: `1px solid ${due.urgent ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.12)'}`,
              }}>
                <div>
                  <p className="text-[11px] font-bold" style={{ color: due.urgent ? '#ef4444' : 'var(--accent)' }}>Jatuh Tempo</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{due.label}</p>
                </div>
                <span className="text-[11px] font-bold px-2 py-1 rounded-lg" style={{
                  background: due.urgent ? 'rgba(239,68,68,0.10)' : 'rgba(34,197,94,0.10)',
                  color: due.urgent ? '#ef4444' : 'var(--accent)',
                }}>
                  {due.days === 0 ? 'Hari ini' : due.days === 1 ? 'Besok' : `${due.days} hari lagi`}
                </span>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                  <ReceiptText size={14} /> Lihat Tagihan
                </button>
                {onPay && (
                  <button onClick={onPay} className="flex-1 py-2.5 rounded-xl text-[13px] font-bold"
                    style={{ background: 'var(--accent)', color: '#fff' }}>
                    Bayar Sekarang
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Kartu */}
      <div className="mx-4 mb-4">
        <SectionLabel title="Info Kartu" />
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--surface-card)' }}>
          {extendedInfo.slice(0, infoExpanded ? extendedInfo.length : 4).map((row, i, arr) => (
            <InfoRow key={row.label} label={row.label} value={row.value} isLast={i === arr.length - 1 && !infoExpanded} />
          ))}
          <AnimatePresence>
            {infoExpanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                {extendedInfo.slice(4).map((row, i, arr) => (
                  <InfoRow key={row.label} label={row.label} value={row.value} isLast={i === arr.length - 1} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <button onClick={() => setInfoExpanded(v => !v)}
            className="w-full flex items-center justify-center gap-1.5 py-3"
            style={{ borderTop: '1px solid var(--border)', color: 'var(--accent)', fontSize: '12px', fontWeight: 600 }}>
            {infoExpanded ? <><ChevronUp size={14} /> Sembunyikan</> : <><ChevronDown size={14} /> Lihat Detail Kartu</>}
          </button>
        </div>
      </div>

      {/* Transaksi Terakhir */}
      <div className="mb-4">
        <SectionLabel title="Transaksi Terakhir" action="Lihat Semua" />
        <div className="px-4">
          <CreditCardTransactionList creditCardId={account.id} hidden={hidden} />
        </div>
      </div>

      {/* Aksi Cepat */}
      <div className="mx-4 mb-6">
        <SectionLabel title="Aksi Cepat" />
        <div className="flex gap-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          <QuickAction icon={<CreditCardIcon size={18} />}  label="Ubah Limit"        />
          <QuickAction icon={<ReceiptText size={18} />} label="Riwayat Tagihan"   />
          <QuickAction icon={<Settings2 size={18} />}   label="Pengaturan Kartu"  />
          <QuickAction icon={<ShieldOff size={18} />}   label="Blokir Kartu" danger />
        </div>
      </div>
    </motion.div>
  )
})

// ── BANK / EWALLET DETAIL
const WalletDetailSheet = memo(function WalletDetailSheet({ account, hidden, onClose, onDelete }: {
  account: UnifiedAccount; hidden: boolean; onClose: () => void; onDelete: () => void
}) {
  const provider  = getProviderInfo(account.providerId ?? '', account.providerName ?? '')
  const isEwallet = account.type === 'ewallet'
  const fmt       = (n: number) => hidden ? 'Rp ••••••' : `Rp ${n.toLocaleString('id-ID')}`

  const infoRows = [
    { label: 'Provider',   value: account.providerName || '-' },
    { label: 'Tipe Akun',  value: isEwallet ? 'E-Wallet' : 'Rekening Bank' },
    { label: 'Status',     value: 'Aktif' },
    ...(account.accountNumber ? [{ label: 'No. Rekening', value: account.accountNumber }] : []),
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

      {/* Card identity */}
      <div className="px-4 mb-1">
        <p className="text-[18px] font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-syne)' }}>{account.name}</p>
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {isEwallet ? 'E-Wallet' : 'Rekening Bank'} • {account.providerName || '-'}
        </p>
      </div>

      {/* Hero card */}
      <div className="mx-4 rounded-3xl overflow-hidden mb-4 mt-3" style={{
        background: 'var(--surface-card)', border: '1px solid var(--border)', padding: '20px',
      }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: provider.bg }}>
            <span className="text-[11px] font-extrabold" style={{ color: provider.color }}>{provider.abbr}</span>
          </div>
          <div>
            <p className="text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>{account.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <CheckCircle2 size={11} style={{ color: '#22c55e' }} />
              <span className="text-[11px] font-semibold" style={{ color: '#22c55e' }}>Aktif</span>
            </div>
          </div>
        </div>
        <p className="text-[9px] font-bold tracking-[0.18em] mb-1" style={{ color: 'var(--text-muted)' }}>SALDO</p>
        <p className="text-[30px] font-bold leading-none" style={{ color: 'var(--accent)', fontFamily: 'var(--font-syne)' }}>
          {fmt(account.balance ?? 0)}
        </p>
      </div>

      {/* Info Akun */}
      <div className="mx-4 mb-4">
        <SectionLabel title="Info Akun" />
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--surface-card)' }}>
          {infoRows.map((row, i) => (
            <InfoRow key={row.label} label={row.label} value={row.value} isLast={i === infoRows.length - 1} />
          ))}
        </div>
      </div>

      {/* Transaksi Terakhir */}
      <div className="mb-4">
        <SectionLabel title="Transaksi Terakhir" />
        <div className="px-4">
          <AccountTransactionList accountId={account.id} accountType={account.type as 'bank' | 'ewallet'} hidden={hidden} />
        </div>
      </div>

      {/* Aksi Cepat */}
      <div className="mx-4 mb-6">
        <SectionLabel title="Aksi Cepat" />
        <div className="flex gap-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          <QuickAction icon={<Wallet size={18} />}    label="Ubah Saldo"    />
          <QuickAction icon={<RefreshCw size={18} />} label="Perbarui Data" />
          <QuickAction icon={<Settings2 size={18} />} label="Pengaturan"    />
          <QuickAction icon={<Trash2 size={18} />}    label="Hapus Akun" danger onClick={onDelete} />
        </div>
      </div>
    </motion.div>
  )
})

// ── Empty state
function EmptyState({ type, onAdd }: { type: string; onAdd: () => void }) {
  const label = type === 'bank' ? 'rekening' : type === 'credit' ? 'kartu kredit' : type === 'ewallet' ? 'e-wallet' : 'akun'
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4" style={{ background: 'var(--accent-dim)' }}>
        <span className="text-2xl">💳</span>
      </div>
      <p className="text-[15px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Belum ada {label}</p>
      <p className="text-[12px] mb-5" style={{ color: 'var(--text-muted)' }}>
        Tambahkan {label} untuk mulai melacak keuangan kamu
      </p>
      <button onClick={onAdd} className="px-6 py-2.5 rounded-full text-[13px] font-bold"
        style={{ background: 'var(--accent)', color: '#fff' }}>
        Tambah Sekarang
      </button>
    </motion.div>
  )
}

// ── Main page
export default function AkunPage() {
  const { accounts, loading, summary, refetch, deleteAccount, payBill } = useAccounts()

  const [hidden,    setHidden]    = useState(false)
  const [activeTab, setActiveTab] = useState<AccountTab>('all')
  const [selected,  setSelected]  = useState<UnifiedAccount | null>(null)
  const [addType,   setAddType]   = useState<AccountType | null | 'open'>(null)
  const [payTarget, setPayTarget] = useState<UnifiedAccount | null>(null)

  const filtered = useMemo(() => activeTab === 'all' ? accounts : accounts.filter(a => a.type === activeTab), [accounts, activeTab])
  const banks    = useMemo(() => filtered.filter(a => a.type === 'bank'),    [filtered])
  const credits  = useMemo(() => filtered.filter(a => a.type === 'credit'),  [filtered])
  const ewallets = useMemo(() => filtered.filter(a => a.type === 'ewallet'), [filtered])

  const handleDelete = useCallback(async (account: UnifiedAccount) => {
    if (!confirm(`Hapus "${account.name}"?`)) return
    try { await deleteAccount(account); setSelected(null) } catch { /* toast handled */ }
  }, [deleteAccount])

  const showAll = activeTab === 'all'

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: 'transparent' }}>
      <AnimatePresence mode="wait">
        {selected ? (
          selected.type === 'credit' ? (
            <CreditDetailSheet key={`credit-${selected.id}`}
              account={selected} hidden={hidden}
              onClose={() => setSelected(null)}
              onDelete={() => handleDelete(selected)}
              onPay={() => setPayTarget(selected)}
            />
          ) : (
            <WalletDetailSheet key={`wallet-${selected.id}`}
              account={selected} hidden={hidden}
              onClose={() => setSelected(null)}
              onDelete={() => handleDelete(selected)}
            />
          )
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="px-4 pt-4 pb-3">
              <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Akun</h1>
              <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Semua rekening dan kartu dalam satu tempat</p>
            </div>

            <div className="mb-4">
              <AccountSummary summary={summary} hidden={hidden} onToggleHidden={() => setHidden(v => !v)} />
            </div>

            <div className="mb-4">
              <AccountTabs active={activeTab} onChange={setActiveTab} />
            </div>

            {loading && (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)' }} />
              </div>
            )}

            {!loading && (
              <div className="flex flex-col gap-4 pb-32">
                {(showAll || activeTab === 'bank') && banks.length > 0 && (
                  <AccountSection title="Rekening Bank" count={banks.length} delay={0}>
                    {banks.map((a, i) => (
                      <AccountItem key={a.id} account={a} hidden={hidden} onTap={setSelected} isLast={i === banks.length - 1} />
                    ))}
                  </AccountSection>
                )}
                {(showAll || activeTab === 'credit') && credits.length > 0 && (
                  <AccountSection title="Kartu Kredit" count={credits.length} delay={0.05}>
                    {credits.map((a, i) => (
                      <AccountItem key={a.id} account={a} hidden={hidden} onTap={setSelected} isLast={i === credits.length - 1} />
                    ))}
                  </AccountSection>
                )}
                {(showAll || activeTab === 'ewallet') && ewallets.length > 0 && (
                  <AccountSection title="E-Wallet" count={ewallets.length} delay={0.1}>
                    {ewallets.map((a, i) => (
                      <AccountItem key={a.id} account={a} hidden={hidden} onTap={setSelected} isLast={i === ewallets.length - 1} />
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
