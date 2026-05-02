'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence }         from 'framer-motion'
import { X, ArrowRight, Check, TrendingUp, AlertCircle } from 'lucide-react'
import { WalletSelectorStep }              from './WalletSelectorStep'
import { formatCurrency }                  from '@/lib/utils'
import toast                               from 'react-hot-toast'
import type { WalletOption }               from './WalletSelectorStep'

// ─── Types ────────────────────────────────────────────────────────────────────

export type InvestType = 'saham' | 'emas' | 'reksadana' | 'sbn' | 'deposito'

export interface InvestmentFlowProps {
  /** 'dashboard' = show wallet selector step 0; 'portfolio' = skip step 0 */
  source:                'dashboard' | 'portfolio'
  enableWalletSelection: boolean
  /** Pre-selected wallet when source='portfolio' */
  defaultWallet?:        { type: 'cash' | 'bank' | 'ewallet'; accountId?: string | null }
  onClose:               () => void
  onSuccess?:            () => void
}

// ─── Static data ──────────────────────────────────────────────────────────────

const INVEST_TYPES: { type: InvestType; icon: string; label: string; sub: string }[] = [
  { type: 'saham',     icon: '📈', label: 'Saham',     sub: 'Bursa Efek Indonesia'  },
  { type: 'emas',      icon: '🥇', label: 'Emas',      sub: 'Emas fisik & digital'  },
  { type: 'reksadana', icon: '💼', label: 'Reksadana', sub: 'Reksa dana manajer'    },
  { type: 'sbn',       icon: '🏛️', label: 'SBN',       sub: 'Surat Berharga Negara' },
  { type: 'deposito',  icon: '🏦', label: 'Deposito',  sub: 'Deposito berjangka'    },
]

const ENDPOINT: Record<InvestType, string> = {
  saham:     '/api/portfolio/stocks',
  emas:      '/api/portfolio/gold',
  reksadana: '/api/portfolio/reksadana',
  sbn:       '/api/portfolio/sbn',
  deposito:  '/api/portfolio/deposits',
}

// ─── Step dot ─────────────────────────────────────────────────────────────────

function StepDot({ n, current, label }: { n: number; current: number; label: string }) {
  const done   = current > n
  const active = current === n
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
        style={{
          background: done || active ? 'var(--accent)' : 'var(--surface-3)',
          color:      done || active ? '#000' : 'var(--text-muted)',
        }}>
        {done ? <Check size={12} strokeWidth={3} /> : n}
      </div>
      <span className="text-[11px] font-semibold whitespace-nowrap"
        style={{ color: done || active ? 'var(--text-primary)' : 'var(--text-muted)' }}>
        {label}
      </span>
    </div>
  )
}

