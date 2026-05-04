'use client'

import { useState, useMemo, useCallback, memo } from 'react'
import { motion, AnimatePresence }              from 'framer-motion'
import { ChevronLeft, Trash2, Edit3 }           from 'lucide-react'

import { useAccounts }        from '@/hooks/useAccounts'
import { AccountSummary }     from '@/components/account/AccountSummary'
import { AccountTabs, type AccountTab } from '@/components/account/AccountTabs'
import { AccountSection }     from '@/components/account/AccountSection'
import { AccountItem }        from '@/components/account/AccountItem'
import { AccountFAB }         from '@/components/account/AccountFAB'
import { AddAccountModal }    from '@/components/account/AddAccountModal'
import { PayCreditCardModal } from '@/components/credit-card/PayCreditCardModal'
import { CreditCardTransactionList } from '@/components/credit-card/CreditCardTransactionList'

import type { UnifiedAccount, AccountType } from '@/types/account'
import { getProviderInfo }  from '@/types/account'
import type { CreditCard }  from '@/types'
import { TransactionModal } from '@/components/transactions/TransactionModal'

// ── Due date helper ───────────────────────────────────────────
function getDueDays(dueDate: number): { days: number; label: string; urgent: boolean } {
  const today = new Date()
  let d = new Date(today.getFullYear(), today.getMonth(), dueDate)
  if (d < today) d = new Date(today.getFullYear(), today.getMonth() + 1, dueDate)
  const days  = Math.ceil((d.getTime() - today.getTime()) / 86_400_000)
  const label = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })
  return { days, label, urgent: days <= 7 }
}

