'use client'

/**
 * app/(dashboard)/ewallet/send/page.tsx
 * Kirim (send) form for e-wallet accounts.
 * Route: /ewallet/send?accountId=...&accountName=...&balance=...
 */

import { useState, useMemo, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowRight, Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { ActionFormLayout, FormSection, StyledTextArea, StyledInput } from '@/components/transactions/shared/ActionFormLayout'
import { CurrencyInput, formatRp } from '@/components/transactions/shared/CurrencyInput'
import { SuccessState } from '@/components/transactions/shared/SuccessState'

// ── Mock contact list (in production: search /api/users/lookup) ─
const MOCK_CONTACTS = [
  { id: 'u001', name: 'Budi Santoso',   phone: '081234567890', provider: 'GoPay' },
  { id: 'u002', name: 'Sari Dewi',      phone: '082345678901', provider: 'OVO'   },
  { id: 'u003', name: 'Raka Putra',     phone: '083456789012', provider: 'Dana'  },
  { id: 'u004', name: 'Anisa Rahma',    phone: '081987654321', provider: 'GoPay' },
  { id: 'u005', name: 'Fajar Nugroho',  phone: '089876543210', provider: 'OVO'   },
]

type Contact = (typeof MOCK_CONTACTS)[number]

// ── Validation ─────────────────────────────────────────────
function validateSend(p: {
  nominal: number
  tujuan: string        // phone number or user id
  selectedContact: Contact | null
  balance: number
}) {
  const errors: Record<string, string> = {}
  if (!p.tujuan.trim() && !p.selectedContact)
    errors.tujuan = 'Masukkan nomor atau pilih penerima'
  if (p.nominal <= 0) errors.nominal = 'Nominal harus lebih dari Rp 0'
  if (p.nominal > p.balance)
    errors.nominal = `Saldo tidak cukup (saldo: ${formatRp(p.balance)})`
  if (p.nominal < 1_000) errors.nominal = 'Minimal kirim Rp 1.000'
  return errors
}

// ── Simulate send ──────────────────────────────────────────
async function simulateSend(p: {
  accountId: string
  toUserId?: string
  toPhone: string
  amount: number
  notes: string
}): Promise<void> {
  // In production: POST /api/transfers/ewallet or /api/transactions
  await new Promise(r => setTimeout(r, 1700))
}

// ── Phone search hook ──────────────────────────────────────
function useContactSearch(query: string): Contact[] {
  if (query.length < 3) return []
  const q = query.toLowerCase()
  return MOCK_CONTACTS.filter(
    c =>
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q)
  ).slice(0, 4)
}

