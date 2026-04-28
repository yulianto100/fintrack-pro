'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, TrendingUp, AlertCircle, CheckCircle2,
  Wallet, ArrowRight, Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils'
import type { WalletType } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────
type InvestType = 'saham' | 'emas' | 'reksadana' | 'sbn' | 'deposito'
type GoldType = 'fisik' | 'digital'
type GoldSource = 'antam' | 'ubs' | 'galeri24' | 'pegadaian' | 'treasury'
type ReksadanaType = 'pasar_uang' | 'pendapatan_tetap' | 'campuran' | 'saham' | 'indeks'
type SBNType = 'ORI' | 'SR' | 'SBR' | 'ST' | 'SBSN'

interface WalletAccount {
  id: string; name: string; type: 'bank' | 'ewallet'; balance: number
}
interface WalletBalances { cash: number; bank: number; ewallet: number }
interface Props { walletBalances: WalletBalances; onClose: () => void; onSuccess?: () => void }

// ─── Constants ────────────────────────────────────────────────────────────────
const INVEST_TYPES = [
  { id: 'saham'     as InvestType, label: 'Saham',     icon: '📈', color: '#22C55E', description: 'Bursa Efek Indonesia' },
  { id: 'emas'      as InvestType, label: 'Emas',      icon: '🥇', color: '#F59E0B', description: 'Emas fisik & digital'  },
  { id: 'reksadana' as InvestType, label: 'Reksadana', icon: '💼', color: '#3B82F6', description: 'Reksa dana manajer'    },
  { id: 'sbn'       as InvestType, label: 'SBN',       icon: '🏛️', color: '#8B5CF6', description: 'Surat Berharga Negara' },
  { id: 'deposito'  as InvestType, label: 'Deposito',  icon: '🏦', color: '#EC4899', description: 'Deposito berjangka'    },
]

const WALLET_OPTS = [
  { value: 'cash'    as WalletType, icon: '💵', label: 'Tunai'    },
  { value: 'bank'    as WalletType, icon: '🏦', label: 'Bank'     },
  { value: 'ewallet' as WalletType, icon: '📱', label: 'E-Wallet' },
]

const GOLD_PROVIDERS: Record<string, { label: string; icon: string; color: string; type: GoldType }> = {
  antam:     { label: 'Antam',     icon: '🏅', color: '#f6cc60', type: 'fisik'   },
  ubs:       { label: 'UBS',       icon: '🥈', color: '#94a3b8', type: 'fisik'   },
  galeri24:  { label: 'Galeri24',  icon: '🔶', color: '#fb923c', type: 'fisik'   },
  pegadaian: { label: 'Pegadaian', icon: '🟡', color: '#f97316', type: 'digital' },
  treasury:  { label: 'Treasury',  icon: '💛', color: '#eab308', type: 'digital' },
}

const GOLD_TYPES = [
  { value: 'fisik'   as GoldType, label: 'Fisik',   icon: '🪙' },
  { value: 'digital' as GoldType, label: 'Digital', icon: '📲' },
]

const RD_TYPES = [
  { value: 'pasar_uang'       as ReksadanaType, label: 'Pasar Uang',      icon: '💵', color: '#22c55e' },
  { value: 'pendapatan_tetap' as ReksadanaType, label: 'Pendapatan Tetap', icon: '📊', color: '#3b82f6' },
  { value: 'campuran'         as ReksadanaType, label: 'Campuran',         icon: '🔀', color: '#f59e0b' },
  { value: 'saham'            as ReksadanaType, label: 'Saham',            icon: '📈', color: '#63b3ed' },
  { value: 'indeks'           as ReksadanaType, label: 'Indeks',           icon: '🏛️', color: '#a855f7' },
]

const SBN_TYPES = [
  { value: 'ORI'  as SBNType, label: 'ORI',  desc: 'Obligasi Ritel Indonesia', taxRate: 10 },
  { value: 'SR'   as SBNType, label: 'SR',   desc: 'Sukuk Ritel',              taxRate: 10 },
  { value: 'SBR'  as SBNType, label: 'SBR',  desc: 'Sav. Bond Ritel',          taxRate: 10 },
  { value: 'ST'   as SBNType, label: 'ST',   desc: 'Sukuk Tabungan',            taxRate: 10 },
  { value: 'SBSN' as SBNType, label: 'SBSN', desc: 'Surat Berharga Syariah',   taxRate: 15 },
]

