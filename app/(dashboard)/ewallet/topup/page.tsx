'use client'

/**
 * app/(dashboard)/ewallet/topup/page.tsx
 * Top Up form for e-wallet accounts.
 * Route: /ewallet/topup?accountId=...&accountName=...&balance=...
 */

import { useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { ActionFormLayout, FormSection, StyledSelect } from '@/components/transactions/shared/ActionFormLayout'
import { CurrencyInput, formatRp } from '@/components/transactions/shared/CurrencyInput'
import { SuccessState } from '@/components/transactions/shared/SuccessState'

// ── Metode top-up options ─────────────────────────────────
const METODE_OPTIONS = [
  { value: 'bank_transfer',   label: '🏦 Transfer Bank' },
  { value: 'virtual_account', label: '🔢 Virtual Account' },
  { value: 'qris',            label: '📲 QRIS' },
  { value: 'debit_card',      label: '💳 Kartu Debit' },
  { value: 'indomaret',       label: '🏪 Indomaret / Alfamart' },
]

// ── Top-up limits by method ───────────────────────────────
const METHOD_LIMITS: Record<string, { min: number; max: number }> = {
  bank_transfer:   { min: 10_000,  max: 20_000_000 },
  virtual_account: { min: 10_000,  max: 20_000_000 },
  qris:            { min: 1_000,   max: 2_000_000  },
  debit_card:      { min: 10_000,  max: 10_000_000 },
  indomaret:       { min: 10_000,  max: 5_000_000  },
}

// ── Validation ────────────────────────────────────────────
function validateTopUp(p: { nominal: number; metode: string }) {
  const errors: Record<string, string> = {}
  if (!p.metode) { errors.metode = 'Pilih metode top up'; return errors }
  const limits = METHOD_LIMITS[p.metode]
  if (p.nominal <= 0) errors.nominal = 'Nominal harus lebih dari Rp 0'
  else if (limits && p.nominal < limits.min)
    errors.nominal = `Minimal top up ${formatRp(limits.min)} via metode ini`
  else if (limits && p.nominal > limits.max)
    errors.nominal = `Maksimal top up ${formatRp(limits.max)} via metode ini`
  return errors
}

// ── Simulate top-up ────────────────────────────────────────
async function simulateTopUp(params: {
  accountId: string
  amount: number
  method: string
}): Promise<void> {
  // In production: PATCH /api/wallet-accounts/:id or POST transaction
  await new Promise(r => setTimeout(r, 1600))
}

// ── Main form ─────────────────────────────────────────────
function TopUpForm() {
  const sp = useSearchParams()
  const accountId   = sp.get('accountId') ?? ''
  const accountName = sp.get('accountName') ?? 'E-Wallet Saya'
  const balance     = parseInt(sp.get('balance') ?? '0', 10)

  const [nominal, setNominal]     = useState(0)
  const [metode, setMetode]       = useState('')
  const [loading, setLoading]     = useState(false)
  const [success, setSuccess]     = useState(false)
  const [error, setError]         = useState('')
  const [submitted, setSubmitted] = useState(false)

  const currentErrors = useMemo(() => {
    if (!submitted) return {}
    return validateTopUp({ nominal, metode })
  }, [submitted, nominal, metode])

  const isValid = Object.keys(validateTopUp({ nominal, metode })).length === 0
  const limits  = metode ? METHOD_LIMITS[metode] : null

  async function handleSubmit() {
    setSubmitted(true)
    if (!isValid) return
    setLoading(true)
    try {
      await simulateTopUp({ accountId, amount: nominal, method: metode })
      setSuccess(true)
    } catch {
      setError('Top up gagal. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const metodeLabel = METODE_OPTIONS.find(o => o.value === metode)?.label ?? metode
  const summaryRows = [
    { label: 'E-Wallet',     value: accountName },
    { label: 'Top Up',       value: `+${formatRp(nominal)}` },
    { label: 'Saldo Baru',   value: formatRp(balance + nominal) },
    { label: 'Metode',       value: metodeLabel },
  ]

  return (
    <>
      <AnimatePresence>
        {success && (
          <SuccessState
            title="Top Up Berhasil! ⚡"
            subtitle={`${accountName} berhasil di top up ${formatRp(nominal)}`}
            summaryRows={summaryRows}
            ctaLabel="Kembali ke Akun"
            ctaHref="/akun"
          />
        )}
      </AnimatePresence>

      <ActionFormLayout
        title="Top Up"
        subtitle={`Isi saldo ${accountName}`}
        accountName={accountName}
        accountBalance={balance}
        ctaLabel="Top Up Sekarang ⚡"
        ctaDisabled={!isValid && submitted}
        ctaLoading={loading}
        onSubmit={handleSubmit}
        accentIcon={<Zap size={16} />}
        accentColor="var(--accent)"
      >
        {/* Metode */}
        <FormSection title="Metode Top Up">
          <StyledSelect
            label="Pilih Metode"
            value={metode}
            onChange={v => { setMetode(v); if (submitted) setError('') }}
            options={METODE_OPTIONS}
            placeholder="— Pilih metode —"
          />
          {currentErrors.metode && (
            <p className="text-[11px] font-medium px-1" style={{ color: '#ef4444' }}>
              {currentErrors.metode}
            </p>
          )}

          {/* Method info pill */}
          <AnimatePresence>
            {limits && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center justify-between px-3 py-2 rounded-xl"
                style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.15)' }}
              >
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  Limit metode ini
                </span>
                <span className="text-[11px] font-bold" style={{ color: 'var(--accent)' }}>
                  {formatRp(limits.min)} – {formatRp(limits.max)}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </FormSection>

        {/* Nominal */}
        <FormSection title="Nominal Top Up">
          <CurrencyInput
            label="Jumlah"
            value={nominal}
            onChange={v => { setNominal(v); if (submitted) setError('') }}
            error={currentErrors.nominal}
            hint={limits ? `Batas: ${formatRp(limits.min)} – ${formatRp(limits.max)}` : undefined}
            disabled={!metode}
            autoFocus={false}
          />

          {/* Balance preview */}
          {nominal > 0 && !currentErrors.nominal && (
            <div
              className="flex items-center justify-between px-4 py-2.5 rounded-xl"
              style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.18)' }}
            >
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Saldo setelah top up</span>
              <span className="text-[14px] font-bold" style={{ color: 'var(--accent)' }}>
                {formatRp(balance + nominal)}
              </span>
            </div>
          )}
        </FormSection>

        {/* Error */}
        {error && (
          <p className="text-[12px] font-semibold text-center px-2 py-3 rounded-xl"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </p>
        )}
      </ActionFormLayout>
    </>
  )
}

export default function EwalletTopUpPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)' }} />
      </div>
    }>
      <TopUpForm />
    </Suspense>
  )
}