// ── Main form ──────────────────────────────────────────────
function SendForm() {
  const sp = useSearchParams()
  const accountId   = sp.get('accountId') ?? ''
  const accountName = sp.get('accountName') ?? 'E-Wallet Saya'
  const balance     = parseInt(sp.get('balance') ?? '0', 10)

  const [nominal, setNominal]             = useState(0)
  const [query, setQuery]                 = useState('')           // raw input
  const [selectedContact, setSelected]   = useState<Contact | null>(null)
  const [catatan, setCatatan]             = useState('')
  const [loading, setLoading]             = useState(false)
  const [success, setSuccess]             = useState(false)
  const [error, setError]                 = useState('')
  const [submitted, setSubmitted]         = useState(false)
  const [showSuggestions, setShowSugg]   = useState(false)

  const suggestions = useContactSearch(query)

  const tujuanValue = selectedContact ? selectedContact.phone : query

  const currentErrors = useMemo(() => {
    if (!submitted) return {}
    return validateSend({ nominal, tujuan: tujuanValue, selectedContact, balance })
  }, [submitted, nominal, tujuanValue, selectedContact, balance])

  const isValid = Object.keys(
    validateSend({ nominal, tujuan: tujuanValue, selectedContact, balance })
  ).length === 0

  const pickContact = useCallback((c: Contact) => {
    setSelected(c)
    setQuery(c.name)
    setShowSugg(false)
  }, [])

  const clearContact = useCallback(() => {
    setSelected(null)
    setQuery('')
    setShowSugg(false)
  }, [])

  async function handleSubmit() {
    setSubmitted(true)
    if (!isValid) return
    setLoading(true)
    try {
      await simulateSend({
        accountId,
        toUserId: selectedContact?.id,
        toPhone:  selectedContact?.phone ?? query,
        amount:   nominal,
        notes:    catatan,
      })
      setSuccess(true)
    } catch {
      setError('Pengiriman gagal. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const recipientName = selectedContact ? selectedContact.name : query
  const summaryRows = [
    { label: 'Dari',          value: accountName },
    { label: 'Ke',            value: recipientName || '-' },
    { label: 'Nominal',       value: formatRp(nominal) },
    { label: 'Saldo Sisa',    value: formatRp(balance - nominal) },
    ...(catatan ? [{ label: 'Catatan', value: catatan }] : []),
  ]

  return (
    <>
      <AnimatePresence>
        {success && (
          <SuccessState
            title="Pengiriman Berhasil! 🚀"
            subtitle={`${formatRp(nominal)} berhasil dikirim ke ${recipientName}`}
            summaryRows={summaryRows}
            ctaLabel="Kembali ke Akun"
            ctaHref="/akun"
          />
        )}
      </AnimatePresence>

      <ActionFormLayout
        title="Kirim"
        subtitle={`Kirim dari ${accountName}`}
        accountName={accountName}
        accountBalance={balance}
        ctaLabel="Kirim Sekarang →"
        ctaDisabled={!isValid && submitted}
        ctaLoading={loading}
        onSubmit={handleSubmit}
        accentIcon={<ArrowRight size={16} />}
      >
        {/* ── Tujuan ─────────────────────────────────────────── */}
        <FormSection title="Penerima">
          <div className="flex flex-col gap-1.5">
            <label
              className="text-[11px] font-bold tracking-[0.12em] uppercase"
              style={{ color: 'var(--text-muted)' }}
            >
              Nomor / Nama Penerima
            </label>

            {/* Input wrapper */}
            <div
              className="flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{
                background: 'var(--surface-card)',
                border: `1.5px solid ${
                  currentErrors.tujuan
                    ? 'rgba(239,68,68,0.6)'
                    : selectedContact || query
                    ? 'var(--accent)'
                    : 'var(--border)'
                }`,
              }}
            >
              <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />

              {selectedContact ? (
                // Selected contact chip
                <div className="flex-1 flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                  >
                    {selectedContact.name[0]}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold leading-none" style={{ color: 'var(--text-primary)' }}>
                      {selectedContact.name}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {selectedContact.phone} · {selectedContact.provider}
                    </p>
                  </div>
                </div>
              ) : (
                <input
                  value={query}
                  onChange={e => {
                    setQuery(e.target.value)
                    setShowSugg(true)
                    if (submitted) setError('')
                  }}
                  onFocus={() => setShowSugg(true)}
                  onBlur={() => setTimeout(() => setShowSugg(false), 150)}
                  placeholder="Cari nama atau nomor HP…"
                  inputMode="text"
                  className="flex-1 bg-transparent outline-none text-[14px] font-semibold"
                  style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-syne)' }}
                />
              )}

              {(selectedContact || query) && (
                <button
                  type="button"
                  onClick={clearContact}
                  className="text-[10px] px-2 py-1 rounded-lg flex-shrink-0"
                  style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)' }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Suggestions dropdown */}
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  className="rounded-2xl overflow-hidden"
                  style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
                >
                  {suggestions.map((c, i) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => pickContact(c)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:opacity-80 transition-opacity"
                      style={{ borderBottom: i < suggestions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0"
                        style={{ background: 'var(--accent)', color: '#fff' }}
                      >
                        {c.name[0]}
                      </div>
                      <div className="flex-1">
                        <p className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{c.phone} · {c.provider}</p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {currentErrors.tujuan && (
              <p className="text-[11px] font-medium px-1" style={{ color: '#ef4444' }}>
                {currentErrors.tujuan}
              </p>
            )}
          </div>
        </FormSection>

        {/* ── Nominal ─────────────────────────────────────────── */}
        <FormSection title="Nominal">
          <CurrencyInput
            label="Jumlah"
            value={nominal}
            onChange={v => { setNominal(v); if (submitted) setError('') }}
            max={balance}
            error={currentErrors.nominal}
            hint="Minimal Rp 1.000"
          />

          {nominal > 0 && nominal <= balance && (
            <div
              className="flex items-center justify-between px-4 py-2.5 rounded-xl"
              style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.18)' }}
            >
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Saldo tersisa</span>
              <span className="text-[14px] font-bold" style={{ color: 'var(--accent)' }}>
                {formatRp(balance - nominal)}
              </span>
            </div>
          )}
        </FormSection>

        {/* ── Catatan ─────────────────────────────────────────── */}
        <FormSection title="Catatan (Opsional)">
          <StyledTextArea
            label="Pesan"
            value={catatan}
            onChange={setCatatan}
            placeholder="Tuliskan pesan untuk penerima…"
          />
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

export default function EwalletSendPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)' }} />
      </div>
    }>
      <SendForm />
    </Suspense>
  )
}