function StepLine({ active }: { active: boolean }) {
  return (
    <div className="flex-1 h-px mx-1.5"
      style={{ background: active ? 'var(--accent)' : 'var(--border)', transition: 'background 0.3s' }} />
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function InvestmentFlow({
  source,
  enableWalletSelection,
  defaultWallet,
  onClose,
  onSuccess,
}: InvestmentFlowProps) {

  // Step management
  // Dashboard: 0 (wallet) → 1 (jenis) → 2 (detail) → 3 (konfirmasi)
  // Portfolio: starts at 1                         → 2 (detail) → 3 (konfirmasi)
  const startStep  = enableWalletSelection ? 0 : 1
  const [step, setStep] = useState<0 | 1 | 2 | 3>(startStep as 0 | 1 | 2 | 3)

  // Step 0 state
  const [selectedWallet, setSelectedWallet] = useState<WalletOption | null>(null)

  // Step 1 state
  const [investType, setInvestType] = useState<InvestType | null>(null)

  // Step 2 state
  const [name,   setName  ] = useState('')
  const [qty,    setQty   ] = useState('')
  const [amount, setAmount] = useState('')

  // Derived
  const [saving, setSaving] = useState(false)

  const parsedAmount = useMemo(
    () => parseInt(amount.replace(/\./g, '').replace(',', ''), 10) || 0,
    [amount]
  )

  const investLabel = INVEST_TYPES.find(t => t.type === investType)?.label ?? ''

  const nextStep = (s: 0 | 1 | 2 | 3): 0 | 1 | 2 | 3 => {
    const map: Record<0 | 1 | 2 | 3, 0 | 1 | 2 | 3> = { 0: 1, 1: 2, 2: 3, 3: 3 }
    return map[s]
  }
  const prevStep = (s: 0 | 1 | 2 | 3): 0 | 1 | 2 | 3 => {
    const map: Record<0 | 1 | 2 | 3, 0 | 1 | 2 | 3> = { 0: 0, 1: 0, 2: 1, 3: 2 }
    return map[s]
  }
    ? selectedWallet
    : defaultWallet
      ? { type: defaultWallet.type, accountId: defaultWallet.accountId ?? null, name: '', balance: 0, icon: '' }
      : null

  const walletKey = activeWallet
    ? `${activeWallet.type}${activeWallet.accountId ? `:${activeWallet.accountId}` : ''}`
    : 'bank'

  // ── Amount formatter ───────────────────────────────────────────────────────

  function handleAmountChange(raw: string) {
    const num = raw.replace(/\D/g, '')
    setAmount(num ? parseInt(num).toLocaleString('id-ID') : '')
  }

  // ── Validation per step ────────────────────────────────────────────────────

  const canProceed = useMemo(() => {
    if (step === 0) return !!selectedWallet
    if (step === 1) return !!investType
    if (step === 2) return !!name.trim() && parsedAmount > 0
    return true
  }, [step, selectedWallet, investType, name, parsedAmount])

  const insufficientBalance = useMemo(() => {
    if (!enableWalletSelection || !selectedWallet || parsedAmount <= 0) return false
    return parsedAmount > selectedWallet.balance
  }, [enableWalletSelection, selectedWallet, parsedAmount])

  // ── Confirm & save ─────────────────────────────────────────────────────────

  const handleConfirm = useCallback(async () => {
    if (!investType) return
    if (insufficientBalance) {
      toast.error('Saldo tidak cukup untuk investasi ini')
      return
    }

    const qtyNum = parseFloat(qty) || 1
    const wType  = activeWallet?.type ?? 'bank'
    const wAccId = activeWallet?.accountId ?? undefined
    const base   = { wallet: wType, walletAccountId: wAccId }

    const payloadMap: Record<string, Record<string, unknown>> = {
      saham:     { ...base, symbol: name.trim().toUpperCase(), lots: parseInt(qty) || 1, buyPrice: parsedAmount / ((parseInt(qty) || 1) * 100) },
      emas:      { ...base, source: name.trim() || 'Antam', grams: qtyNum, buyPrice: parsedAmount / qtyNum },
      reksadana: { ...base, name: name.trim(), unit: qtyNum, buyNAV: parsedAmount / qtyNum, currentNAV: parsedAmount / qtyNum },
      sbn:       { ...base, seriesCode: name.trim(), nominal: parsedAmount, couponRate: 6.25,
                   maturityDate: new Date(Date.now() + 3 * 365 * 86400000).toISOString().split('T')[0] },
      deposito:  { ...base, bankName: name.trim(), nominal: parsedAmount, interestRate: 5.5,
                   tenor: parseInt(qty) || 12, startDate: new Date().toISOString().split('T')[0] },
    }
    const payload = payloadMap[investType] ?? base

    setSaving(true)
    try {
      // 1. Create investment record (same endpoint as Portfolio)
      const investRes  = await fetch(ENDPOINT[investType], {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const investJson = await investRes.json()
      if (!investJson.success) throw new Error(investJson.error || 'Gagal menyimpan investasi')

      // 2. If source=dashboard, also create expense transaction (wallet deduction)
      if (source === 'dashboard' && enableWalletSelection && activeWallet) {
        // Find investment category ID
        const catRes  = await fetch('/api/categories?type=expense')
        const catJson = await catRes.json()
        const investCat = (catJson.data || []).find(
          (c: { name: string; id: string }) =>
            c.name.toLowerCase().includes('invest') || c.name.toLowerCase().includes('tabungan')
        )

        await fetch('/api/transactions', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type:            'expense',
            amount:          parsedAmount,
            wallet:          activeWallet.type,
            walletAccountId: activeWallet.accountId ?? undefined,
            date:            new Date().toISOString().split('T')[0],
            description:     `Investasi ${investLabel}${name ? ` - ${name}` : ''}`,
            categoryId:      investCat?.id ?? undefined,
          }),
        })

        // 3. Sync wallet balances
        await fetch('/api/wallet-accounts/sync', { method: 'POST' }).catch(() => {})
        window.dispatchEvent(new CustomEvent('fintrack:wallet-updated'))
      }

      toast.success(`Investasi ${investLabel} berhasil dicatat! ✓`)
      onSuccess?.()
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan investasi')
    } finally {
      setSaving(false)
    }
  }, [investType, parsedAmount, name, qty, activeWallet, source, enableWalletSelection, insufficientBalance, investLabel, onClose, onSuccess])

  // ── Step config ────────────────────────────────────────────────────────────

  // Steps shown in stepper depend on variant
  const stepLabels = enableWalletSelection
    ? ['Dana', 'Jenis', 'Detail', 'Konfirmasi']
    : ['Jenis', 'Detail', 'Konfirmasi']

  // Map raw step number → stepper dot index
  const dotIndex = enableWalletSelection ? step : step - 1

  // ── Field labels per type ──────────────────────────────────────────────────

  const nameLabel: Record<InvestType, string> = {
    saham:     'Kode Saham (Ticker)',
    emas:      'Sumber Emas',
    reksadana: 'Nama Reksa Dana',
    sbn:       'Kode Seri SBN',
    deposito:  'Nama Bank',
  }
  const namePlaceholder: Record<InvestType, string> = {
    saham:     'e.g. BBCA, TLKM',
    emas:      'e.g. Antam, Pegadaian',
    reksadana: 'e.g. Schroder Dana Prestasi',
    sbn:       'e.g. ORI026',
    deposito:  'e.g. BCA, Mandiri',
  }
  const qtyLabel: Record<InvestType, string> = {
    saham:     'Jumlah Lot',
    emas:      'Jumlah Gram',
    reksadana: 'Jumlah Unit',
    sbn:       'Nominal (Rp)',
    deposito:  'Tenor (bulan)',
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="w-full max-w-lg rounded-t-3xl flex flex-col overflow-hidden"
        style={{ background: 'var(--surface-1)', maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-2 pb-4">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--accent)' }}>
            <TrendingUp size={18} strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Beli Investasi</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {source === 'dashboard' ? 'Dari saldo dompet Anda' : 'Catat investasi baru'}
            </p>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 hover:opacity-70 transition-opacity"
            style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Step bar */}
        <div className="flex items-center px-5 pb-5">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <StepDot n={i + 1} current={dotIndex + 1} label={label} />
              {i < stepLabels.length - 1 && <StepLine active={dotIndex > i} />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 pb-2">
          <AnimatePresence mode="wait">

            {/* ── Step 0: Wallet Selector (dashboard only) ── */}
            {step === 0 && (
              <motion.div key="step0"
                initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}>
                <WalletSelectorStep
                  selected={selectedWallet}
                  onSelect={setSelectedWallet}
                  requiredAmount={parsedAmount}
                />
              </motion.div>
            )}

            {/* ── Step 1: Jenis Investasi ── */}
            {step === 1 && (
              <motion.div key="step1"
                initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}>
                <p className="text-base font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                  Pilih jenis investasi
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {INVEST_TYPES.map(it => (
                    <motion.button key={it.type} whileTap={{ scale: 0.96 }}
                      onClick={() => setInvestType(it.type)}
                      className="flex flex-col items-start p-4 rounded-2xl text-left"
                      style={{
                        background: investType === it.type ? 'rgba(34,197,94,0.12)' : 'var(--surface-2)',
                        border:     `1px solid ${investType === it.type ? 'rgba(34,197,94,0.35)' : 'var(--border)'}`,
                        boxShadow:  investType === it.type ? '0 4px 16px rgba(34,197,94,0.15)' : 'none',
                        transition: 'all 0.15s ease',
                      }}>
                      <span className="text-2xl mb-2">{it.icon}</span>
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{it.label}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{it.sub}</p>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Detail ── */}
            {step === 2 && investType && (
              <motion.div key="step2"
                initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-4">
                <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  Detail {investLabel}
                </p>

                {/* Name */}
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                    {nameLabel[investType]}
                  </label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder={namePlaceholder[investType]}
                    className="w-full px-4 py-3 rounded-xl text-sm font-semibold"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>

                {/* Qty */}
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                    {qtyLabel[investType]}
                  </label>
                  <input type="number" inputMode="numeric" value={qty} onChange={e => setQty(e.target.value)}
                    placeholder={investType === 'deposito' ? '12' : investType === 'emas' ? '1.0' : '1'}
                    className="w-full px-4 py-3 rounded-xl text-sm font-semibold"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                    Total Dana (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold select-none"
                      style={{ color: 'var(--accent)' }}>Rp</span>
                    <input type="text" inputMode="numeric" value={amount} onChange={e => handleAmountChange(e.target.value)}
                      placeholder="0"
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-bold"
                      style={{
                        background: 'var(--surface-2)',
                        border:     `1px solid ${insufficientBalance ? 'var(--red)' : 'var(--border)'}`,
                        color:      insufficientBalance ? 'var(--red)' : 'var(--accent)',
                        outline:    'none',
                      }}
                    />
                  </div>
                  {/* Insufficient balance warning */}
                  {insufficientBalance && selectedWallet && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <AlertCircle size={12} style={{ color: 'var(--red)' }} />
                      <p className="text-[11px] font-semibold" style={{ color: 'var(--red)' }}>
                        Saldo tidak cukup · Tersedia {formatCurrency(selectedWallet.balance)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Selected wallet info (read-only reminder) */}
                {enableWalletSelection && selectedWallet && (
                  <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <span className="text-base">{selectedWallet.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Sumber Dana</p>
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{selectedWallet.name}</p>
                    </div>
                    <p className="text-xs font-mono font-semibold flex-shrink-0" style={{ color: 'var(--accent)' }}>
                      {formatCurrency(selectedWallet.balance)}
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Step 3: Konfirmasi ── */}
            {step === 3 && (
              <motion.div key="step3"
                initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-3">
                <p className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                  Konfirmasi Pembelian
                </p>

                <div className="rounded-2xl overflow-hidden"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  {(([
                    enableWalletSelection && selectedWallet
                      ? ['Sumber Dana', `${selectedWallet.icon} ${selectedWallet.name}`]
                      : null,
                    ['Jenis Investasi', `${INVEST_TYPES.find(t => t.type === investType)?.icon ?? ''} ${investLabel}`],
                    ['Produk / Kode',   name || '-'],
                    ['Jumlah',          qty  || '-'],
                    ['Total Dana',      `Rp ${amount || '0'}`],
                  ]) as ([string, string] | null)[])
                    .filter((row): row is [string, string] => row !== null)
                    .map(([lbl, val], i, arr) => (
                      <div key={lbl}
                        className="flex justify-between items-center px-4 py-3"
                        style={i < arr.length - 1 ? { borderBottom: '1px solid var(--border)' } : undefined}>
                        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{lbl}</span>
                        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{val}</span>
                      </div>
                    ))
                  }
                </div>

                {enableWalletSelection && selectedWallet && (
                  <p className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>
                    {formatCurrency(parsedAmount)} akan dikurangi dari saldo {selectedWallet.name}
                  </p>
                )}

                {insufficientBalance && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)' }}>
                    <AlertCircle size={14} style={{ color: 'var(--red)' }} />
                    <p className="text-xs font-semibold" style={{ color: 'var(--red)' }}>
                      Saldo tidak cukup — kembali dan pilih sumber dana lain
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-5 pb-8 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          {step < 3 ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={!canProceed}
              onClick={() => setStep(s => nextStep(s))}
              className="w-full py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2"
              style={{
                background: canProceed ? 'var(--surface-2)' : 'var(--surface-3)',
                border:     `1px solid ${canProceed ? 'rgba(255,255,255,0.12)' : 'var(--border)'}`,
                color:      canProceed ? 'var(--text-primary)' : 'var(--text-muted)',
                opacity:    canProceed ? 1 : 0.55,
                transition: 'all 0.15s',
              }}
            >
              Lanjut <ArrowRight size={18} strokeWidth={2.5} />
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={saving || insufficientBalance}
              onClick={handleConfirm}
              className="w-full py-4 rounded-2xl text-base font-bold"
              style={{
                background: insufficientBalance ? 'var(--surface-3)' : 'var(--accent)',
                color:      insufficientBalance ? 'var(--text-muted)' : '#000',
                boxShadow:  insufficientBalance ? 'none' : '0 8px 24px rgba(34,197,94,0.30)',
                opacity:    saving ? 0.7 : 1,
                transition: 'all 0.15s',
              }}
            >
              {saving ? 'Menyimpan...' : insufficientBalance ? 'Saldo Tidak Cukup' : '✓ Konfirmasi Investasi'}
            </motion.button>
          )}

          {step > startStep && (
            <button
              onClick={() => setStep(s => prevStep(s))}
              className="w-full text-center text-sm mt-3 py-1 hover:opacity-70 transition-opacity"
              style={{ color: 'var(--text-muted)' }}
            >
              ← Kembali
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