// ── Account Detail Sheet ──────────────────────────────────────
const AccountDetailSheet = memo(function AccountDetailSheet({
  account,
  hidden,
  onClose,
  onDelete,
  onPay,
}: {
  account:  UnifiedAccount
  hidden:   boolean
  onClose:  () => void
  onDelete: () => void
  onPay?:   () => void
}) {
  const provider = getProviderInfo(account.providerId ?? '', account.providerName ?? '')
  const isCredit = account.type === 'credit'
  const pct      = isCredit && account.creditLimit
    ? Math.min(((account.creditUsed ?? 0) / account.creditLimit) * 100, 100)
    : 0

  const due = isCredit && account.dueDate ? getDueDays(account.dueDate) : null

  const fmt = (n: number) =>
    hidden ? 'Rp ••••••' : `Rp ${n.toLocaleString('id-ID')}`

  const usageBarColor = pct >= 80 ? '#ef4444' : pct >= 50 ? '#f59e0b' : 'var(--accent)'

  // Credit card _raw object for transaction list
  const rawCard = isCredit ? (account._raw as CreditCard) : undefined

  return (
    <motion.div
      key="detail"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className="absolute inset-0 overflow-y-auto"
      style={{ background: 'transparent' }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-2 pb-3">
        <button onClick={onClose} className="flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
          <ChevronLeft size={18} />
          <span className="text-[13px] font-semibold">Akun</span>
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-xl"
          style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)' }}
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Hero card */}
      <div
        className="mx-4 rounded-3xl overflow-hidden mb-4"
        style={{
          background: isCredit
            ? `linear-gradient(145deg, #0B3B2E 0%, #071f18 60%, #040f0b 100%)`
            : 'var(--surface-card)',
          border:    '1px solid var(--border)',
          padding:   '20px',
          boxShadow: isCredit ? '0 12px 40px rgba(0,0,0,0.4)' : 'none',
        }}
      >
        {/* Provider + name */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: provider.bg }}
          >
            <span className="text-[11px] font-extrabold" style={{ color: provider.color }}>
              {provider.abbr}
            </span>
          </div>
          <div>
            <p className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>{account.name}</p>
            {account.last4 && (
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>•••• {account.last4}</p>
            )}
          </div>
        </div>

        {/* Balance / usage */}
        {isCredit ? (
          <>
            <p className="text-[11px] mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>TERPAKAI</p>
            <p className="text-2xl font-bold" style={{ color: usageBarColor }}>
              {fmt(account.creditUsed ?? 0)}
            </p>
            <div
              className="mt-3 rounded-full overflow-hidden"
              style={{ height: 5, background: 'rgba(255,255,255,0.1)' }}
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: usageBarColor }}
              />
            </div>
            <p className="mt-1.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {fmt(account.creditUsed ?? 0)} dari {fmt(account.creditLimit ?? 0)} limit
            </p>
          </>
        ) : (
          <>
            <p className="text-[11px] mb-0.5" style={{ color: 'var(--text-muted)' }}>SALDO</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
              {fmt(account.balance ?? 0)}
            </p>
          </>
        )}
      </div>

      {/* Credit card billing info */}
      {isCredit && due && (
        <div
          className="mx-4 rounded-2xl p-4 mb-4 flex items-center justify-between"
          style={{
            background: due.urgent ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.07)',
            border:     `1px solid ${due.urgent ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.15)'}`,
          }}
        >
          <div>
            <p className="text-[12px] font-semibold" style={{ color: due.urgent ? '#ef4444' : 'var(--accent)' }}>
              Jatuh tempo {due.days === 0 ? 'hari ini' : due.days === 1 ? 'besok' : `${due.days} hari lagi`}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{due.label}</p>
          </div>
          {onPay && (
            <button
              onClick={onPay}
              className="px-4 py-2 rounded-xl text-[12px] font-bold"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              Bayar
            </button>
          )}
        </div>
      )}

      {/* Info section */}
      <div
        className="mx-4 rounded-2xl overflow-hidden mb-4"
        style={{ border: '1px solid var(--border)', background: 'var(--surface-card)' }}
      >
        {[
          { label: 'Provider',     value: account.providerName || '-'                 },
          { label: 'Tipe Akun',    value: account.type === 'bank' ? 'Rekening Bank' : account.type === 'credit' ? 'Kartu Kredit' : 'E-Wallet' },
          ...(isCredit ? [
            { label: 'Limit',        value: fmt(account.creditLimit ?? 0)              },
            { label: 'Tgl Tagihan',  value: `Tanggal ${account.billingDate}`           },
            { label: 'Jatuh Tempo',  value: `Tanggal ${account.dueDate}`               },
          ] : []),
        ].map((row, i, arr) => (
          <div
            key={row.label}
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}
          >
            <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{row.label}</span>
            <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* Transaction list (credit card) */}
      {isCredit && rawCard && (
        <div className="mb-6">
          <p className="px-4 text-[11px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
            TRANSAKSI TERBARU
          </p>
          <CreditCardTransactionList card={rawCard} />
        </div>
      )}
    </motion.div>
  )
})

