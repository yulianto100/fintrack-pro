'use client'

/**
 * app/(dashboard)/transaksi/deposit/page.tsx
 * Tambah Saldo form for bank accounts.
 * Route: /transaksi/deposit?accountId=...&accountName=...&balance=...
 */

import { useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { TrendingUp } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'

import { ActionFormLayout, FormSection, StyledSelect } from '@/components/transactions/shared/ActionFormLayout'
import { CurrencyInput, formatRp } from '@/components/transactions/shared/CurrencyInput'
import { SuccessState } from '@/components/transactions/shared/SuccessState'

// ── Options ─────────────────────────────────────────────────
const SUMBER_OPTIONS = [
  { value: 'bank_lain',       label: '🏦 Bank Lain (Transfer Antar Bank)' },
  { value: 'tunai',           label: '💵 Tunai / Setor Tunai' },
  { value: 'atm',             label: '🏧 ATM' },
  { value: 'mobile_banking',  label: '📱 Mobile Banking' },
  { value: 'internet_banking',label: '💻 Internet Banking' },
  { value: 'gaji',            label: '💼 Gaji / Penghasilan' },
]

// ── Validation ───────────────────────────────────────────────
function validateDeposit(params: { nominal: number; sumber: string }) {
  const errors: Record<string, string> = {}
  if (params.nominal <= 0) errors.nominal = 'Nominal harus lebih dari Rp 0'
  if (params.nominal > 500_000_000) errors.nominal = 'Maksimal satu kali top-up Rp 500.000.000'
  if (!params.sumber) errors.sumber = 'Pilih sumber dana'
  return errors
}

// ── Simulate balance update ──────────────────────────────────
async function simulateDeposit(params: {
  accountId: string
  amount: number
  source: string
}): Promise<void> {
  // In production, call: PATCH /api/wallet-accounts/:id { balance: current + amount }
  // or POST a deposit transaction
  await new Promise(r => setTimeout(r, 1400))
}

// ── Main form ────────────────────────────────────────────────
function DepositForm() {
  const sp = useSearchParams()
  const accountId   = sp.get('accountId') ?? ''
  const accountName = sp.get('accountName') ?? 'Rekening Saya'
  const balance     = parseInt(sp.get('balance') ?? '0', 10)

  const [nominal, setNominal]     = useState(0)
  const [sumber, setSumber]       = useState('')
  const [loading, setLoading]     = useState(false)
  const [success, setSuccess]     = useState(false)
  const [error, setError]         = useState('')
  const [submitted, setSubmitted] = useState(false)

  const currentErrors = useMemo(() => {
    if (!submitted) return {}
    return validateDeposit({ nominal, sumber })
  }, [submitted, nominal, sumber])

  const isValid = Object.keys(validateDeposit({ nominal, sumber })).length === 0

  async function handleSubmit() {
    setSubmitted(true)
    const errs = validateDeposit({ nominal, sumber })
    if (Object.keys(errs).length > 0) return
    setLoading(true)
    try {
      await simulateDeposit({ accountId, amount: nominal, source: sumber })
      setSuccess(true)
    } catch {
      setError('Gagal menambah saldo. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const sumberLabel = SUMBER_OPTIONS.find(o => o.value === sumber)?.label ?? sumber

  const summaryRows = [
    { label: 'Akun',             value: accountName },
    { label: 'Saldo Sebelumnya', value: formatRp(balance) },
    { label: 'Ditambahkan',      value: `+${formatRp(nominal)}` },
    { label: 'Saldo Baru',       value: formatRp(balance + nominal) },
    { label: 'Sumber Dana',      value: sumberLabel },
  ]

  return (
    <>
      <AnimatePresence>
        {success && (
          <SuccessState
            title="Saldo Berhasil Ditambah! 💰"
            subtitle={`Saldo ${accountName} bertambah ${formatRp(nominal)}`}
            summaryRows={summaryRows}
            ctaLabel="Kembali ke Akun"
            ctaHref="/akun"
          />
        )}
      </AnimatePresence>

      <ActionFormLayout
        title="Tambah Saldo"
        subtitle="Catat saldo masuk ke rekening"
        accountName={accountName}
        accountBalance={balance}
        ctaLabel="Tambah Saldo →"
        ctaDisabled={!isValid && submitted}
        ctaLoading={loading}
        onSubmit={handleSubmit}
        accentIcon={<TrendingUp size={16} />}
      >
        {/* Nominal */}
        <FormSection title="Jumlah Saldo">
          <CurrencyInput
            label="Nominal"
            value={nominal}
            onChange={v => { setNominal(v); if (submitted) setError('') }}
            error={currentErrors.nominal}
            autoFocus
            hint="Masukkan jumlah saldo yang ingin ditambahkan"
          />

          {/* Preview */}
          {nominal > 0 && (
            <div
              className="flex items-center justify-between px-4 py-2.5 rounded-xl"
              style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.18)' }}
            >
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Saldo setelah ditambah</span>
              <span className="text-[14px] font-bold" style={{ color: 'var(--accent)' }}>
                {formatRp(balance + nominal)}
              </span>
            </div>
          )}
        </FormSection>

        {/* Sumber */}
        <FormSection title="Sumber Dana">
          <StyledSelect
            label="Sumber"
            value={sumber}
            onChange={v => { setSumber(v); if (submitted) setError('') }}
            options={SUMBER_OPTIONS}
            placeholder="— Pilih sumber dana —"
          />
          {currentErrors.sumber && (
            <p className="text-[11px] font-medium px-1" style={{ color: '#ef4444' }}>
              {currentErrors.sumber}
            </p>
          )}
        </FormSection>

        {/* Info banner */}
        <div
          className="flex gap-3 px-4 py-3 rounded-2xl"
          style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}
        >
          <span className="text-lg">ℹ️</span>
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Ini hanya pencatatan manual. Saldo rekening asli kamu tidak berubah secara otomatis.
          </p>
        </div>

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

export default function DepositPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)' }} />
      </div>
    }>
      <DepositForm />
    </Suspense>
  )
}
