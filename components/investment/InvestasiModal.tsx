'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, TrendingUp, ChevronRight, AlertCircle, CheckCircle2,
  Wallet, ArrowRight, Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils'
import type { WalletType } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type InvestType = 'saham' | 'emas' | 'reksadana' | 'sbn' | 'deposito'

interface WalletBalances {
  cash: number
  bank: number
  ewallet: number
}

interface Props {
  walletBalances: WalletBalances
  onClose: () => void
  onSuccess?: () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INVEST_TYPES: {
  id: InvestType
  label: string
  icon: string
  color: string
  description: string
}[] = [
  { id: 'saham',     label: 'Saham',     icon: '📈', color: '#22C55E', description: 'Bursa Efek Indonesia' },
  { id: 'emas',      label: 'Emas',      icon: '🥇', color: '#F59E0B', description: 'Emas fisik & digital'  },
  { id: 'reksadana', label: 'Reksadana', icon: '💼', color: '#3B82F6', description: 'Reksa dana manajer'    },
  { id: 'sbn',       label: 'SBN',       icon: '🏛️', color: '#8B5CF6', description: 'Surat Berharga Negara' },
  { id: 'deposito',  label: 'Deposito',  icon: '🏦', color: '#EC4899', description: 'Deposito berjangka'    },
]

const WALLET_OPTS: { value: WalletType; icon: string; label: string }[] = [
  { value: 'cash',    icon: '💵', label: 'Tunai'   },
  { value: 'bank',    icon: '🏦', label: 'Bank'    },
  { value: 'ewallet', icon: '📱', label: 'E-Wallet' },
]

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepDot({ active, done, n }: { active: boolean; done: boolean; n: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all"
        style={{
          background: done
            ? 'var(--accent)'
            : active
            ? 'rgba(34,197,94,0.20)'
            : 'rgba(255,255,255,0.06)',
          color: done || active ? (done ? '#fff' : 'var(--accent)') : 'var(--text-muted)',
          border: active ? '1px solid var(--accent)' : done ? 'none' : '1px solid var(--border)',
        }}
      >
        {done ? <CheckCircle2 size={13} /> : n}
      </div>
    </div>
  )
}

// ─── Input component ──────────────────────────────────────────────────────────

function Field({
  label, value, onChange, placeholder, prefix, type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  prefix?: string
  type?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2.5"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}
      >
        {prefix && (
          <span className="text-sm font-bold shrink-0" style={{ color: 'var(--accent)' }}>{prefix}</span>
        )}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-transparent flex-1 outline-none text-sm"
          style={{ color: 'var(--text-primary)' }}
          inputMode={type === 'number' ? 'decimal' : 'text'}
        />
      </div>
    </div>
  )
}

// ─── Currency input (formatted) ───────────────────────────────────────────────

function CurrencyField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const display = value ? parseInt(value.replace(/\D/g, '') || '0', 10).toLocaleString('id-ID') : ''
  const handleChange = (raw: string) => {
    const num = raw.replace(/\D/g, '')
    onChange(num)
  }
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2.5"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}
      >
        <span className="text-sm font-bold shrink-0" style={{ color: 'var(--accent)' }}>Rp</span>
        <input
          type="text"
          inputMode="numeric"
          value={display}
          onChange={e => handleChange(e.target.value)}
          placeholder="0"
          className="bg-transparent flex-1 outline-none text-sm font-mono"
          style={{ color: 'var(--text-primary)' }}
        />
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function InvestasiModal({ walletBalances, onClose, onSuccess }: Props) {
  const [step,        setStep       ] = useState<1 | 2 | 3>(1)
  const [investType,  setInvestType ] = useState<InvestType | null>(null)
  const [wallet,      setWallet     ] = useState<WalletType>('bank')
  const [saving,      setSaving     ] = useState(false)

  // ── Saham fields
  const [kodeSaham,   setKodeSaham  ] = useState('')
  const [hargaLot,    setHargaLot   ] = useState('')
  const [jumlahLot,   setJumlahLot  ] = useState('')

  // ── Emas fields
  const [beratEmas,   setBeratEmas  ] = useState('')
  const [hargaGram,   setHargaGram  ] = useState('')

  // ── Reksadana fields
  const [namaReksa,   setNamaReksa  ] = useState('')
  const [nominalReksa,setNominalReksa] = useState('')

  // ── SBN fields
  const [namaSBN,     setNamaSBN    ] = useState('')
  const [nominalSBN,  setNominalSBN ] = useState('')

  // ── Deposito fields
  const [bankDepo,    setBankDepo   ] = useState('')
  const [nominalDepo, setNominalDepo] = useState('')
  const [bungaDepo,   setBungaDepo  ] = useState('')
  const [durasiDepo,  setDurasiDepo ] = useState('')

  // ── Computed total ────────────────────────────────────────────────────────
  const total = useMemo(() => {
    switch (investType) {
      case 'saham':
        return (parseFloat(hargaLot  || '0')) * (parseFloat(jumlahLot || '0')) * 100
      case 'emas':
        return (parseFloat(beratEmas || '0')) * (parseFloat(hargaGram || '0'))
      case 'reksadana':
        return parseFloat(nominalReksa.replace(/\D/g, '') || '0')
      case 'sbn':
        return parseFloat(nominalSBN.replace(/\D/g, '') || '0')
      case 'deposito':
        return parseFloat(nominalDepo.replace(/\D/g, '') || '0')
      default:
        return 0
    }
  }, [investType, hargaLot, jumlahLot, beratEmas, hargaGram, nominalReksa, nominalSBN, nominalDepo])

  const currentBalance = walletBalances[wallet]
  const insufficient   = total > 0 && total > currentBalance

  const typeInfo = INVEST_TYPES.find(t => t.id === investType)

  // ── Form validity ──────────────────────────────────────────────────────────
  const formValid = useMemo(() => {
    if (!investType || total <= 0) return false
    switch (investType) {
      case 'saham':     return !!kodeSaham.trim() && parseFloat(hargaLot || '0') > 0 && parseFloat(jumlahLot || '0') > 0
      case 'emas':      return parseFloat(beratEmas || '0') > 0 && parseFloat(hargaGram || '0') > 0
      case 'reksadana': return !!namaReksa.trim() && total > 0
      case 'sbn':       return !!namaSBN.trim() && total > 0
      case 'deposito':  return !!bankDepo.trim() && total > 0 && !!bungaDepo && !!durasiDepo
      default:          return false
    }
  }, [investType, total, kodeSaham, hargaLot, jumlahLot, beratEmas, hargaGram, namaReksa, namaSBN, bankDepo, bungaDepo, durasiDepo])

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!investType || !formValid || insufficient) return
    setSaving(true)
    try {
      const today = new Date().toISOString().split('T')[0]

      // 1. Deduct wallet — create expense transaction
      const txBody: Record<string, unknown> = {
        type: 'expense',
        amount: total,
        wallet,
        description: getDescription(),
        date: today,
        categoryId: 'investasi',  // special sentinel (API falls back gracefully)
        categoryName: 'Investasi',
        categoryIcon: typeInfo?.icon || '📈',
        tags: ['investasi'],
      }
      const txRes  = await fetch('/api/transactions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txBody),
      })
      const txJson = await txRes.json()
      if (!txJson.success) throw new Error(txJson.error)