// ── Empty state ───────────────────────────────────────────────
function EmptyState({ type, onAdd }: { type: string; onAdd: () => void }) {
  const label = type === 'bank' ? 'rekening' : type === 'credit' ? 'kartu kredit' : type === 'ewallet' ? 'e-wallet' : 'akun'
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <div
        className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
        style={{ background: 'var(--accent-dim)' }}
      >
        <span className="text-2xl">💳</span>
      </div>
      <p className="text-[15px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
        Belum ada {label}
      </p>
      <p className="text-[12px] mb-5" style={{ color: 'var(--text-muted)' }}>
        Tambahkan {label} untuk mulai melacak keuangan kamu
      </p>
      <button
        onClick={onAdd}
        className="px-6 py-2.5 rounded-full text-[13px] font-bold"
        style={{ background: 'var(--accent)', color: '#fff' }}
      >
        Tambah Sekarang
      </button>
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function AkunPage() {
  const {
    accounts, loading, summary, refetch, deleteAccount, payBill,
  } = useAccounts()

  const [hidden,    setHidden]    = useState(false)
  const [activeTab, setActiveTab] = useState<AccountTab>('all')
  const [selected,  setSelected]  = useState<UnifiedAccount | null>(null)
  const [addType,   setAddType]   = useState<AccountType | null | 'open'>(null)
  const [payTarget, setPayTarget] = useState<UnifiedAccount | null>(null)

  // Filter accounts by tab
  const filtered = useMemo(() => {
    if (activeTab === 'all') return accounts
    return accounts.filter(a => a.type === activeTab)
  }, [accounts, activeTab])

  const banks   = useMemo(() => filtered.filter(a => a.type === 'bank'),    [filtered])
  const credits = useMemo(() => filtered.filter(a => a.type === 'credit'),  [filtered])
  const ewallets= useMemo(() => filtered.filter(a => a.type === 'ewallet'), [filtered])

  const handleDelete = useCallback(async (account: UnifiedAccount) => {
    if (!confirm(`Hapus "${account.name}"?`)) return
    try {
      await deleteAccount(account)
      setSelected(null)
    } catch { /* toast handled */ }
  }, [deleteAccount])

  const showAll = activeTab === 'all'

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: 'transparent' }}>
      <AnimatePresence mode="wait">
        {selected ? (
          // ── DETAIL VIEW ──
          <AccountDetailSheet
            key="detail"
            account={selected}
            hidden={hidden}
            onClose={() => setSelected(null)}
            onDelete={() => handleDelete(selected)}
            onPay={selected.type === 'credit' ? () => setPayTarget(selected) : undefined}
          />
        ) : (
          // ── LIST VIEW ──
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="px-4 pt-4 pb-3">
              <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                Akun
              </h1>
              <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Semua rekening dan kartu dalam satu tempat
              </p>
            </div>

            {/* Summary card */}
            <div className="mb-4">
              <AccountSummary
                summary={summary}
                hidden={hidden}
                onToggleHidden={() => setHidden(v => !v)}
              />
            </div>

            {/* Tabs */}
            <div className="mb-4">
              <AccountTabs active={activeTab} onChange={setActiveTab} />
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex justify-center py-10">
                <div
                  className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: 'var(--accent)' }}
                />
              </div>
            )}

            {/* Account sections */}
            {!loading && (
              <div className="flex flex-col gap-4 pb-32">
                {/* Rekening Bank */}
                {(showAll || activeTab === 'bank') && banks.length > 0 && (
                  <AccountSection title="Rekening Bank" count={banks.length} delay={0}>
                    {banks.map((a, i) => (
                      <AccountItem
                        key={a.id}
                        account={a}
                        hidden={hidden}
                        onTap={setSelected}
                        isLast={i === banks.length - 1}
                      />
                    ))}
                  </AccountSection>
                )}

                {/* Kartu Kredit */}
                {(showAll || activeTab === 'credit') && credits.length > 0 && (
                  <AccountSection title="Kartu Kredit" count={credits.length} delay={0.05}>
                    {credits.map((a, i) => (
                      <AccountItem
                        key={a.id}
                        account={a}
                        hidden={hidden}
                        onTap={setSelected}
                        isLast={i === credits.length - 1}
                      />
                    ))}
                  </AccountSection>
                )}

                {/* E-Wallet */}
                {(showAll || activeTab === 'ewallet') && ewallets.length > 0 && (
                  <AccountSection title="E-Wallet" count={ewallets.length} delay={0.1}>
                    {ewallets.map((a, i) => (
                      <AccountItem
                        key={a.id}
                        account={a}
                        hidden={hidden}
                        onTap={setSelected}
                        isLast={i === ewallets.length - 1}
                      />
                    ))}
                  </AccountSection>
                )}

                {/* Empty state */}
                {!loading && filtered.length === 0 && (
                  <EmptyState type={activeTab} onAdd={() => setAddType('open')} />
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      {!selected && (
        <AccountFAB
          onAddBank={()    => setAddType('bank')}
          onAddCredit={()  => setAddType('credit')}
          onAddEwallet={()=> setAddType('ewallet')}
        />
      )}

      {/* Add account modal */}
      {addType && (
        <AddAccountModal
          initialType={addType === 'open' ? null : addType}
          onClose={() => { setAddType(null); refetch() }}
        />
      )}

      {/* Pay credit card modal */}
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
