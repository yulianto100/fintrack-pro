'use client'

/**
 * app/(dashboard)/ewallet/send/page.tsx
 *
 * FIX: onBlur fired before onClick on suggestion list, causing contacts
 * to never register when tapped. Fixed by:
 *  • Using onMouseDown instead of onClick on suggestion buttons
 *  • Removing the setTimeout blur workaround (unreliable on mobile)
 *  • Tracking suggestion hover with a ref so blur knows to stay open
 */

import { useState, useMemo, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowRight, Search, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import {
  ActionFormLayout,
  FormSection,
  StyledTextArea,
} from '@/components/transactions/shared/ActionFormLayout'
import { CurrencyInput, formatRp } from '@/components/transactions/shared/CurrencyInput'
import { SuccessState } from '@/components/transactions/shared/SuccessState'

// ── Mock contacts ────────────────────────────────────────────
const MOCK_CONTACTS = [
  { id: 'u001', name: 'Budi Santoso',  phone: '081234567890', provider: 'GoPay' },
  { id: 'u002', name: 'Sari Dewi',     phone: '082345678901', provider: 'OVO'   },
  { id: 'u003', name: 'Raka Putra',    phone: '083456789012', provider: 'Dana'  },
  { id: 'u004', name: 'Anisa Rahma',   phone: '081987654321', provider: 'GoPay' },
  { id: 'u005', name: 'Fajar Nugroho', phone: '089876543210', provider: 'OVO'   },
]
type Contact = (typeof MOCK_CONTACTS)[number]

// ── Helpers ───────────────────────────────────────────────────
function searchContacts(q: string): Contact[] {
  if (q.length < 2) return []
  const lower = q.toLowerCase()
  return MOCK_CONTACTS.filter(
    c => c.name.toLowerCase().includes(lower) || c.phone.includes(q)
  ).slice(0, 5)
}

function validate(p: {
  nominal: number
  recipient: Contact | null
  manualPhone: string
  balance: number
}) {
  const errors: Record<string, string> = {}
  const hasRecipient = p.recipient !== null || p.manualPhone.trim().length >= 8
  if (!hasRecipient) errors.tujuan = 'Masukkan nomor atau pilih penerima'
  if (p.nominal <= 0)           errors.nominal = 'Nominal harus lebih dari Rp 0'
  if (p.nominal < 1_000)        errors.nominal = 'Minimal kirim Rp 1.000'
  if (p.nominal > p.balance)    errors.nominal = `Saldo tidak cukup (saldo: ${formatRp(p.balance)})`
  return errors
}

async function simulateSend(params: {
  accountId: string
  toPhone: string
  amount: number
  notes: string
}): Promise<void> {
  await new Promise(r => setTimeout(r, 1700))
}

// ── Avatar chip ───────────────────────────────────────────────
function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <div
      className="flex-shrink-0 flex items-center justify-center rounded-full font-bold"
      style={{
        width: size, height: size,
        background: 'var(--accent)',
        color: '#fff',
        fontSize: size * 0.38,
      }}
    >
      {name[0].toUpperCase()}
    </div>
  )
}

