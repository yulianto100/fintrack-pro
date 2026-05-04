'use client'

import { useState, memo }          from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Building2, CreditCard, Wallet, ChevronLeft } from 'lucide-react'
import { useAccounts }             from '@/hooks/useAccounts'
import type { AccountType }        from '@/types/account'

// ── Provider data with logos ──────────────────────────────────
interface ProviderInfo {
  name:    string
  logoUrl: string
}

const BANK_PROVIDERS: ProviderInfo[] = [
  { name: 'BCA',        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Bank_Central_Asia.svg' },
  { name: 'Mandiri',    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/ad/Bank_Mandiri_logo_2016.svg' },
  { name: 'BRI',        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/68/BANK_BRI_logo.svg' },
  { name: 'BNI',        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/55/BNI_logo.svg' },
  { name: 'CIMB Niaga', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/CIMB_Niaga.svg' },
  { name: 'Jago',       logoUrl: 'https://upload.wikimedia.org/wikipedia/id/b/bd/Bank_Jago_logo.svg' },
  { name: 'Jenius',     logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Jenius_logo.svg' },
  { name: 'BSI',        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Bank_Syariah_Indonesia.svg' },
  { name: 'Permata',    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a3/Bank_Permata.svg' },
  { name: 'Danamon',    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/cc/Bank-danamon.svg' },
  { name: 'OCBC',       logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/OCBC_NISP_logo.svg' },
  { name: 'BTN',        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/52/Logo_Bank_BTN.svg' },
  { name: 'Sinarmas',   logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/09/Bank_Sinarmas_logo.svg' },
  { name: 'Panin',      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Panin_Bank_logo.svg' },
  { name: 'Mega',       logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/db/Logo-bank-mega.svg' },
]

const EWALLET_PROVIDERS: ProviderInfo[] = [
  { name: 'GoPay',     logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/86/Gopay_logo.svg' },
  { name: 'OVO',       logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/eb/Logo_ovo_purple.svg' },
  { name: 'DANA',      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Logo_dana_blue.svg' },
  { name: 'ShopeePay', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Shopee.svg' },
  { name: 'LinkAja',   logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/85/LinkAja.svg' },
  { name: 'Flip',      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c6/Flip_logo_%28company%29.svg' },
]

const CARD_COLORS = [
  '#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4',
]

// ── Provider Logo component ───────────────────────────────────
function ProviderLogo({ logoUrl, name, size = 28 }: { logoUrl: string; name: string; size?: number }) {
  const [errored, setErrored] = useState(false)
  if (errored) {
    return (
      <div
        className="rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ width: size, height: size, background: 'var(--accent-dim)', fontSize: size * 0.35, fontWeight: 700, color: 'var(--accent)' }}
      >
        {name.slice(0, 2).toUpperCase()}
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={name}
      width={size}
      height={size}
      onError={() => setErrored(true)}
      style={{ objectFit: 'contain', flexShrink: 0, width: size, height: size }}
    />
  )
}

// ── Shared modal wrapper ──────────────────────────────────────
function ModalWrapper({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      {/* Solid black overlay — no blur so background is completely hidden */}
      <motion.div
        key="add-bd"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.88)' }}
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
        <motion.div
          key="add-panel"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
          className="pointer-events-auto w-full max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden"
          style={{
            background: 'var(--surface-elevated)',
            border:     '1px solid var(--border)',
            maxHeight:  '90dvh',
            overflowY:  'auto',
            /* Force solid — no transparency leaking from parent */
            isolation:  'isolate',
          }}
        >
          {children}
        </motion.div>
      </div>
    </>
  )
}

// ── Type selector (step 0) ────────────────────────────────────
const TYPE_CARDS: { type: AccountType; icon: React.ElementType; label: string; desc: string }[] = [
  { type: 'bank',    icon: Building2,  label: 'Rekening Bank',   desc: 'Tabungan & giro' },
  { type: 'credit',  icon: CreditCard, label: 'Kartu Kredit',    desc: 'Utang aktif'     },
  { type: 'ewallet', icon: Wallet,     label: 'E-Wallet',        desc: 'Dompet digital'  },
]

function TypeSelector({ onSelect }: { onSelect: (t: AccountType) => void }) {
  return (
    <div className="flex flex-col gap-3 p-4">
      {TYPE_CARDS.map(({ type, icon: Icon, label, desc }) => (
        <button
          key={type}
          onClick={() => onSelect(type)}
          className="flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-colors active:opacity-70"
          style={{
            background: 'var(--surface-card)',
            border:     '1px solid var(--border)',
          }}
        >
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--accent-dim)' }}
          >
            <Icon size={20} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{desc}</p>
          </div>
        </button>
      ))}
    </div>
  )
}

// ── Provider chip picker (horizontal scroll, clean pill style) ─
function ProviderChipPicker({
  providers,
  selected,
  onSelect,
}: { providers: ProviderInfo[]; selected: string; onSelect: (p: string) => void }) {
  return (
    <div className="flex flex-col gap-3">
      {/* Chip scroll row */}
      <div
        className="flex gap-2 overflow-x-auto"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', paddingBottom: 2 }}
      >
        {providers.map(p => {
          const active = selected === p.name
          return (
            <button
              key={p.name}
              onClick={() => onSelect(p.name)}
              className="flex items-center gap-2 flex-shrink-0 transition-all active:scale-95"
              style={{
                padding:         '8px 14px 8px 10px',
                borderRadius:    999,
                background:      active ? 'var(--accent-dim)' : 'var(--surface-card)',
                border:          `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                boxShadow:       active ? '0 0 0 3px rgba(34,197,94,0.10)' : 'none',
              }}
            >
              <div
                style={{
                  width: 22, height: 22, borderRadius: 6, overflow: 'hidden',
                  background: 'rgba(255,255,255,0.08)', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <ProviderLogo logoUrl={p.logoUrl} name={p.name} size={18} />
              </div>
              <span
                style={{
                  fontSize:   12,
                  fontWeight: active ? 700 : 500,
                  color:      active ? 'var(--accent)' : 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                }}
              >
                {p.name}
              </span>
            </button>
          )
        })}
      </div>

      {/* Selected display card */}
      {selected && (
        <div
          className="flex items-center gap-3 px-3.5 py-3 rounded-2xl"
          style={{
            background: 'var(--accent-dim)',
            border:     '1.5px solid var(--accent)',
          }}
        >
          <div
            style={{
              width: 36, height: 36, borderRadius: 10, overflow: 'hidden',
              background: 'rgba(255,255,255,0.12)', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ProviderLogo
              logoUrl={providers.find(p => p.name === selected)?.logoUrl ?? ''}
              name={selected}
              size={28}
            />
          </div>
          <div className="flex-1">
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{selected}</p>
            <p style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 500 }}>Dipilih ✓</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Add Bank / Ewallet form ───────────────────────────────────
function WalletForm({ type, onDone }: { type: 'bank' | 'ewallet'; onDone: () => void }) {
  const { addWalletAccount } = useAccounts()
  const providers = type === 'bank' ? BANK_PROVIDERS : EWALLET_PROVIDERS
  const [provider, setProvider] = useState('')
  const [name,     setName]     = useState('')
  const [saving,   setSaving]   = useState(false)

  // Auto-sync name whenever provider changes
  const handleProviderSelect = (p: string) => {
    setProvider(p)
    setName(p) // always follow the selected bank/ewallet name
  }

  const handleSave = async () => {
    const finalName = name.trim() || provider
    if (!finalName) return
    setSaving(true)
    try {
      await addWalletAccount({ type, name: finalName, balance: 0 })
      onDone()
    } catch { /* toast already shown */ }
    finally { setSaving(false) }
  }

  return (
    <div className="px-4 pb-6 flex flex-col gap-4">
      {/* Provider */}
      <div>
        <p className="text-[11px] font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
          {type === 'bank' ? 'PILIH BANK' : 'PILIH E-WALLET'}
        </p>
        <ProviderChipPicker
          providers={providers}
          selected={provider}
          onSelect={handleProviderSelect}
        />
      </div>

      {/* Custom name — shows auto-filled value, still editable */}
      <div>
        <p className="text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
          NAMA AKUN
        </p>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={type === 'bank' ? 'Pilih bank dulu' : 'Pilih e-wallet dulu'}
          className="w-full px-4 py-3 rounded-2xl text-[13px] outline-none"
          style={{
            background: 'var(--surface-card)',
            border:     '1px solid var(--border)',
            color:      'var(--text-primary)',
          }}
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !(name.trim() || provider)}
        className="w-full py-3.5 rounded-2xl text-[14px] font-bold transition-opacity"
        style={{
          background: 'var(--accent)',
          color:      '#fff',
          opacity:    saving || !(name.trim() || provider) ? 0.5 : 1,
        }}
      >
        {saving ? 'Menyimpan…' : type === 'bank' ? 'Tambah Rekening' : 'Tambah E-Wallet'}
      </button>
    </div>
  )
}

// ── Add Credit Card form ──────────────────────────────────────
function CreditCardForm({ onDone }: { onDone: () => void }) {
  const { addCreditCard } = useAccounts()
  const [provider,     setProvider]     = useState('')
  const [name,         setName]         = useState('')
  const [last4,        setLast4]        = useState('')
  const [limit,        setLimit]        = useState('')
  const [billingDate,  setBillingDate]  = useState('25')
  const [dueDate,      setDueDate]      = useState('15')
  const [color,        setColor]        = useState(CARD_COLORS[0])
  const [saving,       setSaving]       = useState(false)

  const handleLimitChange = (v: string) => {
    const numeric = v.replace(/\D/g, '')
    setLimit(numeric ? parseInt(numeric, 10).toLocaleString('id-ID') : '')
  }

  const getRaw = () => parseInt(limit.replace(/\./g, '').replace(',', '.'), 10) || 0

  const handleSave = async () => {
    const finalName = name.trim()
    if (!finalName || getRaw() <= 0) return
    setSaving(true)
    try {
      await addCreditCard({
        name:        finalName,
        bankName:    provider,
        last4:       last4.slice(-4),
        limit:       getRaw(),
        billingDate: Number(billingDate),
        dueDate:     Number(dueDate),
        color,
      })
      onDone()
    } catch { /* toast */ }
    finally { setSaving(false) }
  }

  return (
    <div className="px-4 pb-6 flex flex-col gap-4">
      {/* Bank picker */}
      <div>
        <p className="text-[11px] font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>PENERBIT KARTU</p>
        <ProviderChipPicker
          providers={BANK_PROVIDERS}
          selected={provider}
          onSelect={p => { setProvider(p); if (!name) setName(`${p} Credit Card`) }}
        />
      </div>

      {/* Nama kartu */}
      <div>
        <p className="text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>NAMA KARTU</p>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Contoh: BCA Platinum"
          className="w-full px-4 py-3 rounded-2xl text-[13px] outline-none"
          style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
      </div>

      {/* 4 digit terakhir */}
      <div>
        <p className="text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>4 DIGIT TERAKHIR</p>
        <input
          value={last4}
          onChange={e => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
          inputMode="numeric"
          maxLength={4}
          placeholder="1234"
          className="w-full px-4 py-3 rounded-2xl text-[13px] outline-none"
          style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
      </div>

      {/* Limit */}
      <div>
        <p className="text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>LIMIT KARTU</p>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold px-3" style={{ color: 'var(--text-muted)' }}>Rp</span>
          <input
            value={limit}
            onChange={e => handleLimitChange(e.target.value)}
            inputMode="numeric"
            placeholder="0"
            className="flex-1 px-4 py-3 rounded-2xl text-[13px] outline-none"
            style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* Billing & due dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>TGL TAGIHAN</p>
          <input
            value={billingDate}
            onChange={e => setBillingDate(e.target.value)}
            inputMode="numeric"
            maxLength={2}
            placeholder="25"
            className="w-full px-4 py-3 rounded-2xl text-[13px] outline-none"
            style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
        <div>
          <p className="text-[11px] font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>TGL JATUH TEMPO</p>
          <input
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            inputMode="numeric"
            maxLength={2}
            placeholder="15"
            className="w-full px-4 py-3 rounded-2xl text-[13px] outline-none"
            style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* Color picker */}
      <div>
        <p className="text-[11px] font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>WARNA KARTU</p>
        <div className="flex gap-2">
          {CARD_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-8 h-8 rounded-full transition-transform active:scale-90"
              style={{
                background: c,
                outline:    color === c ? `3px solid ${c}` : 'none',
                outlineOffset: 2,
              }}
            />
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !name.trim() || getRaw() <= 0}
        className="w-full py-3.5 rounded-2xl text-[14px] font-bold transition-opacity"
        style={{ background: 'var(--accent)', color: '#fff', opacity: saving || !name.trim() || getRaw() <= 0 ? 0.5 : 1 }}
      >
        {saving ? 'Menyimpan…' : 'Tambah Kartu Kredit'}
      </button>
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────
interface Props {
  initialType?: AccountType | null
  onClose:      () => void
}

export const AddAccountModal = memo(function AddAccountModal({ initialType, onClose }: Props) {
  const [visible, setVisible] = useState(true)
  const [type, setType]       = useState<AccountType | null>(initialType ?? null)

  const handleClose = () => setVisible(false)

  const LABELS: Record<AccountType, string> = {
    bank:    'Tambah Rekening',
    credit:  'Tambah Kartu Kredit',
    ewallet: 'Tambah E-Wallet',
  }

  return (
    <AnimatePresence onExitComplete={onClose}>
      {visible && (
        <ModalWrapper onClose={handleClose}>
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-4"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            {type ? (
              <button onClick={() => setType(null)} className="p-1.5 rounded-xl" style={{ color: 'var(--text-muted)' }}>
                <ChevronLeft size={18} />
              </button>
            ) : <div className="w-8" />}

            <p className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>
              {type ? LABELS[type] : 'Tambah Akun'}
            </p>

            <button onClick={handleClose} className="p-1.5 rounded-xl" style={{ color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <AnimatePresence mode="wait">
            {!type ? (
              <motion.div
                key="type-select"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.18 }}
              >
                <TypeSelector onSelect={setType} />
              </motion.div>
            ) : type === 'credit' ? (
              <motion.div
                key="credit-form"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.18 }}
              >
                <CreditCardForm onDone={handleClose} />
              </motion.div>
            ) : (
              <motion.div
                key="wallet-form"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.18 }}
              >
                <WalletForm type={type} onDone={handleClose} />
              </motion.div>
            )}
          </AnimatePresence>
        </ModalWrapper>
      )}
    </AnimatePresence>
  )
})
