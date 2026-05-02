'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence }  from 'framer-motion'
import { PlusCircle, TrendingUp, X, ArrowRight, Check } from 'lucide-react'
import { FloatingActionButton }     from '@/components/transactions/FloatingActionButton'
import { TransactionModal }         from '@/components/transactions/TransactionModal'
import { useApiList }               from '@/hooks/useApiData'
import { formatCurrency }           from '@/lib/utils'
import toast                        from 'react-hot-toast'
import type { WalletAccount }       from '@/types'

interface Props {
  walletBalances: { cash: number; bank: number; ewallet: number }
}

type InvestType = 'saham' | 'emas' | 'reksadana' | 'sbn' | 'deposito'

const INVEST_TYPES: { type: InvestType; icon: string; label: string; sub: string }[] = [
  { type: 'saham',     icon: '📈', label: 'Saham',     sub: 'Bursa Efek Indonesia'  },
  { type: 'emas',      icon: '🥇', label: 'Emas',      sub: 'Emas fisik & digital'  },
  { type: 'reksadana', icon: '💼', label: 'Reksadana', sub: 'Reksa dana manajer'    },
  { type: 'sbn',       icon: '🏛️', label: 'SBN',       sub: 'Surat Berharga Negara' },
  { type: 'deposito',  icon: '🏦', label: 'Deposito',  sub: 'Deposito berjangka'    },
]

const WALLET_LABEL = { cash: 'Cash', bank: 'Bank', ewallet: 'E-Wallet' } as const

function StepDot({ n, current }: { n: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
        style={{ background: current >= n ? 'var(--accent)' : 'var(--surface-3)', color: current >= n ? '#000' : 'var(--text-muted)' }}>
        {current > n ? <Check size={12} strokeWidth={3} /> : n}
      </div>
      <span className="text-xs font-semibold"
        style={{ color: current >= n ? 'var(--text-primary)' : 'var(--text-muted)' }}>
        {n === 1 ? 'Jenis' : n === 2 ? 'Detail' : 'Konfirmasi'}
      </span>
    </div>
  )
}

interface InvestModalProps {
  walletBalances: Props['walletBalances']
  onClose: () => void
}

