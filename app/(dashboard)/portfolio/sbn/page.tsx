'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApiList } from '@/hooks/useApiData'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import { calcSBN } from '@/lib/investment-calculator'
import { addMonths } from 'date-fns'
import type { SBNHolding, SBNType } from '@/types'
import { Plus, Trash2, X, TrendingUp, Clock, Pencil, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

// Tax is auto-set from type — SBSN = 15%, everything else = 10%
const SBN_TYPES: { value: SBNType; label: string; desc: string; taxRate: number }[] = [
  { value: 'ORI',  label: 'ORI',  desc: 'Obligasi Ritel Indonesia',  taxRate: 10 },
  { value: 'SR',   label: 'SR',   desc: 'Sukuk Ritel',               taxRate: 10 },
  { value: 'SBR',  label: 'SBR',  desc: 'Sav. Bond Ritel',           taxRate: 10 },
  { value: 'ST',   label: 'ST',   desc: 'Sukuk Tabungan',             taxRate: 10 },
  { value: 'SBSN', label: 'SBSN', desc: 'Surat Berharga Syariah',    taxRate: 15 },
]

const EMPTY_FORM = {
  seri: '', type: 'ORI' as SBNType,
  nominal: '', annualRate: '', tenorMonths: '',
  startDate: '', notes: '',
}

// ─── Small helpers ───────────────────────────────────────────────────────────
function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>
        {label} {required && <span style={{ color: 'var(--accent)' }}>*</span>}
      </label>
      {children}
      {error && (
        <div className="flex items-center gap-1 mt-1">
          <AlertCircle size={11} color="var(--red)" />
          <p className="text-[11px]" style={{ color: 'var(--red)' }}>{error}</p>
        </div>
      )}
    </div>
  )
}

function ModalShell({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
        onClick={onClose} />
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 350 }}
        className="relative w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl"
        style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid var(--border)', maxHeight: '92dvh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}>
        <div className="drag-indicator mt-3 sm:hidden" />
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          <button onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.06)', color: 'var(--text-secondary)' }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  )
}

