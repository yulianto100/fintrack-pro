'use client'

/**
 * app/(dashboard)/transaksi/transfer/page.tsx
 * Full transfer form for bank accounts.
 * Reads source account from search params: ?accountId=...&accountName=...&balance=...
 */

import { useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowDownUp } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'

import { ActionFormLayout, FormSection, StyledSelect, StyledTextArea, StyledInput } from '@/components/transactions/shared/ActionFormLayout'
import { CurrencyInput, formatRp } from '@/components/transactions/shared/CurrencyInput'
import { SuccessState } from '@/components/transactions/shared/SuccessState'

// ── Mock recipient list ─────────────────────────────────────
const MOCK_RECIPIENTS = [
  { value: 'bca-1234', label: 'BCA — 1234xxxx (Saya sendiri)' },
  { value: 'bni-5678', label: 'BNI — 5678xxxx' },
  { value: 'mandiri-9012', label: 'Mandiri — 9012xxxx' },
  { value: 'jago-3456', label: 'Bank Jago — 3456xxxx' },
  { value: 'other', label: 'Rekening lain…' },
]

// ── Validation ──────────────────────────────────────────────
function validateTransfer(params: {
  nominal: number
  tujuan: string
  tujuanManual: string
  balance: number
}): { [key: string]: string } {
  const errors: { [key: string]: string } = {}
  if (!params.tujuan) errors.tujuan = 'Pilih atau masukkan rekening tujuan'
  if (params.tujuan === 'other' && !params.tujuanManual.trim())
    errors.tujuanManual = 'Masukkan nomor rekening tujuan'
  if (params.nominal <= 0) errors.nominal = 'Nominal harus lebih dari Rp 0'
  if (params.nominal > params.balance) errors.nominal = `Saldo tidak cukup (saldo: ${formatRp(params.balance)})`
  return errors
}

// ── Simulate API call ───────────────────────────────────────
async function simulateTransfer(params: {
  accountId: string
  toAccount: string
  amount: number
  notes: string
}): Promise<void> {
  // In production, call: /api/transfers/external or internal transfer API
  await new Promise(r => setTimeout(r, 1500))
  // Optionally call: PATCH /api/wallet-accounts/:id to update balance
}

// ── Main form ───────────────────────────────────────────────
function TransferForm() {
  const sp = useSearchParams()
  const accountId   = sp.get('accountId') ?? ''
  const accountName = sp.get('accountName') ?? 'Rekening Saya'
  const balance     = parseInt(sp.get('balance') ?? '0', 10)

  const [nominal, setNominal]             = useState(0)
  const [tujuan, setTujuan]               = useState('')
  const [tujuanManual, setTujuanManual]   = useState('')
  const [catatan, setCatatan]             = useState('')
  const [loading, setLoading]             = useState(false)
  const [success, setSuccess]             = useState(false)
  const [errors, setErrors]               = useState<{ [k: string]: string }>({})
  const [submitted, setSubmitted]         = useState(false)  // track dirty state for live validation

  // Live re-validate after first submit attempt
  const currentErrors = useMemo(() => {
    if (!submitted) return {}
    return validateTransfer({ nominal, tujuan, tujuanManual, balance })
  }, [submitted, nominal, tujuan, tujuanManual, balance])

  const isValid = Object.keys(validateTransfer({ nominal, tujuan, tujuanManual, balance })).length === 0

  async function handleSubmit() {
    setSubmitted(true)
    const errs = validateTransfer({ nominal, tujuan, tujuanManual, balance })
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setLoading(true)
    try {
      await simulateTransfer({
        accountId,
        toAccount: tujuan === 'other' ? tujuanManual : tujuan,
        amount: nominal,
        notes: catatan,
      })
      setSuccess(true)
    } catch {
      setErrors({ submit: 'Transfer gagal. Coba lagi.' })
    } finally {
      setLoading(false)
    }
  }

  const recipientLabel = tujuan === 'other'
    ? (tujuanManual || 'Rekening lain')
    : (MOCK_RECIPIENTS.find(r => r.value === tujuan)?.label ?? tujuan)

  const summaryRows = [
    { label: 'Dari', value: accountName },
    { label: 'Ke', value: recipientLabel },
    { label: 'Nominal', value: formatRp(nominal) },
    ...(catatan ? [{ label: 'Catatan', value: catatan }] : []),
  ]

  return (
    <>
      <AnimatePresence>
        {success && (
          <SuccessState
            title="Transfer Berhasil! 🎉"
            subtitle={`${formatRp(nominal)} berhasil dikirim`}
            summaryRows={summaryRows}
            ctaLabel="Kembali ke Akun"
            ctaHref="/akun"
          />
        )}
      </AnimatePresence>

      <ActionFormLayout
        title="Transfer"
        subtitle="Kirim uang ke rekening lain"
        accountName={accountName}
        accountBalance={balance}
        ctaLabel="Kirim Transfer →"
        ctaDisabled={!isValid && submitted}
        ctaLoading={loading}
        onSubmit={handleSubmit}
        accentIcon={<ArrowDownUp size={16} />}
      >
        {/* Tujuan */}
        <FormSection title="Rekening Tujuan">
          <StyledSelect
            label="Pilih Tujuan"
            value={tujuan}
            onChange={v => { setTujuan(v); if (submitted) setErrors({}) }}
            options={MOCK_RECIPIENTS}
            placeholder="— Pilih rekening tujuan —"
          />
          {currentErrors.tujuan && (
            <p className="text-[11px] font-medium px-1" style={{ color: '#ef4444' }}>
              {currentErrors.tujuan}
            </p>
          )}

          {tujuan === 'other' && (
            <StyledInput
              label="Nomor Rekening / Nama"
              value={tujuanManual}
              onChange={setTujuanManual}
              placeholder="Masukkan nomor rekening"
              inputMode="text"
              error={currentErrors.tujuanManual}
            />
          )}
        </FormSection>

        {/* Nominal */}
        <FormSection title="Nominal Transfer">
          <CurrencyInput
            label="Jumlah"
            value={nominal}
            onChange={v => { setNominal(v); if (submitted) setErrors({}) }}
            max={balance}
            error={currentErrors.nominal}
            autoFocus={false}
            hint="Minimal Rp 10.000 — Maksimal sesuai saldo"
          />

          {/* Saldo preview */}
          {nominal > 0 && nominal <= balance && (
            <div
              className="flex items-center justify-between px-4 py-2.5 rounded-xl"
              style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.18)' }}
            >
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Saldo setelah transfer</span>
              <span className="text-[13px] font-bold" style={{ color: 'var(--accent)' }}>
                {formatRp(balance - nominal)}
              </span>
            </div>
          )}
        </FormSection>

        {/* Catatan */}
        <FormSection title="Catatan (Opsional)">
          <StyledTextArea
            label="Catatan"
            value={catatan}
            onChange={setCatatan}
            placeholder="Misalnya: bayar utang, bagi hasil, dll."
          />
        </FormSection>

        {/* Submit error */}
        {errors.submit && (
          <p className="text-[12px] font-semibold text-center px-2 py-3 rounded-xl"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
            {errors.submit}
          </p>
        )}
      </ActionFormLayout>
    </>
  )
}

export default function TransferPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)' }} />
      </div>
    }>
      <TransferForm />
    </Suspense>
  )
}