// ── Main form ─────────────────────────────────────────────────
function SendForm() {
  const sp = useSearchParams()
  const accountId   = sp.get('accountId')   ?? ''
  const accountName = sp.get('accountName') ?? 'E-Wallet Saya'
  const balance     = parseInt(sp.get('balance') ?? '0', 10)

  // Form state
  const [nominal,    setNominal]    = useState(0)
  const [query,      setQuery]      = useState('')
  const [recipient,  setRecipient]  = useState<Contact | null>(null)
  const [catatan,    setCatatan]    = useState('')
  const [loading,    setLoading]    = useState(false)
  const [success,    setSuccess]    = useState(false)
  const [apiError,   setApiError]   = useState('')
  const [submitted,  setSubmitted]  = useState(false)
  const [showDropdown, setShowDrop] = useState(false)

  // FIX: track whether pointer is inside the dropdown so blur doesn't close it
  const insideDropdown = useRef(false)

  const suggestions = useMemo(() => searchContacts(query), [query])

  const currentErrors = useMemo(() => {
    if (!submitted) return {}
    return validate({ nominal, recipient, manualPhone: query, balance })
  }, [submitted, nominal, recipient, query, balance])

  const isValid = Object.keys(
    validate({ nominal, recipient, manualPhone: query, balance })
  ).length === 0

  // ── Contact selection ─────────────────────────────────────
  // onMouseDown fires BEFORE the input's onBlur, so the contact registers
  const pickContact = useCallback((c: Contact) => {
    setRecipient(c)
    setQuery(c.name)
    setShowDrop(false)
    insideDropdown.current = false
  }, [])

  const clearRecipient = useCallback(() => {
    setRecipient(null)
    setQuery('')
    setShowDrop(false)
  }, [])

  // Input handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    setRecipient(null)          // clear selection when user edits
    setShowDrop(true)
    if (submitted) setApiError('')
  }

  const handleInputFocus = () => setShowDrop(true)

  const handleInputBlur = () => {
    // Only close if pointer is not inside the dropdown
    if (!insideDropdown.current) setShowDrop(false)
  }

  // ── Submit ────────────────────────────────────────────────
  async function handleSubmit() {
    setSubmitted(true)
    if (!isValid) return
    setLoading(true)
    try {
      await simulateSend({
        accountId,
        toPhone: recipient?.phone ?? query,
        amount:  nominal,
        notes:   catatan,
      })
      setSuccess(true)
    } catch {
      setApiError('Pengiriman gagal. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  // ── Success summary ───────────────────────────────────────
  const recipientName = recipient?.name ?? query
  const summaryRows = [
    { label: 'Dari',        value: accountName },
    { label: 'Ke',          value: recipientName || '-' },
    { label: 'Nominal',     value: formatRp(nominal) },
    { label: 'Saldo Sisa',  value: formatRp(balance - nominal) },
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
        {/* ── Penerima ─────────────────────────────────────── */}
        <FormSection title="Penerima">
          <div className="flex flex-col gap-1.5">
            <label
              className="text-[11px] font-bold tracking-[0.12em] uppercase"
              style={{ color: 'var(--text-muted)' }}
            >
              Nomor / Nama Penerima
            </label>

            {/* Input box */}
            <div
              className="flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{
                background: 'var(--surface-card)',
                border: `1.5px solid ${
                  currentErrors.tujuan
                    ? 'rgba(239,68,68,0.6)'
                    : recipient || query
                    ? 'var(--accent)'
                    : 'var(--border)'
                }`,
                transition: 'border-color 200ms ease',
              }}
            >
              <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />

              {recipient ? (
                // Selected contact display
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <Avatar name={recipient.name} size={28} />
                  <div className="min-w-0">
                    <p
                      className="text-[13px] font-bold leading-none truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {recipient.name}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {recipient.phone} · {recipient.provider}
                    </p>
                  </div>
                </div>
              ) : (
                <input
                  value={query}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  placeholder="Cari nama atau nomor HP…"
                  className="flex-1 bg-transparent outline-none text-[14px] font-semibold min-w-0"
                  style={{
                    color:      'var(--text-primary)',
                    fontFamily: 'var(--font-syne, sans-serif)',
                    fontSize:   16, // prevent iOS zoom
                  }}
                />
              )}

              {(recipient || query) && (
                <button
                  type="button"
                  onMouseDown={clearRecipient}
                  className="flex-shrink-0 p-1 rounded-lg"
                  style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)' }}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Suggestion dropdown */}
            <AnimatePresence>
              {showDropdown && suggestions.length > 0 && !recipient && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background:  'var(--surface-card)',
                    border:      '1px solid var(--border)',
                    boxShadow:   '0 8px 24px rgba(0,0,0,0.35)',
                  }}
                  // Track pointer inside dropdown so blur doesn't dismiss it
                  onMouseEnter={() => { insideDropdown.current = true  }}
                  onMouseLeave={() => { insideDropdown.current = false }}
                  onTouchStart={() => { insideDropdown.current = true  }}
                >
                  {suggestions.map((c, i) => (
                    <button
                      key={c.id}
                      type="button"
                      // onMouseDown fires before onBlur — contact always registers
                      onMouseDown={() => pickContact(c)}
                      onTouchEnd={() => pickContact(c)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-opacity active:opacity-70"
                      style={{
                        borderBottom:
                          i < suggestions.length - 1
                            ? '1px solid rgba(255,255,255,0.05)'
                            : 'none',
                      }}
                    >
                      <Avatar name={c.name} size={36} />
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-[13px] font-bold truncate"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {c.name}
                        </p>
                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {c.phone} · {c.provider}
                        </p>
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

        {/* ── Nominal ──────────────────────────────────────── */}
        <FormSection title="Nominal">
          <CurrencyInput
            label="Jumlah"
            value={nominal}
            onChange={v => { setNominal(v); if (submitted) setApiError('') }}
            max={balance}
            error={currentErrors.nominal}
            hint="Minimal Rp 1.000"
          />

          {nominal > 0 && nominal <= balance && (
            <div
              className="flex items-center justify-between px-4 py-2.5 rounded-xl"
              style={{
                background: 'rgba(34,197,94,0.07)',
                border:     '1px solid rgba(34,197,94,0.18)',
              }}
            >
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Saldo tersisa
              </span>
              <span className="text-[14px] font-bold" style={{ color: 'var(--accent)' }}>
                {formatRp(balance - nominal)}
              </span>
            </div>
          )}
        </FormSection>

        {/* ── Catatan ───────────────────────────────────────── */}
        <FormSection title="Catatan (Opsional)">
          <StyledTextArea
            label="Pesan"
            value={catatan}
            onChange={setCatatan}
            placeholder="Tuliskan pesan untuk penerima…"
          />
        </FormSection>

        {/* API error */}
        {apiError && (
          <p
            className="text-[12px] font-semibold text-center px-2 py-3 rounded-xl"
            style={{
              background: 'rgba(239,68,68,0.1)',
              color:      '#ef4444',
              border:     '1px solid rgba(239,68,68,0.2)',
            }}
          >
            {apiError}
          </p>
        )}
      </ActionFormLayout>
    </>
  )
}

export default function EwalletSendPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div
            className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--accent)' }}
          />
        </div>
      }
    >
      <SendForm />
    </Suspense>
  )
}