function ProgressBar({ start, end, color = '#a855f7' }: { start: string; end: string; color?: string }) {
  const now    = Date.now()
  const s      = new Date(start).getTime()
  const e      = new Date(end).getTime()
  const pct    = Math.min(100, Math.max(0, ((now - s) / (e - s)) * 100))
  const days   = Math.max(0, Math.ceil((e - now) / 86400000))
  return (
    <div>
      <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ background: 'rgba(168,85,247,0.12)' }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="flex justify-between text-[10px]" style={{ color: 'var(--text-muted)' }}>
        <span>{formatDate(start, 'dd MMM yy')}</span>
        <div className="flex items-center gap-1">
          <Clock size={9} />
          <span>{pct >= 100 ? 'JATUH TEMPO' : `${days} hari · ${pct.toFixed(0)}%`}</span>
        </div>
        <span>{formatDate(end, 'dd MMM yy')}</span>
      </div>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function SBNPage() {
  const { data: holdings, loading, refetch } = useApiList<SBNHolding>('/api/portfolio/sbn', { refreshMs: 60000 })

  // ── Add form ──
  const [showAdd, setShowAdd] = useState(false)
  const [saving,  setSaving ] = useState(false)
  const [errors,  setErrors ] = useState<Record<string, string>>({})
  const [form,    setForm   ] = useState(EMPTY_FORM)

  // ── Edit modal ──
  const [editTarget, setEditTarget] = useState<SBNHolding | null>(null)
  const [editForm,   setEditForm  ] = useState(EMPTY_FORM)
  const [editSaving, setEditSaving] = useState(false)
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})

  const active  = useMemo(() => (holdings || []).filter((h) => h.status === 'active'), [holdings])
  const matured = useMemo(() => (holdings || []).filter((h) => h.status === 'matured'),  [holdings])

  // auto-set tax when type changes
  const taxRateForType = (t: SBNType) => SBN_TYPES.find((x) => x.value === t)?.taxRate ?? 10

  const totals = useMemo(() => ({
    nominal:    active.reduce((s, h) => s + h.nominal,    0),
    netReturn:  active.reduce((s, h) => s + h.netReturn,  0),
    totalFinal: active.reduce((s, h) => s + h.totalFinal, 0),
  }), [active])

  // Live preview
  const preview = useMemo(() => {
    if (!form.nominal || !form.annualRate || !form.tenorMonths) return null
    return calcSBN(
      parseFloat(form.nominal),
      parseFloat(form.annualRate),
      parseInt(form.tenorMonths),
      taxRateForType(form.type)
    )
  }, [form.nominal, form.annualRate, form.tenorMonths, form.type])

  const previewMaturity = useMemo(() => {
    if (!form.startDate || !form.tenorMonths) return null
    try { return addMonths(new Date(form.startDate), parseInt(form.tenorMonths)).toISOString().split('T')[0] }
    catch { return null }
  }, [form.startDate, form.tenorMonths])

  // Auto-complete matured holdings + create transaction
  const autoCompleteMatured = useCallback(async (list: SBNHolding[]) => {
    const now = new Date()
    const maturedNow = list.filter((h) => h.status === 'active' && new Date(h.maturityDate) <= now)
    if (!maturedNow.length) return
    for (const h of maturedNow) {
      try {
        await fetch('/api/portfolio/sbn', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: h.id, status: 'matured' }),
        })
        // Auto-create income transaction
        await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'income', amount: h.totalFinal, wallet: 'bank',
            description: `SBN jatuh tempo: ${h.seri}`,
            date: new Date().toISOString().split('T')[0], categoryId: '',
          }),
        })
        toast.success(`🏛️ SBN ${h.seri} jatuh tempo — ${formatCurrency(h.totalFinal)} masuk ke Bank`, { duration: 5000 })
      } catch { /* silent */ }
    }
    if (maturedNow.length) refetch()
  }, [refetch])

  useEffect(() => { if (active.length) autoCompleteMatured(active) }, [active, autoCompleteMatured])

  // Validate
  const validate = (f: typeof form) => {
    const e: Record<string, string> = {}
    if (!f.seri)        e.seri        = 'Seri wajib diisi'
    if (!f.nominal)     e.nominal     = 'Nominal wajib diisi'
    if (!f.annualRate)  e.annualRate  = 'Bunga wajib diisi'
    if (!f.tenorMonths) e.tenorMonths = 'Tenor wajib diisi'
    if (!f.startDate)   e.startDate   = 'Tanggal beli wajib diisi'
    return e
  }

  const handleAdd = async () => {
    const e = validate(form)
    if (Object.keys(e).length) { setErrors(e); return }
    setErrors({})
    setSaving(true)
    try {
      const payload = { ...form, taxRate: String(taxRateForType(form.type)) }
      const res  = await fetch('/api/portfolio/sbn', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('SBN berhasil ditambahkan! ✓')
      setShowAdd(false); refetch()
      setForm(EMPTY_FORM)
    } catch { toast.error('Gagal menambahkan SBN') }
    finally { setSaving(false) }
  }

  const openEdit = (h: SBNHolding) => {
    setEditTarget(h)
    setEditForm({
      seri:        h.seri,
      type:        h.type,
      nominal:     String(h.nominal),
      annualRate:  String(h.annualRate),
      tenorMonths: String(h.tenorMonths),
      startDate:   h.startDate,
      notes:       (h as { notes?: string }).notes || '',
    })
    setEditErrors({})
  }

  const handleEdit = async () => {
    if (!editTarget) return
    const e = validate(editForm)
    if (Object.keys(e).length) { setEditErrors(e); return }
    setEditErrors({})
    setEditSaving(true)
    try {
      // Recalculate derived fields
      const calc = calcSBN(
        parseFloat(editForm.nominal),
        parseFloat(editForm.annualRate),
        parseInt(editForm.tenorMonths),
        taxRateForType(editForm.type)
      )
      const maturityDate = addMonths(new Date(editForm.startDate), parseInt(editForm.tenorMonths))
        .toISOString().split('T')[0]

      const res = await fetch('/api/portfolio/sbn', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id:           editTarget.id,
          seri:         editForm.seri.toUpperCase(),
          type:         editForm.type,
          nominal:      parseFloat(editForm.nominal),
          annualRate:   parseFloat(editForm.annualRate),
          taxRate:      taxRateForType(editForm.type),
          tenorMonths:  parseInt(editForm.tenorMonths),
          startDate:    editForm.startDate,
          maturityDate,
          grossReturn:  calc.grossReturn,
          taxAmount:    calc.taxAmount,
          netReturn:    calc.netReturn,
          totalFinal:   calc.totalFinal,
          notes:        editForm.notes,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('SBN berhasil diupdate! ✓')
      setEditTarget(null); refetch()
    } catch { toast.error('Gagal mengupdate SBN') }
    finally { setEditSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus SBN ini?')) return
    await fetch(`/api/portfolio/sbn?id=${id}`, { method: 'DELETE' })
    toast.success('SBN dihapus'); refetch()
  }

  // ── Shared form body (used in both Add and Edit) ──────────────────────────
  function SBNFormBody({
    f, setF, errs, previewCalc, previewMat, taxRate,
  }: {
    f: typeof form
    setF: (v: typeof form) => void
    errs: Record<string, string>
    previewCalc: ReturnType<typeof calcSBN> | null
    previewMat: string | null
    taxRate: number
  }) {
    return (
      <div className="space-y-4">
        {/* Type selector */}
        <div>
          <label className="text-xs mb-2 block font-semibold" style={{ color: 'var(--text-muted)' }}>Jenis SBN</label>
          <div className="grid grid-cols-3 gap-1.5">
            {SBN_TYPES.slice(0, 3).map((t) => (
              <button key={t.value}
                onClick={() => setF({ ...f, type: t.value })}
                className="py-2.5 rounded-xl text-center transition-all"
                style={{
                  background: f.type === t.value ? 'rgba(168,85,247,0.14)' : 'rgba(255,255,255,0.88)',
                  border: `1px solid ${f.type === t.value ? 'rgba(168,85,247,0.4)' : 'var(--border)'}`,
                }}>
                <p className="text-xs font-bold" style={{ color: f.type === t.value ? '#d6aaff' : 'var(--text-muted)' }}>
                  {t.label}
                </p>
                <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>pajak {t.taxRate}%</p>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1.5 mt-1.5">
            {SBN_TYPES.slice(3).map((t) => (
              <button key={t.value}
                onClick={() => setF({ ...f, type: t.value })}
                className="py-2.5 rounded-xl text-center transition-all"
                style={{
                  background: f.type === t.value ? 'rgba(168,85,247,0.14)' : 'rgba(255,255,255,0.88)',
                  border: `1px solid ${f.type === t.value ? 'rgba(168,85,247,0.4)' : 'var(--border)'}`,
                }}>
                <p className="text-xs font-bold" style={{ color: f.type === t.value ? '#d6aaff' : 'var(--text-muted)' }}>
                  {t.label}
                </p>
                <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>pajak {t.taxRate}%</p>
              </button>
            ))}
          </div>
          {/* Auto-tax notice */}
          <div className="mt-2 px-3 py-2 rounded-xl flex items-center gap-2"
            style={{ background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.14)' }}>
            <span className="text-xs">🤖</span>
            <p className="text-[11px]" style={{ color: '#c084fc' }}>
              Pajak otomatis: <strong>{taxRate}%</strong> sesuai jenis SBN
            </p>
          </div>
        </div>

        <Field label="Seri" required error={errs.seri}>
          <input type="text" className="input-glass uppercase" placeholder="Contoh: ORI025"
            value={f.seri} onChange={(e) => setF({ ...f, seri: e.target.value.toUpperCase() })} />
        </Field>

        <Field label="Nominal (Rp)" required error={errs.nominal}>
          <input type="number" className="input-glass" placeholder="Contoh: 1000000"
            value={f.nominal} onChange={(e) => setF({ ...f, nominal: e.target.value })} />
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Bunga %/thn" required error={errs.annualRate}>
            <input type="number" step="0.01" className="input-glass" placeholder="Contoh: 6.5"
              value={f.annualRate} onChange={(e) => setF({ ...f, annualRate: e.target.value })} />
          </Field>
          <Field label="Tenor (bulan)" required error={errs.tenorMonths}>
            <input type="number" className="input-glass" placeholder="Contoh: 24"
              value={f.tenorMonths} onChange={(e) => setF({ ...f, tenorMonths: e.target.value })} />
          </Field>
        </div>

        <Field label="Tanggal Beli" required error={errs.startDate}>
          <input type="date" className="input-glass"
            value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} />
        </Field>

        {/* Preview */}
        {previewCalc && (
          <div className="p-3.5 rounded-xl space-y-2"
            style={{ background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.18)' }}>
            <p className="text-xs font-semibold" style={{ color: '#d6aaff' }}>Estimasi Hasil</p>
            {previewMat && (
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--text-muted)' }}>Jatuh Tempo</span>
                <span style={{ color: 'var(--text-primary)' }}>{formatDate(previewMat)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--text-muted)' }}>Bunga Kotor</span>
              <span style={{ color: 'var(--text-secondary)' }}>{formatCurrency(previewCalc.grossReturn)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--text-muted)' }}>Pajak ({taxRate}%)</span>
              <span style={{ color: 'var(--red)' }}>-{formatCurrency(previewCalc.taxAmount)}</span>
            </div>
            <div className="h-px" style={{ background: 'var(--border)' }} />
            <div className="flex justify-between text-xs">
              <span className="font-bold" style={{ color: 'var(--text-muted)' }}>Bunga Bersih</span>
              <span className="font-bold" style={{ color: 'var(--accent)' }}>+{formatCurrency(previewCalc.netReturn)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="font-bold" style={{ color: 'var(--text-muted)' }}>Total Akhir</span>
              <span className="font-bold" style={{ color: '#d6aaff' }}>{formatCurrency(previewCalc.totalFinal)}</span>
            </div>
          </div>
        )}

        <Field label="Catatan (opsional)">
          <input type="text" className="input-glass" placeholder="Contoh: Untuk dana pendidikan"
            value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        </Field>
      </div>
    )
  }

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>🏛️ SBN</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Surat Berharga Negara · bunga bersih after tax</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary px-4 py-2 flex items-center gap-1.5 text-sm">
          <Plus size={16} /> Tambah
        </button>
      </div>

      {/* Summary */}
      {active.length > 0 && (
        <div className="glass-card p-5 mb-5" style={{ borderColor: 'rgba(168,85,247,0.2)' }}>
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Total Nominal</p>
              <p className="text-2xl font-display font-bold" style={{ color: '#d6aaff' }}>
                {formatCurrency(totals.nominal)}
              </p>
            </div>
            <div className="h-px" style={{ background: 'var(--border)' }} />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Bunga Bersih</p>
                <div className="flex items-center gap-1">
                  <TrendingUp size={13} color="var(--accent)" />
                  <p className="text-sm font-bold font-mono" style={{ color: 'var(--accent)' }}>
                    +{formatCurrency(totals.netReturn)}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Nilai Akhir</p>
                <p className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                  {formatCurrency(totals.totalFinal)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Holdings */}
      {loading ? (
        <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}</div>
      ) : active.length === 0 ? (
        <div className="text-center py-16 glass-card">
          <p className="text-4xl mb-3">🏛️</p>
          <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Belum ada SBN</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Tambahkan kepemilikan SBN Anda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {active.map((h) => (
            <motion.div key={h.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{ background: 'rgba(168,85,247,0.12)', color: '#d6aaff' }}>
                    {h.type}
                  </div>
                  <div>
                    <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{h.seri}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {h.annualRate}%/thn · {h.tenorMonths} bln · pajak {h.taxRate}%
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => openEdit(h)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(168,85,247,0.10)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.18)' }}>
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => handleDelete(h.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'var(--red-dim)', color: 'var(--red)' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-0 rounded-xl overflow-hidden mb-3" style={{ background: 'rgba(255,255,255,0.90)' }}>
                {[
                  { label: 'Nominal',      value: formatCurrency(h.nominal),       color: '#d6aaff' },
                  { label: 'Bunga Kotor',  value: formatCurrency(h.grossReturn),   color: 'var(--text-secondary)' },
                  { label: 'Pajak',        value: `-${formatCurrency(h.taxAmount)}`, color: 'var(--red)' },
                  { label: 'Bunga Bersih', value: `+${formatCurrency(h.netReturn)}`, color: 'var(--accent)' },
                  { label: 'Total Akhir',  value: formatCurrency(h.totalFinal),    color: '#d6aaff' },
                ].map((row, i, arr) => (
                  <div key={row.label}
                    className="flex items-center justify-between px-3 py-2"
                    style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{row.label}</p>
                    <p className="text-xs font-bold font-mono" style={{ color: row.color }}>{row.value}</p>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <ProgressBar start={h.startDate} end={h.maturityDate} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Matured */}
      {matured.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold px-1 mb-2" style={{ color: 'var(--text-muted)' }}>
            SUDAH JATUH TEMPO ({matured.length})
          </p>
          {matured.map((h) => (
            <div key={h.id} className="glass-card p-3 flex items-center justify-between mb-2 opacity-60">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{h.seri}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {formatCurrency(h.nominal)} · JT {formatDate(h.maturityDate)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold" style={{ color: 'var(--accent)' }}>+{formatCurrency(h.netReturn)}</p>
                <button onClick={() => handleDelete(h.id)} className="text-[10px] mt-0.5"
                  style={{ color: 'var(--red)' }}>Hapus</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Modal ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAdd && (
          <ModalShell title="Tambah SBN" onClose={() => { setShowAdd(false); setErrors({}) }}>
            <div className="px-5 pb-7">
              <SBNFormBody
                f={form} setF={setForm} errs={errors}
                previewCalc={preview} previewMat={previewMaturity}
                taxRate={taxRateForType(form.type)}
              />
              <button onClick={handleAdd} disabled={saving}
                className="mt-4 w-full py-3.5 rounded-2xl font-semibold text-white transition-all active:scale-[0.98]"
                style={{
                  background: saving ? 'rgba(168,85,247,0.4)' : 'linear-gradient(135deg, #d6aaff, #7c3aed)',
                  boxShadow: saving ? 'none' : '0 4px 16px rgba(168,85,247,0.28)',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-space)',
                }}>
                {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : '💾 Simpan SBN'}
              </button>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* ── Edit Modal ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {editTarget && (() => {
          const editPreview = (!editForm.nominal || !editForm.annualRate || !editForm.tenorMonths) ? null
            : calcSBN(parseFloat(editForm.nominal), parseFloat(editForm.annualRate), parseInt(editForm.tenorMonths), taxRateForType(editForm.type))
          const editMat = (!editForm.startDate || !editForm.tenorMonths) ? null
            : (() => { try { return addMonths(new Date(editForm.startDate), parseInt(editForm.tenorMonths)).toISOString().split('T')[0] } catch { return null } })()
          return (
            <ModalShell title={`Edit ${editTarget.seri}`} onClose={() => { setEditTarget(null); setEditErrors({}) }}>
              <div className="px-5 pb-7">
                <SBNFormBody
                  f={editForm} setF={setEditForm} errs={editErrors}
                  previewCalc={editPreview} previewMat={editMat}
                  taxRate={taxRateForType(editForm.type)}
                />
                <button onClick={handleEdit} disabled={editSaving}
                  className="mt-4 w-full py-3.5 rounded-2xl font-semibold text-white transition-all active:scale-[0.98]"
                  style={{
                    background: editSaving ? 'rgba(168,85,247,0.4)' : 'linear-gradient(135deg, #d6aaff, #7c3aed)',
                    boxShadow: editSaving ? 'none' : '0 4px 16px rgba(168,85,247,0.28)',
                    cursor: editSaving ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-space)',
                  }}>
                  {editSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : '✓ Simpan Perubahan'}
                </button>
              </div>
            </ModalShell>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}