function BuyInvestmentModal({ walletBalances, onClose }: InvestModalProps) {
  const [step,       setStep      ] = useState<1 | 2 | 3>(1)
  const [investType, setInvestType] = useState<InvestType | null>(null)
  const [amount,     setAmount    ] = useState('')
  const [wallet,     setWallet    ] = useState<'cash' | 'bank' | 'ewallet'>('bank')
  const [name,       setName      ] = useState('')
  const [qty,        setQty       ] = useState('')
  const [saving,     setSaving    ] = useState(false)

  const investLabel = INVEST_TYPES.find(t => t.type === investType)?.label ?? ''

  const endpointMap: Record<InvestType, string> = {
    saham:     '/api/portfolio/stocks',
    emas:      '/api/portfolio/gold',
    reksadana: '/api/portfolio/reksadana',
    sbn:       '/api/portfolio/sbn',
    deposito:  '/api/portfolio/deposits',
  }

  const handleAmount = (raw: string) => {
    const num = raw.replace(/\D/g, '')
    setAmount(num ? parseInt(num).toLocaleString('id-ID') : '')
  }

  const handleConfirm = async () => {
    if (!investType) return
    setSaving(true)
    try {
      const parsedAmount = parseInt(amount.replace(/\D/g, ''), 10)
      if (!parsedAmount || parsedAmount <= 0) throw new Error('Nominal tidak valid')

      const payloads: Record<InvestType, Record<string, unknown>> = {
        saham:     { symbol: name.toUpperCase(), lots: parseInt(qty) || 1, buyPrice: parsedAmount / ((parseInt(qty) || 1) * 100), wallet },
        emas:      { source: name || 'Antam', grams: parseFloat(qty) || 1, buyPrice: parsedAmount / (parseFloat(qty) || 1), wallet },
        reksadana: { name, unit: parseFloat(qty) || 1, buyNAV: parsedAmount / (parseFloat(qty) || 1), currentNAV: parsedAmount / (parseFloat(qty) || 1), wallet },
        sbn:       { seriesCode: name, nominal: parsedAmount, couponRate: 6.25, maturityDate: new Date(Date.now() + 3 * 365 * 86400000).toISOString().split('T')[0], wallet },
        deposito:  { bankName: name, nominal: parsedAmount, interestRate: 5.5, tenor: parseInt(qty) || 12, startDate: new Date().toISOString().split('T')[0], wallet },
      }

      const res  = await fetch(endpointMap[investType], {
        method:  'POST', headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payloads[investType]),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Gagal menyimpan')

      toast.success(`Investasi ${investLabel} berhasil dicatat! ✓`)
      window.dispatchEvent(new CustomEvent('fintrack:wallet-updated'))
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan investasi')
    } finally {
      setSaving(false)
    }
  }

  const canNext = step === 1 ? !!investType : !!amount && !!name

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="w-full max-w-lg rounded-t-3xl flex flex-col overflow-hidden"
        style={{ background: 'var(--surface-1)', maxHeight: '92vh' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-2 pb-4">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(34,197,94,0.15)', color: 'var(--accent)' }}>
            <TrendingUp size={18} strokeWidth={2} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Beli Investasi</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Dari saldo dompet Anda</p>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:opacity-70"
            style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Step bar */}
        <div className="flex items-center px-5 pb-5">
          <StepDot n={1} current={step} />
          <div className="flex-1 h-px mx-2" style={{ background: step >= 2 ? 'var(--accent)' : 'var(--border)' }} />
          <StepDot n={2} current={step} />
          <div className="flex-1 h-px mx-2" style={{ background: step >= 3 ? 'var(--accent)' : 'var(--border)' }} />
          <StepDot n={3} current={step} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 pb-2">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.16 }}>
                <p className="text-base font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Pilih jenis investasi</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {INVEST_TYPES.map(it => (
                    <motion.button key={it.type} whileTap={{ scale: 0.96 }}
                      onClick={() => setInvestType(it.type)}
                      className="flex flex-col items-start p-4 rounded-2xl text-left"
                      style={{
                        background: investType === it.type ? 'rgba(34,197,94,0.12)' : 'var(--surface-2)',
                        border:     `1px solid ${investType === it.type ? 'rgba(34,197,94,0.35)' : 'var(--border)'}`,
                        boxShadow:  investType === it.type ? '0 4px 16px rgba(34,197,94,0.15)' : 'none',
                        transition: 'all 0.15s',
                      }}>
                      <span className="text-2xl mb-2">{it.icon}</span>
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{it.label}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{it.sub}</p>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.16 }}
                className="flex flex-col gap-4">
                <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Detail {investLabel}</p>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                    {investType === 'saham' ? 'Kode Saham (Ticker)' : investType === 'emas' ? 'Sumber Emas' : investType === 'reksadana' ? 'Nama Reksa Dana' : investType === 'sbn' ? 'Kode Seri SBN' : 'Nama Bank'}
                  </label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder={investType === 'saham' ? 'e.g. BBCA, TLKM' : investType === 'emas' ? 'e.g. Antam' : investType === 'reksadana' ? 'e.g. Schroder Dana Prestasi' : investType === 'sbn' ? 'e.g. ORI026' : 'e.g. BCA'}
                    className="w-full px-4 py-3 rounded-xl text-sm font-semibold"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }} />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                    {investType === 'saham' ? 'Jumlah Lot' : investType === 'emas' ? 'Jumlah Gram' : investType === 'reksadana' ? 'Jumlah Unit' : investType === 'deposito' ? 'Tenor (bulan)' : 'Nominal (Rp)'}
                  </label>
                  <input type="number" inputMode="numeric" value={qty} onChange={e => setQty(e.target.value)}
                    placeholder={investType === 'deposito' ? '12' : '1'}
                    className="w-full px-4 py-3 rounded-xl text-sm font-semibold"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }} />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Total Dana (Rp)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: 'var(--accent)' }}>Rp</span>
                    <input type="text" inputMode="numeric" value={amount} onChange={e => handleAmount(e.target.value)}
                      placeholder="0"
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-bold"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--accent)', outline: 'none' }} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Sumber Dana</label>
                  <div className="flex gap-2">
                    {(['cash', 'bank', 'ewallet'] as const).map(w => (
                      <motion.button key={w} whileTap={{ scale: 0.95 }} onClick={() => setWallet(w)}
                        className="flex-1 py-2.5 rounded-xl text-xs font-semibold"
                        style={{
                          background: wallet === w ? 'rgba(34,197,94,0.15)' : 'var(--surface-2)',
                          border:     `1px solid ${wallet === w ? 'rgba(34,197,94,0.30)' : 'var(--border)'}`,
                          color:      wallet === w ? 'var(--accent)' : 'var(--text-secondary)',
                        }}>
                        {WALLET_LABEL[w]}<br />
                        <span className="text-[9px] opacity-70 font-mono">{formatCurrency(walletBalances[w])}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.16 }}
                className="flex flex-col gap-3">
                <p className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Konfirmasi Pembelian</p>
                <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  {([['Jenis Investasi', investLabel], ['Produk', name || '-'], ['Jumlah', qty || '-'], ['Total Dana', `Rp ${amount || '0'}`], ['Sumber Dana', WALLET_LABEL[wallet]]] as [string, string][]).map(([lbl, val], i, arr) => (
                    <div key={lbl} className="flex justify-between items-center px-4 py-3"
                      style={i < arr.length - 1 ? { borderBottom: '1px solid var(--border)' } : undefined}>
                      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{lbl}</span>
                      <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{val}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>
                  Dana akan dikurangi dari saldo {WALLET_LABEL[wallet]} kamu
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-5 pb-8 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          {step < 3 ? (
            <motion.button whileTap={{ scale: 0.97 }} disabled={!canNext}
              onClick={() => setStep(s => (s + 1) as 2 | 3)}
              className="w-full py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2"
              style={{
                background: canNext ? 'var(--surface-2)' : 'var(--surface-3)',
                color:      canNext ? 'var(--text-primary)' : 'var(--text-muted)',
                border:     '1px solid var(--border)',
                opacity:    canNext ? 1 : 0.6,
              }}>
              Lanjut <ArrowRight size={18} strokeWidth={2.5} />
            </motion.button>
          ) : (
            <motion.button whileTap={{ scale: 0.97 }} disabled={saving} onClick={handleConfirm}
              className="w-full py-4 rounded-2xl text-base font-bold"
              style={{ background: 'var(--accent)', color: '#000', boxShadow: '0 8px 24px rgba(34,197,94,0.30)', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Menyimpan...' : '✓ Konfirmasi Investasi'}
            </motion.button>
          )}
          {step > 1 && (
            <button onClick={() => setStep(s => (s - 1) as 1 | 2)}
              className="w-full text-center text-sm mt-3 py-1 hover:opacity-70"
              style={{ color: 'var(--text-muted)' }}>
              ← Kembali
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function QuickAddFAB({ walletBalances }: Props) {
  const [txOpen,     setTxOpen    ] = useState(false)
  const [investOpen, setInvestOpen] = useState(false)

  const dashboardActions = [
    { label: 'Tambah Transaksi', icon: <PlusCircle size={18} strokeWidth={2.2} />, color: '#000', bg: 'var(--accent)',           onClick: () => setTxOpen(true)     },
    { label: 'Investasi',        icon: <TrendingUp  size={18} strokeWidth={2.2} />, color: '#fff', bg: 'var(--blue, #3b82f6)', onClick: () => setInvestOpen(true) },
  ]

  return (
    <>
      <FloatingActionButton variant="dashboard" actions={dashboardActions} />

      <AnimatePresence>
        {txOpen && <TransactionModal defaultType="expense" onClose={() => setTxOpen(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {investOpen && <BuyInvestmentModal walletBalances={walletBalances} onClose={() => setInvestOpen(false)} />}
      </AnimatePresence>
    </>
  )
}