const todayStr = () => new Date().toISOString().split('T')[0]

// ─── UI helpers ───────────────────────────────────────────────────────────────
function StepDot({ active, done, n }: { active: boolean; done: boolean; n: number }) {
  return (
    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all"
      style={{
        background: done ? 'var(--accent)' : active ? 'rgba(34,197,94,0.20)' : 'rgba(255,255,255,0.06)',
        color: done || active ? (done ? '#fff' : 'var(--accent)') : 'var(--text-muted)',
        border: active ? '1px solid var(--accent)' : done ? 'none' : '1px solid var(--border)',
      }}>
      {done ? <CheckCircle2 size={13} /> : n}
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', optional }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; optional?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
        {label}
        {optional && <span className="text-[9px] font-normal px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.10)', color: 'var(--accent)' }}>opsional</span>}
      </label>
      <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}>
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="bg-transparent flex-1 outline-none text-sm" style={{ color: 'var(--text-primary)' }}
          inputMode={type === 'number' ? 'decimal' : 'text'} />
      </div>
    </div>
  )
}

function CurrencyField({ label, value, onChange, optional }: {
  label: string; value: string; onChange: (v: string) => void; optional?: boolean
}) {
  const display = value ? parseInt(value.replace(/\D/g, '') || '0', 10).toLocaleString('id-ID') : ''
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
        {label}
        {optional && <span className="text-[9px] font-normal px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.10)', color: 'var(--accent)' }}>opsional</span>}
      </label>
      <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}>
        <span className="text-sm font-bold shrink-0" style={{ color: 'var(--accent)' }}>Rp</span>
        <input type="text" inputMode="numeric" value={display} onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
          placeholder="0" className="bg-transparent flex-1 outline-none text-sm font-mono" style={{ color: 'var(--text-primary)' }} />
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function InvestasiModal({ walletBalances, onClose, onSuccess }: Props) {
  const [step,           setStep          ] = useState<1 | 2 | 3>(1)
  const [investType,     setInvestType    ] = useState<InvestType | null>(null)
  const [wallet,         setWallet        ] = useState<WalletType>('bank')
  const [walletAccountId, setWalletAccountId] = useState('')
  const [walletAccounts,  setWalletAccounts ] = useState<WalletAccount[]>([])
  const [saving,         setSaving        ] = useState(false)

  useEffect(() => {
    fetch('/api/wallet-accounts').then(r => r.json())
      .then(j => { if (j.success) setWalletAccounts(j.data || []) }).catch(() => {})
  }, [])

  const handleWalletChange = (w: WalletType) => { setWallet(w); setWalletAccountId('') }

  // Saham
  const [kodeSaham,    setKodeSaham   ] = useState('')
  const [hargaLot,     setHargaLot    ] = useState('')
  const [jumlahLot,    setJumlahLot   ] = useState('')
  const [sekuritas,    setSekuritas   ] = useState('')
  const [sahamBuyDate, setSahamBuyDate] = useState(todayStr())
  // Emas
  const [emasGoldType, setEmasGoldType] = useState<GoldType>('fisik')
  const [emasSource,   setEmasSource  ] = useState<GoldSource>('antam')
  const [beratEmas,    setBeratEmas   ] = useState('')
  const [hargaGram,    setHargaGram   ] = useState('')
  const [emasBuyDate,  setEmasBuyDate ] = useState(todayStr())
  const [emasNotes,    setEmasNotes   ] = useState('')
  // Reksadana
  const [namaReksa,    setNamaReksa   ] = useState('')
  const [reksaManager, setReksaManager] = useState('')
  const [reksaType,    setReksaType   ] = useState<ReksadanaType>('pasar_uang')
  const [reksaUnit,    setReksaUnit   ] = useState('')
  const [reksaBuyNAV,  setReksaBuyNAV ] = useState('')
  const [reksaBuyDate, setReksaBuyDate] = useState(todayStr())
  // SBN
  const [sbnSeri,     setSbnSeri    ] = useState('')
  const [sbnType,     setSbnType    ] = useState<SBNType>('ORI')
  const [nominalSBN,  setNominalSBN ] = useState('')
  const [sbnRate,     setSbnRate    ] = useState('')
  const [sbnTenor,    setSbnTenor   ] = useState('')
  const [sbnDate,     setSbnDate    ] = useState(todayStr())
  // Deposito
  const [bankDepo,    setBankDepo   ] = useState('')
  const [nominalDepo, setNominalDepo] = useState('')
  const [bungaDepo,   setBungaDepo  ] = useState('')
  const [durasiDepo,  setDurasiDepo ] = useState('')
  const [depoDate,    setDepoDate   ] = useState(todayStr())

  // Reset provider when goldType changes
  useEffect(() => {
    const providers = Object.entries(GOLD_PROVIDERS).filter(([,v]) => v.type === emasGoldType)
    if (providers.length > 0) setEmasSource(providers[0][0] as GoldSource)
  }, [emasGoldType])

  const total = useMemo(() => {
    switch (investType) {
      case 'saham':     return parseFloat(hargaLot || '0') * parseFloat(jumlahLot || '0') * 100
      case 'emas':      return parseFloat(beratEmas || '0') * parseFloat(hargaGram || '0')
      case 'reksadana': return parseFloat(reksaUnit || '0') * parseFloat(reksaBuyNAV || '0')
      case 'sbn':       return parseFloat(nominalSBN.replace(/\D/g, '') || '0')
      case 'deposito':  return parseFloat(nominalDepo.replace(/\D/g, '') || '0')
      default:          return 0
    }
  }, [investType, hargaLot, jumlahLot, beratEmas, hargaGram, reksaUnit, reksaBuyNAV, nominalSBN, nominalDepo])

  const formValid = useMemo(() => {
    if (!investType) return false
    switch (investType) {
      case 'saham':     return !!kodeSaham.trim() && !!sekuritas.trim() && parseFloat(hargaLot || '0') > 0 && parseFloat(jumlahLot || '0') > 0
      case 'emas':      return parseFloat(beratEmas || '0') > 0 && parseFloat(hargaGram || '0') > 0
      case 'reksadana': return !!namaReksa.trim() && parseFloat(reksaUnit || '0') > 0 && parseFloat(reksaBuyNAV || '0') > 0
      case 'sbn':       return !!sbnSeri.trim() && total > 0 && !!sbnRate && !!sbnTenor
      case 'deposito':  return !!bankDepo.trim() && total > 0 && !!bungaDepo && !!durasiDepo
      default:          return false
    }
  }, [investType, total, kodeSaham, sekuritas, hargaLot, jumlahLot, beratEmas, hargaGram, namaReksa, reksaUnit, reksaBuyNAV, sbnSeri, sbnRate, sbnTenor, bankDepo, bungaDepo, durasiDepo])

  const selectedAccount      = walletAccounts.find(a => a.id === walletAccountId)
  const currentBalance       = selectedAccount ? selectedAccount.balance : walletBalances[wallet]
  const subAccountsForWallet = walletAccounts.filter(a => a.type === wallet)
  const needsSubAccount      = (wallet === 'bank' || wallet === 'ewallet') && subAccountsForWallet.length > 0
  const insufficient         = total > 0 && total > currentBalance
  const typeInfo             = INVEST_TYPES.find(t => t.id === investType)
  const submitReady          = formValid && total > 0 && (!needsSubAccount || !!walletAccountId)

  const availableGoldProviders = Object.entries(GOLD_PROVIDERS).filter(([,v]) => v.type === emasGoldType)

  function getDescription(): string {
    switch (investType) {
      case 'saham':     return `Beli Saham ${kodeSaham.toUpperCase()} ${jumlahLot} Lot`
      case 'emas':      return `Beli Emas ${beratEmas}g (${GOLD_PROVIDERS[emasSource]?.label || emasSource})`
      case 'reksadana': return `Beli Reksadana ${namaReksa}`
      case 'sbn':       return `Beli SBN ${sbnSeri.toUpperCase()}`
      case 'deposito':  return `Deposito ${bankDepo} ${durasiDepo} Bulan`
      default:          return 'Investasi'
    }
  }

  async function addToPortfolio(date: string) {
    switch (investType) {
      case 'saham':
        await fetch('/api/portfolio/stocks', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: kodeSaham.toUpperCase(), lots: parseFloat(jumlahLot), avgPrice: parseFloat(hargaLot), buyDate: sahamBuyDate || date, notes: sekuritas }),
        }); break
      case 'emas':
        await fetch('/api/portfolio/gold', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ grams: parseFloat(beratEmas), source: emasSource, goldType: emasGoldType, buyPrice: parseFloat(hargaGram), buyDate: emasBuyDate || date, notes: emasNotes || 'Dibeli via FAB' }),
        }); break
      case 'reksadana': {
        const nav = parseFloat(reksaBuyNAV || '0')
        await fetch('/api/portfolio/reksadana', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productName: namaReksa, manager: reksaManager || '', type: reksaType, unit: parseFloat(reksaUnit), buyNAV: nav, currentNAV: nav, buyDate: reksaBuyDate || date, notes: 'Dibeli via FAB' }),
        }); break
      }
      case 'sbn': {
        const taxRate = SBN_TYPES.find(t => t.value === sbnType)?.taxRate ?? 10
        await fetch('/api/portfolio/sbn', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seri: sbnSeri.toUpperCase(), type: sbnType, nominal: total, annualRate: parseFloat(sbnRate || '0'), taxRate, tenorMonths: parseInt(sbnTenor || '0'), startDate: sbnDate || date, notes: 'Dibeli via FAB' }),
        }); break
      }
      case 'deposito':
        await fetch('/api/portfolio/deposits', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bankName: bankDepo, nominal: total, interestRate: parseFloat(bungaDepo), tenorMonths: parseInt(durasiDepo), startDate: depoDate || date, notes: 'Dibeli via FAB' }),
        }); break
    }
  }

  const handleSubmit = async () => {
    if (!investType || !submitReady || insufficient) return
    setSaving(true)
    try {
      const date = todayStr()
      const txRes = await fetch('/api/transactions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'expense', amount: total, wallet,
          ...(walletAccountId ? { walletAccountId } : {}),
          description: getDescription(), date,
          categoryId: 'investasi', categoryName: 'Investasi',
          categoryIcon: typeInfo?.icon || '📈', tags: ['investasi'],
        }),
      })
      const txJson = await txRes.json()
      if (!txJson.success) throw new Error(txJson.error || 'Gagal membuat transaksi')
      await addToPortfolio(date)
      toast.success('Investasi berhasil ditambahkan 🎉', { duration: 3500 })
      onSuccess?.()
      onClose()
    } catch (err) {
      toast.error('Gagal menyimpan: ' + String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div key="invest-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.70)' }} onClick={onClose} />

      <motion.div key="invest-sheet" initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 38 }}
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
        style={{ background: 'var(--surface-close, #0f1a12)', border: '1px solid rgba(34,197,94,0.12)', maxHeight: '92dvh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}>

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-1 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.25)' }}>
              <TrendingUp size={16} color="var(--accent)" />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Beli Investasi</h2>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Dari saldo dompet Anda</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <X size={16} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-3 pb-4 shrink-0">
          {[{ n: 1, label: 'Jenis' }, { n: 2, label: 'Detail' }, { n: 3, label: 'Konfirmasi' }].map((s, i) => (
            <div key={s.n} className="flex items-center gap-2">
              {i > 0 && <div className="w-8 h-px" style={{ background: step > i ? 'var(--accent)' : 'var(--border)' }} />}
              <div className="flex items-center gap-1.5">
                <StepDot active={step === s.n} done={step > s.n} n={s.n} />
                <span className="text-[10px] font-medium" style={{ color: step === s.n ? 'var(--accent)' : 'var(--text-muted)' }}>{s.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 pb-6" style={{ overscrollBehavior: 'contain' }}>
          <AnimatePresence mode="wait">

            {/* STEP 1 */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }} className="space-y-3">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Pilih jenis investasi</p>
                <div className="grid grid-cols-2 gap-3">
                  {INVEST_TYPES.map(t => {
                    const active = investType === t.id
                    return (
                      <motion.button key={t.id} whileTap={{ scale: 0.96 }} onClick={() => setInvestType(t.id)}
                        className="relative flex flex-col items-start gap-2 p-4 rounded-2xl text-left transition-all"
                        style={{ background: active ? `${t.color}18` : 'rgba(255,255,255,0.04)', border: active ? `1.5px solid ${t.color}60` : '1.5px solid rgba(255,255,255,0.08)', boxShadow: active ? `0 0 16px ${t.color}20` : 'none' }}>
                        {active && <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: t.color }}><CheckCircle2 size={11} color="#fff" /></div>}
                        <span className="text-2xl">{t.icon}</span>
                        <div>
                          <p className="text-sm font-bold" style={{ color: active ? t.color : 'var(--text-primary)' }}>{t.label}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{t.description}</p>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* STEP 2 */}
            {step === 2 && investType && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.18 }} className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: `${typeInfo?.color}18`, color: typeInfo?.color, border: `1px solid ${typeInfo?.color}30` }}>{typeInfo?.icon} {typeInfo?.label}</span>
                  <button onClick={() => setStep(1)} className="text-xs underline" style={{ color: 'var(--text-muted)' }}>Ganti</button>
                </div>

                {/* SAHAM */}
                {investType === 'saham' && (
                  <div className="space-y-3">
                    <Field label="Kode Saham" value={kodeSaham} onChange={v => setKodeSaham(v.toUpperCase())} placeholder="BBCA, TLKM, GOTO..." />
                    <Field label="Sekuritas / Broker" value={sekuritas} onChange={setSekuritas} placeholder="BCA Sekuritas, Stockbit..." />
                    <div className="grid grid-cols-2 gap-3">
                      <CurrencyField label="Harga / Lot (Rp)" value={hargaLot} onChange={setHargaLot} />
                      <Field label="Jumlah Lot" value={jumlahLot} onChange={setJumlahLot} placeholder="1" type="number" />
                    </div>
                    <Field label="Tanggal Beli" value={sahamBuyDate} onChange={setSahamBuyDate} type="date" />
                    {total > 0 && (
                      <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.20)' }}>
                        <div>
                          <p className="text-[10px] font-semibold" style={{ color: 'rgba(34,197,94,0.7)' }}>{jumlahLot} lot × {parseFloat(jumlahLot || '0') * 100} lembar</p>
                          <p className="text-sm font-bold font-mono" style={{ color: 'var(--accent)' }}>= {formatCurrency(total)}</p>
                        </div>
                        <span className="text-lg">📊</span>
                      </div>
                    )}
                  </div>
                )}

                {/* EMAS */}
                {investType === 'emas' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs mb-2 block font-semibold" style={{ color: 'var(--text-muted)' }}>Jenis Emas</label>
                      <div className="grid grid-cols-2 gap-2">
                        {GOLD_TYPES.map(t => (
                          <button key={t.value} onClick={() => setEmasGoldType(t.value)}
                            className="py-3 rounded-xl flex items-center justify-center gap-2 font-medium text-sm transition-all"
                            style={{ background: emasGoldType === t.value ? 'rgba(246,204,96,0.14)' : 'rgba(255,255,255,0.04)', border: `1px solid ${emasGoldType === t.value ? '#f6cc6050' : 'var(--border)'}`, color: emasGoldType === t.value ? '#f6cc60' : 'var(--text-muted)' }}>
                            <span className="text-lg">{t.icon}</span> {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs mb-2 block font-semibold" style={{ color: 'var(--text-muted)' }}>Provider</label>
                      <div className={`grid gap-2 ${availableGoldProviders.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        {availableGoldProviders.map(([src, cfg]) => (
                          <button key={src} onClick={() => setEmasSource(src as GoldSource)}
                            className="py-3 rounded-xl text-center transition-all"
                            style={{ background: emasSource === src ? `${cfg.color}16` : 'rgba(255,255,255,0.04)', border: `1px solid ${emasSource === src ? cfg.color + '50' : 'var(--border)'}` }}>
                            <p className="text-xl mb-1">{cfg.icon}</p>
                            <p className="text-xs font-medium" style={{ color: emasSource === src ? cfg.color : 'var(--text-muted)' }}>{cfg.label}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Jumlah Gram" value={beratEmas} onChange={setBeratEmas} placeholder="Contoh: 5.5" type="number" />
                      <CurrencyField label="Harga Beli/gr" value={hargaGram} onChange={setHargaGram} optional />
                    </div>
                    <Field label="Tanggal Beli" value={emasBuyDate} onChange={setEmasBuyDate} type="date" />
                    {total > 0 && (
                      <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.20)' }}>
                        <div>
                          <p className="text-[10px] font-semibold" style={{ color: 'rgba(245,158,11,0.8)' }}>{beratEmas}g × {formatCurrency(parseFloat(hargaGram || '0'))}/g</p>
                          <p className="text-sm font-bold font-mono" style={{ color: '#F59E0B' }}>= {formatCurrency(total)}</p>
                        </div>
                        <span className="text-lg">🥇</span>
                      </div>
                    )}
                    <Field label="Catatan" value={emasNotes} onChange={setEmasNotes} placeholder="Misal: Kado ulang tahun" optional />
                  </div>
                )}

                {/* REKSADANA */}
                {investType === 'reksadana' && (
                  <div className="space-y-3">
                    <Field label="Nama Produk" value={namaReksa} onChange={setNamaReksa} placeholder="Schroder Dana Istimewa..." />
                    <Field label="Manajer Investasi" value={reksaManager} onChange={setReksaManager} placeholder="Schroder, Manulife..." optional />
                    <div>
                      <label className="text-xs mb-2 block font-semibold" style={{ color: 'var(--text-muted)' }}>Tipe Reksadana</label>
                      <div className="grid grid-cols-2 gap-2">
                        {RD_TYPES.map(t => (
                          <button key={t.value} onClick={() => setReksaType(t.value)}
                            className="py-2.5 px-3 rounded-xl flex items-center gap-2 text-left text-xs font-medium transition-all"
                            style={{ background: reksaType === t.value ? `${t.color}18` : 'rgba(255,255,255,0.04)', border: `1px solid ${reksaType === t.value ? t.color + '50' : 'var(--border)'}`, color: reksaType === t.value ? t.color : 'var(--text-muted)' }}>
                            <span>{t.icon}</span> {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Jumlah Unit" value={reksaUnit} onChange={setReksaUnit} placeholder="100" type="number" />
                      <CurrencyField label="NAV Beli (Rp)" value={reksaBuyNAV} onChange={setReksaBuyNAV} />
                    </div>
                    <Field label="Tanggal Beli" value={reksaBuyDate} onChange={setReksaBuyDate} type="date" />
                    {total > 0 && (
                      <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.20)' }}>
                        <div>
                          <p className="text-[10px] font-semibold" style={{ color: 'rgba(59,130,246,0.8)' }}>{reksaUnit} unit × {formatCurrency(parseFloat(reksaBuyNAV || '0'))}</p>
                          <p className="text-sm font-bold font-mono" style={{ color: '#3B82F6' }}>= {formatCurrency(total)}</p>
                        </div>
                        <span className="text-lg">💼</span>
                      </div>
                    )}
                  </div>
                )}

                {/* SBN */}
                {investType === 'sbn' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs mb-2 block font-semibold" style={{ color: 'var(--text-muted)' }}>Jenis SBN</label>
                      <div className="flex flex-wrap gap-2">
                        {SBN_TYPES.map(t => (
                          <button key={t.value} onClick={() => setSbnType(t.value)}
                            className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                            style={{ background: sbnType === t.value ? 'rgba(139,92,246,0.18)' : 'rgba(255,255,255,0.04)', border: `1px solid ${sbnType === t.value ? '#8B5CF650' : 'var(--border)'}`, color: sbnType === t.value ? '#8B5CF6' : 'var(--text-muted)' }}>
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Field label="Seri" value={sbnSeri} onChange={v => setSbnSeri(v.toUpperCase())} placeholder="ORI026, SR020..." />
                    <CurrencyField label="Nominal (Rp)" value={nominalSBN} onChange={setNominalSBN} />
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Kupon (%/tahun)" value={sbnRate} onChange={setSbnRate} placeholder="6.25" type="number" />
                      <Field label="Tenor (bulan)" value={sbnTenor} onChange={setSbnTenor} placeholder="36" type="number" />
                    </div>
                    <Field label="Tanggal Mulai" value={sbnDate} onChange={setSbnDate} type="date" />
                    {total > 0 && sbnRate && sbnTenor && (
                      <div className="rounded-xl p-3 space-y-1" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.20)' }}>
                        <div className="flex justify-between text-xs">
                          <span style={{ color: 'var(--text-muted)' }}>Pokok</span>
                          <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(total)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span style={{ color: 'var(--text-muted)' }}>Est. Kupon/bln (net)</span>
                          <span className="font-mono font-semibold" style={{ color: '#8B5CF6' }}>
                            +{formatCurrency(total * parseFloat(sbnRate || '0') / 100 / 12 * (1 - (SBN_TYPES.find(t => t.value === sbnType)?.taxRate ?? 10) / 100))}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* DEPOSITO */}
                {investType === 'deposito' && (
                  <div className="space-y-3">
                    <Field label="Nama Bank" value={bankDepo} onChange={setBankDepo} placeholder="BCA, Mandiri, BRI..." />
                    <CurrencyField label="Nominal (Rp)" value={nominalDepo} onChange={setNominalDepo} />
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Bunga (%/tahun)" value={bungaDepo} onChange={setBungaDepo} placeholder="4.5" type="number" />
                      <Field label="Durasi (bulan)" value={durasiDepo} onChange={setDurasiDepo} placeholder="12" type="number" />
                    </div>
                    <Field label="Tanggal Mulai" value={depoDate} onChange={setDepoDate} type="date" />
                    {total > 0 && bungaDepo && durasiDepo && (
                      <div className="rounded-xl p-3 space-y-1" style={{ background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.20)' }}>
                        <div className="flex justify-between text-xs">
                          <span style={{ color: 'var(--text-muted)' }}>Pokok</span>
                          <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(total)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span style={{ color: 'var(--text-muted)' }}>Est. Bunga (net 80%)</span>
                          <span className="font-mono font-semibold" style={{ color: '#EC4899' }}>
                            +{formatCurrency(total * parseFloat(bungaDepo || '0') / 100 * parseInt(durasiDepo || '0') / 12 * 0.8)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.18 }} className="space-y-4">
                {/* Summary */}
                <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{typeInfo?.icon}</span>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Ringkasan Investasi</p>
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{getDescription()}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Pembelian</span>
                    <span className="text-lg font-bold font-mono" style={{ color: typeInfo?.color }}>{formatCurrency(total)}</span>
                  </div>
                </div>

                {/* Wallet */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    <Wallet size={11} className="inline mr-1" />Sumber Dana
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {WALLET_OPTS.map(w => {
                      const bal = walletBalances[w.value]
                      const active = wallet === w.value
                      const canPay = bal >= total
                      return (
                        <motion.button key={w.value} whileTap={{ scale: 0.95 }} onClick={() => handleWalletChange(w.value)}
                          className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all"
                          style={{ background: active ? (canPay ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.10)') : 'rgba(255,255,255,0.04)', border: active ? (canPay ? '1.5px solid rgba(34,197,94,0.40)' : '1.5px solid rgba(239,68,68,0.40)') : '1.5px solid rgba(255,255,255,0.08)' }}>
                          <span className="text-lg">{w.icon}</span>
                          <p className="text-[10px] font-semibold" style={{ color: active ? (canPay ? 'var(--accent)' : 'var(--red)') : 'var(--text-secondary)' }}>{w.label}</p>
                          <p className="text-[9px] font-mono leading-none" style={{ color: canPay ? 'var(--text-muted)' : 'var(--red)' }}>{formatCurrency(bal)}</p>
                        </motion.button>
                      )
                    })}
                  </div>

                  {needsSubAccount && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="space-y-1.5 pt-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: walletAccountId ? 'var(--accent)' : 'rgba(245,158,11,0.85)' }}>
                        {walletAccountId ? '✓ Rekening dipilih' : '⚠ Pilih rekening spesifik'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {subAccountsForWallet.map(acc => {
                          const isActive  = walletAccountId === acc.id
                          const canPayAcc = acc.balance >= total
                          return (
                            <motion.button key={acc.id} whileTap={{ scale: 0.93 }}
                              onClick={() => setWalletAccountId(prev => prev === acc.id ? '' : acc.id)}
                              className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
                              style={{ background: isActive ? (canPayAcc ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)') : 'rgba(255,255,255,0.05)', border: isActive ? (canPayAcc ? '1px solid rgba(34,197,94,0.50)' : '1px solid rgba(239,68,68,0.45)') : '1px solid rgba(255,255,255,0.10)' }}>
                              {isActive && <CheckCircle2 size={12} color={canPayAcc ? 'var(--accent)' : 'var(--red)'} />}
                              <div className="text-left">
                                <p className="text-xs font-semibold leading-tight" style={{ color: isActive ? (canPayAcc ? 'var(--accent)' : 'var(--red)') : 'var(--text-primary)' }}>{acc.name}</p>
                                <p className="text-[9px] font-mono" style={{ color: canPayAcc ? 'var(--text-muted)' : 'var(--red)' }}>{formatCurrency(acc.balance)}</p>
                              </div>
                            </motion.button>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </div>

                {needsSubAccount && !walletAccountId && !insufficient && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2.5 rounded-xl px-4 py-3"
                    style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.28)' }}>
                    <AlertCircle size={16} color="#F59E0B" className="mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: '#F59E0B' }}>Pilih rekening terlebih dahulu</p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'rgba(245,158,11,0.70)' }}>Pilih rekening Bank/E-Wallet spesifik agar saldo terpotong dengan benar.</p>
                    </div>
                  </motion.div>
                )}

                {insufficient && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2.5 rounded-xl px-4 py-3"
                    style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)' }}>
                    <AlertCircle size={16} color="var(--red)" className="mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: 'var(--red)' }}>Saldo tidak cukup</p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'rgba(239,68,68,0.70)' }}>
                        {selectedAccount ? `Saldo ${selectedAccount.name}: ${formatCurrency(currentBalance)}. Kurang ${formatCurrency(total - currentBalance)}.` : `Kurang ${formatCurrency(total - currentBalance)}. Top up dompet terlebih dahulu.`}
                      </p>
                    </div>
                  </motion.div>
                )}

                {!insufficient && submitReady && total > 0 && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between rounded-xl px-4 py-3"
                    style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)' }}>
                    <div>
                      <p className="text-[10px]" style={{ color: 'rgba(34,197,94,0.70)' }}>Sisa saldo {selectedAccount ? selectedAccount.name : ''} setelah transaksi</p>
                      <p className="text-sm font-bold font-mono" style={{ color: 'var(--accent)' }}>{formatCurrency(currentBalance - total)}</p>
                    </div>
                    <CheckCircle2 size={20} color="var(--accent)" />
                  </motion.div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Bottom */}
        <div className="px-5 py-4 shrink-0 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {step < 3 ? (
            <motion.button whileTap={{ scale: 0.97 }}
              disabled={step === 1 ? !investType : !formValid}
              onClick={() => setStep(prev => (prev + 1) as 1 | 2 | 3)}
              className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm transition-all"
              style={{
                background: (step === 1 ? !!investType : formValid) ? 'linear-gradient(135deg,#22C55E,#16A34A)' : 'rgba(255,255,255,0.06)',
                color: (step === 1 ? !!investType : formValid) ? '#fff' : 'var(--text-muted)',
                boxShadow: (step === 1 ? !!investType : formValid) ? '0 6px 20px rgba(34,197,94,0.30)' : 'none',
              }}>
              Lanjut <ArrowRight size={16} />
            </motion.button>
          ) : (
            <motion.button whileTap={{ scale: 0.97 }}
              disabled={saving || insufficient || !submitReady}
              onClick={handleSubmit}
              className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm transition-all"
              style={{
                background: saving || insufficient || !submitReady ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg,#22C55E,#16A34A)',
                color: saving || insufficient || !submitReady ? 'var(--text-muted)' : '#fff',
                boxShadow: !saving && !insufficient && submitReady ? '0 6px 20px rgba(34,197,94,0.30)' : 'none',
              }}>
              {saving ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : <><CheckCircle2 size={16} /> Konfirmasi Pembelian</>}
            </motion.button>
          )}
          {step > 1 && (
            <button onClick={() => setStep(prev => (prev - 1) as 1 | 2 | 3)}
              className="w-full py-2.5 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              ← Kembali
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