      // 2. Add to portfolio
      await addToPortfolio(today)

      toast.success('Investasi berhasil ditambahkan 🎉', { duration: 3500 })
      onSuccess?.()
      onClose()
    } catch (err) {
      toast.error('Gagal menyimpan investasi: ' + String(err))
    } finally {
      setSaving(false)
    }
  }, [investType, formValid, insufficient, total, wallet, typeInfo])

  function getDescription(): string {
    switch (investType) {
      case 'saham':     return `Beli Saham ${kodeSaham.toUpperCase()} ${jumlahLot} Lot`
      case 'emas':      return `Beli Emas ${beratEmas}g`
      case 'reksadana': return `Beli Reksadana ${namaReksa}`
      case 'sbn':       return `Beli SBN ${namaSBN.toUpperCase()}`
      case 'deposito':  return `Deposito ${bankDepo} ${durasiDepo} Bulan`
      default:          return 'Investasi'
    }
  }

  async function addToPortfolio(today: string) {
    switch (investType) {
      case 'saham': {
        await fetch('/api/portfolio/stocks', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol:   kodeSaham.toUpperCase(),
            lots:     parseFloat(jumlahLot),
            avgPrice: parseFloat(hargaLot),
            buyDate:  today,
            notes:    `Dibeli via Investasi FAB`,
          }),
        })
        break
      }
      case 'emas': {
        await fetch('/api/portfolio/gold', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grams:    parseFloat(beratEmas),
            source:   'antam',
            goldType: 'fisik',
            buyPrice: parseFloat(hargaGram),
            buyDate:  today,
            notes:    `Dibeli via Investasi FAB`,
          }),
        })
        break
      }
      case 'reksadana': {
        const nominal = parseFloat(nominalReksa.replace(/\D/g, '') || '0')
        await fetch('/api/portfolio/reksadana', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productName: namaReksa,
            manager:     '',
            type:        'pasar_uang',
            unit:        1,
            buyNAV:      nominal,
            currentNAV:  nominal,
            buyDate:     today,
            notes:       `Dibeli via Investasi FAB`,
          }),
        })
        break
      }
      case 'sbn': {
        const nominal = parseFloat(nominalSBN.replace(/\D/g, '') || '0')
        await fetch('/api/portfolio/sbn', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            seri:        namaSBN.toUpperCase(),
            type:        'ORI',
            nominal,
            annualRate:  6.0,
            taxRate:     10,
            tenorMonths: 36,
            startDate:   today,
            notes:       `Dibeli via Investasi FAB`,
          }),
        })
        break
      }
      case 'deposito': {
        const nominal = parseFloat(nominalDepo.replace(/\D/g, '') || '0')
        await fetch('/api/portfolio/deposits', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bankName:     bankDepo,
            nominal,
            interestRate: parseFloat(bungaDepo),
            tenorMonths:  parseInt(durasiDepo),
            startDate:    today,
            notes:        `Dibeli via Investasi FAB`,
          }),
        })
        break
      }
    }
  }

  // ── Step navigation ────────────────────────────────────────────────────────
  const canGoStep2 = !!investType
  const canGoStep3 = formValid

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="invest-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50"
        style={{ background: 'rgba(0,0,0,0.70)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        key="invest-sheet"
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 38 }}
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
        style={{
          background:  'var(--surface-close, #0f1a12)',
          border:      '1px solid rgba(34,197,94,0.12)',
          maxHeight:   '92dvh',
          display:     'flex',
          flexDirection:'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-1 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.25)' }}
            >
              <TrendingUp size={16} color="var(--accent)" />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Beli Investasi</h2>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Dari saldo dompet Anda</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <X size={16} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-3 pb-4 shrink-0">
          {[
            { n: 1, label: 'Jenis'   },
            { n: 2, label: 'Detail'  },
            { n: 3, label: 'Konfirmasi' },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center gap-2">
              {i > 0 && (
                <div className="w-8 h-px" style={{ background: step > i ? 'var(--accent)' : 'var(--border)' }} />
              )}
              <div className="flex items-center gap-1.5">
                <StepDot active={step === s.n} done={step > s.n} n={s.n} />
                <span className="text-[10px] font-medium" style={{ color: step === s.n ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {s.label}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 pb-6" style={{ overscrollBehavior: 'contain' }}>
          <AnimatePresence mode="wait">

            {/* ── STEP 1: Choose type ───────────────────────────────────── */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.18 }}
                className="space-y-3"
              >
                <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Pilih jenis investasi
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {INVEST_TYPES.map(t => {
                    const active = investType === t.id
                    return (
                      <motion.button
                        key={t.id}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setInvestType(t.id)}
                        className="relative flex flex-col items-start gap-2 p-4 rounded-2xl text-left transition-all"
                        style={{
                          background: active
                            ? `${t.color}18`
                            : 'rgba(255,255,255,0.04)',
                          border: active
                            ? `1.5px solid ${t.color}60`
                            : '1.5px solid rgba(255,255,255,0.08)',
                          boxShadow: active ? `0 0 16px ${t.color}20` : 'none',
                        }}
                      >
                        {active && (
                          <div
                            className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full flex items-center justify-center"
                            style={{ background: t.color }}
                          >
                            <CheckCircle2 size={11} color="#fff" />
                          </div>
                        )}
                        <span className="text-2xl">{t.icon}</span>
                        <div>
                          <p className="text-sm font-bold" style={{ color: active ? t.color : 'var(--text-primary)' }}>
                            {t.label}
                          </p>
                          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {t.description}
                          </p>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: Fill form ─────────────────────────────────────── */}
            {step === 2 && investType && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.18 }}
                className="space-y-4"
              >
                {/* Type badge */}
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                    style={{ background: `${typeInfo?.color}18`, color: typeInfo?.color, border: `1px solid ${typeInfo?.color}30` }}
                  >
                    {typeInfo?.icon} {typeInfo?.label}
                  </span>
                  <button
                    onClick={() => setStep(1)}
                    className="text-xs underline"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Ganti
                  </button>
                </div>

                {/* Dynamic fields */}
                {investType === 'saham' && (
                  <div className="space-y-3">
                    <Field
                      label="Kode Saham"
                      value={kodeSaham}
                      onChange={v => setKodeSaham(v.toUpperCase())}
                      placeholder="BBCA, TLKM, GOTO..."
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <CurrencyField label="Harga / Lot (Rp)" value={hargaLot} onChange={setHargaLot} />
                      <Field
                        label="Jumlah Lot"
                        value={jumlahLot}
                        onChange={setJumlahLot}
                        placeholder="1"
                        type="number"
                      />
                    </div>
                    {total > 0 && (
                      <div
                        className="rounded-xl p-3 flex items-center justify-between"
                        style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.20)' }}
                      >
                        <div>
                          <p className="text-[10px] font-semibold" style={{ color: 'rgba(34,197,94,0.7)' }}>
                            {jumlahLot} lot × {parseFloat(jumlahLot||'0') > 0 ? parseInt(jumlahLot||'0') * 100 : 0} lembar
                          </p>
                          <p className="text-sm font-bold font-mono" style={{ color: 'var(--accent)' }}>
                            = {formatCurrency(total)}
                          </p>
                        </div>
                        <span className="text-lg">📊</span>
                      </div>
                    )}
                  </div>
                )}

                {investType === 'emas' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Field
                        label="Berat (gram)"
                        value={beratEmas}
                        onChange={setBeratEmas}
                        placeholder="1.0"
                        type="number"
                      />
                      <CurrencyField label="Harga / gram (Rp)" value={hargaGram} onChange={setHargaGram} />
                    </div>
                    {total > 0 && (
                      <div
                        className="rounded-xl p-3 flex items-center justify-between"
                        style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.20)' }}
                      >
                        <div>
                          <p className="text-[10px] font-semibold" style={{ color: 'rgba(245,158,11,0.8)' }}>
                            {beratEmas}g × {formatCurrency(parseFloat(hargaGram||'0'))}/g
                          </p>
                          <p className="text-sm font-bold font-mono" style={{ color: '#F59E0B' }}>
                            = {formatCurrency(total)}
                          </p>
                        </div>
                        <span className="text-lg">🥇</span>
                      </div>
                    )}
                  </div>
                )}

                {investType === 'reksadana' && (
                  <div className="space-y-3">
                    <Field label="Nama Produk" value={namaReksa} onChange={setNamaReksa} placeholder="Schroder Dana Istimewa..." />
                    <CurrencyField label="Nominal (Rp)" value={nominalReksa} onChange={setNominalReksa} />
                  </div>
                )}

                {investType === 'sbn' && (
                  <div className="space-y-3">
                    <Field label="Nama Seri" value={namaSBN} onChange={v => setNamaSBN(v.toUpperCase())} placeholder="ORI026, SR020..." />
                    <CurrencyField label="Nominal (Rp)" value={nominalSBN} onChange={setNominalSBN} />
                  </div>
                )}

                {investType === 'deposito' && (
                  <div className="space-y-3">
                    <Field label="Nama Bank" value={bankDepo} onChange={setBankDepo} placeholder="BCA, Mandiri, BRI..." />
                    <CurrencyField label="Nominal (Rp)" value={nominalDepo} onChange={setNominalDepo} />
                    <div className="grid grid-cols-2 gap-3">
                      <Field
                        label="Bunga (%/tahun)"
                        value={bungaDepo}
                        onChange={setBungaDepo}
                        placeholder="4.5"
                        type="number"
                      />
                      <Field
                        label="Durasi (bulan)"
                        value={durasiDepo}
                        onChange={setDurasiDepo}
                        placeholder="12"
                        type="number"
                      />
                    </div>
                    {total > 0 && bungaDepo && durasiDepo && (
                      <div
                        className="rounded-xl p-3 space-y-1.5"
                        style={{ background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.20)' }}
                      >
                        <div className="flex justify-between text-xs">
                          <span style={{ color: 'var(--text-muted)' }}>Pokok</span>
                          <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {formatCurrency(total)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span style={{ color: 'var(--text-muted)' }}>Estimasi Bunga</span>
                          <span className="font-mono font-semibold" style={{ color: '#EC4899' }}>
                            +{formatCurrency(total * parseFloat(bungaDepo||'0') / 100 * parseInt(durasiDepo||'0') / 12 * 0.8)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── STEP 3: Confirm + wallet ──────────────────────────────── */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.18 }}
                className="space-y-4"
              >
                {/* Summary card */}
                <div
                  className="rounded-2xl p-4 space-y-3"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{typeInfo?.icon}</span>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Ringkasan Investasi</p>
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{getDescription()}</p>
                    </div>
                  </div>
                  <div
                    className="flex items-center justify-between pt-2"
                    style={{ borderTop: '1px solid var(--border)' }}
                  >
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Pembelian</span>
                    <span className="text-lg font-bold font-mono" style={{ color: typeInfo?.color }}>
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>

                {/* Wallet selector */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    <Wallet size={11} className="inline mr-1" />
                    Sumber Dana
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {WALLET_OPTS.map(w => {
                      const bal    = walletBalances[w.value]
                      const active = wallet === w.value
                      const canPay = bal >= total
                      return (
                        <motion.button
                          key={w.value}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setWallet(w.value)}
                          className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all"
                          style={{
                            background: active
                              ? canPay
                                ? 'rgba(34,197,94,0.12)'
                                : 'rgba(239,68,68,0.10)'
                              : 'rgba(255,255,255,0.04)',
                            border: active
                              ? canPay
                                ? '1.5px solid rgba(34,197,94,0.40)'
                                : '1.5px solid rgba(239,68,68,0.40)'
                              : '1.5px solid rgba(255,255,255,0.08)',
                          }}
                        >
                          <span className="text-lg">{w.icon}</span>
                          <p className="text-[10px] font-semibold" style={{ color: active ? (canPay ? 'var(--accent)' : 'var(--red)') : 'var(--text-secondary)' }}>
                            {w.label}
                          </p>
                          <p className="text-[9px] font-mono leading-none" style={{ color: canPay ? 'var(--text-muted)' : 'var(--red)' }}>
                            {formatCurrency(bal)}
                          </p>
                        </motion.button>
                      )
                    })}
                  </div>
                </div>

                {/* Balance warning */}
                {insufficient && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2.5 rounded-xl px-4 py-3"
                    style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)' }}
                  >
                    <AlertCircle size={16} color="var(--red)" className="mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: 'var(--red)' }}>Saldo tidak cukup</p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'rgba(239,68,68,0.70)' }}>
                        Kurang {formatCurrency(total - currentBalance)}. Top up dompet terlebih dahulu.
                      </p>
                    </div>
                  </motion.div>
                )}

                {!insufficient && total > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between rounded-xl px-4 py-3"
                    style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)' }}
                  >
                    <div>
                      <p className="text-[10px]" style={{ color: 'rgba(34,197,94,0.70)' }}>Sisa saldo setelah transaksi</p>
                      <p className="text-sm font-bold font-mono" style={{ color: 'var(--accent)' }}>
                        {formatCurrency(currentBalance - total)}
                      </p>
                    </div>
                    <CheckCircle2 size={20} color="var(--accent)" />
                  </motion.div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Bottom action row */}
        <div
          className="px-5 py-4 shrink-0 space-y-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          {step < 3 ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={step === 1 ? !canGoStep2 : !canGoStep3}
              onClick={() => setStep(prev => (prev + 1) as 1 | 2 | 3)}
              className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm transition-all"
              style={{
                background: (step === 1 ? canGoStep2 : canGoStep3)
                  ? 'linear-gradient(135deg,#22C55E,#16A34A)'
                  : 'rgba(255,255,255,0.06)',
                color: (step === 1 ? canGoStep2 : canGoStep3) ? '#fff' : 'var(--text-muted)',
                boxShadow: (step === 1 ? canGoStep2 : canGoStep3)
                  ? '0 6px 20px rgba(34,197,94,0.30)'
                  : 'none',
              }}
            >
              Lanjut <ArrowRight size={16} />
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={saving || insufficient || !formValid}
              onClick={handleSubmit}
              className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm transition-all"
              style={{
                background: saving || insufficient
                  ? 'rgba(255,255,255,0.06)'
                  : 'linear-gradient(135deg,#22C55E,#16A34A)',
                color: saving || insufficient ? 'var(--text-muted)' : '#fff',
                boxShadow: !saving && !insufficient ? '0 6px 20px rgba(34,197,94,0.30)' : 'none',
              }}
            >
              {saving
                ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</>
                : <><CheckCircle2 size={16} /> Konfirmasi Pembelian</>
              }
            </motion.button>
          )}

          {step > 1 && (
            <button
              onClick={() => setStep(prev => (prev - 1) as 1 | 2 | 3)}
              className="w-full py-2.5 text-sm font-medium"
              style={{ color: 'var(--text-muted)' }}
            >
              ← Kembali
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
