'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApiList } from '@/hooks/useApiData'
import { formatCurrency, formatDate, formatNumber, enrichDeposit, capitalizeFirst } from '@/lib/utils'
import type { Deposit, DepositWithCountdown } from '@/types'
import { Plus, Trash2, Bell, Clock, CheckCircle, X, Sparkles, Pencil, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

// Common bank names for quick-select autocomplete
const BANK_SUGGESTIONS = ['BCA', 'Mandiri', 'BRI', 'BNI', 'CIMB Niaga', 'Jago', 'Sinarmas', 'Danamon', 'Permata', 'BTN']

export default function DepositoPage() {
  const { data: deposits, loading, refetch } = useApiList<Deposit>('/api/portfolio/deposits?status=all', { refreshMs: 30000 })
  const [showAdd,     setShowAdd    ] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [saving,      setSaving     ] = useState(false)
  const [form, setForm] = useState({
    bankName: '', nominal: '', interestRate: '', tenorMonths: '',
    startDate: new Date().toISOString().split('T')[0], notes: '',
  })

  // ── Edit modal state ──
  const [editTarget, setEditTarget] = useState<Deposit | null>(null)
  const [editForm,   setEditForm  ] = useState({ bankName: '', nominal: '', interestRate: '', tenorMonths: '', startDate: '', notes: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})

  const enriched = useMemo(() => (deposits || []).map(enrichDeposit), [deposits])
  const active   = useMemo(() => enriched.filter((d) => d.status === 'active').sort((a, b) => a.daysRemaining - b.daysRemaining), [enriched])
  const history  = useMemo(() => enriched.filter((d) => d.status !== 'active'), [enriched])

  const totals = useMemo(() => ({
    nominal:    active.reduce((s, d) => s + d.nominal, 0),
    finalValue: active.reduce((s, d) => s + d.finalValue, 0),
    interest:   active.reduce((s, d) => s + d.totalInterest, 0),
  }), [active])

  // ── Auto-complete deposits when progress >= 100% + auto-transaction ──
  const autoCompleteMatured = useCallback(async (list: DepositWithCountdown[]) => {
    const matured = list.filter((d) => d.percentComplete >= 100 && d.status === 'active')
    if (matured.length === 0) return

    for (const d of matured) {
      try {
        await fetch('/api/portfolio/deposits', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: d.id, status: 'matured', updatedAt: new Date().toISOString() }),
        })
        // Auto-create income transaction to Bank wallet
        const finalAmount = d.netFinalValue ?? d.finalValue
        await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'income', amount: finalAmount, wallet: 'bank',
            description: `Deposito jatuh tempo: ${d.bankName}`,
            date: new Date().toISOString().split('T')[0], categoryId: '',
            isSystemTransaction: true,
          }),
        })
        toast.success(`🏦 Deposito ${d.bankName} cair — ${formatCurrency(finalAmount)} masuk ke Bank`, { duration: 5000 })
      } catch { /* silent fail */ }
    }
    if (matured.length > 0) refetch()
  }, [refetch])

  // Run auto-complete check whenever deposits are refreshed
  useEffect(() => {
    if (active.length > 0) {
      autoCompleteMatured(active)
    }
  }, [active, autoCompleteMatured])

  const handleAdd = async () => {
    if (!form.bankName || !form.nominal || !form.interestRate || !form.tenorMonths || !form.startDate) {
      toast.error('Isi semua field'); return
    }
    setSaving(true)
    try {
      const res  = await fetch('/api/portfolio/deposits', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Deposito berhasil ditambahkan! ✓')
      setShowAdd(false)
      refetch()
      setForm({ bankName: '', nominal: '', interestRate: '', tenorMonths: '', startDate: new Date().toISOString().split('T')[0], notes: '' })
    } catch { toast.error('Gagal menambahkan deposito') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus deposito ini?')) return
    await fetch(`/api/portfolio/deposits?id=${id}`, { method: 'DELETE' })
    toast.success('Deposito dihapus')
    refetch()
  }

  // ── Feature #7: Auto-capitalization — capitalize first letter as user types ──
  const handleBankNameChange = (value: string) => {
    const capitalized = capitalizeFirst(value)
    setForm((prev) => ({ ...prev, bankName: capitalized }))
  }

  // ── Edit handlers ──
  const openEdit = (d: Deposit) => {
    setEditTarget(d)
    setEditForm({
      bankName:     d.bankName,
      nominal:      String(d.nominal),
      interestRate: String(d.interestRate),
      tenorMonths:  String(d.tenorMonths),
      startDate:    d.startDate,
      notes:        d.notes || '',
    })
    setEditErrors({})
  }

  const handleEdit = async () => {
    if (!editTarget) return
    const e: Record<string, string> = {}
    if (!editForm.bankName)     e.bankName     = 'Nama bank wajib diisi'
    if (!editForm.nominal)      e.nominal      = 'Nominal wajib diisi'
    if (!editForm.interestRate) e.interestRate = 'Bunga wajib diisi'
    if (!editForm.tenorMonths)  e.tenorMonths  = 'Tenor wajib diisi'
    if (Object.keys(e).length) { setEditErrors(e); return }
    setEditErrors({})
    setEditSaving(true)
    try {
      const res = await fetch('/api/portfolio/deposits', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editTarget.id, ...editForm }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Deposito berhasil diupdate! ✓')
      setEditTarget(null); refetch()
    } catch { toast.error('Gagal mengupdate deposito') }
    finally { setEditSaving(false) }
  }

  const getDaysColor = (days: number) => {
    if (days <= 1) return 'var(--red)'
    if (days <= 7) return '#f97316'
    if (days <= 30) return '#f59e0b'
    return 'var(--accent)'
  }

  const TAX_RATE = 20 // PPh final deposito Indonesia

  const preview = useMemo(() => {
    if (!form.nominal || !form.interestRate || !form.tenorMonths) return null
    const nom         = parseFloat(form.nominal)
    const rate        = parseFloat(form.interestRate)
    const tenor       = parseInt(form.tenorMonths)
    const grossInt    = nom * (rate / 100 / 12) * tenor
    const tax         = grossInt * (TAX_RATE / 100)
    const netInt      = grossInt - tax
    const netFinal    = nom + netInt
    return { interest: grossInt, tax, netInterest: netInt, finalValue: nom + grossInt, netFinalValue: netFinal }
  }, [form.nominal, form.interestRate, form.tenorMonths])

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>🏦 Deposito</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Notifikasi otomatis jatuh tempo</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary px-4 py-2 flex items-center gap-1.5 text-sm">
          <Plus size={16} /> Tambah
        </button>
      </div>

      {/* Summary */}
      <div className="glass-card p-5 mb-5" style={{ borderColor: 'rgba(168,85,247,0.2)' }}>
        <div className="flex flex-col gap-0 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.90)' }}>
          {[
            { label: 'Total Modal',  val: totals.nominal,    color: '#d6aaff' },
            { label: 'Total Bunga',  val: totals.interest,   color: 'var(--accent)' },
            { label: 'Nilai Akhir',  val: totals.finalValue, color: 'var(--text-primary)' },
          ].map((row, i) => (
            <div key={row.label}
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{row.label}</p>
              <p className="text-sm font-bold font-mono" style={{ color: row.color }}>{formatCurrency(row.val)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Active deposits */}
      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}</div>
      ) : !active.length ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🏦</p>
          <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Belum ada deposito aktif</p>
        </div>
      ) : (
        <div className="space-y-3">
          {active.map((d) => {
            const dayColor = getDaysColor(d.daysRemaining)
            const isUrgent = d.daysRemaining <= 3
            // Show auto-complete badge if nearly done
            const isNearlyDone = d.percentComplete >= 95

            return (
              <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="glass-card p-4 relative overflow-hidden"
                style={{ borderColor: isUrgent ? 'rgba(239,68,68,0.3)' : 'var(--border)' }}>
                {isUrgent && (
                  <div className="absolute top-0 right-0 left-0 h-0.5"
                    style={{ background: 'linear-gradient(90deg, transparent, var(--red), transparent)' }} />
                )}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{d.bankName}</p>
                      {isUrgent && <Bell size={14} color="var(--red)" className="animate-pulse" />}
                      {isNearlyDone && !isUrgent && (
                        <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full"
                          style={{ background: 'rgba(34,197,94,0.10)', color: 'var(--accent)' }}>
                          <Sparkles size={9}/> Auto-selesai
                        </span>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {d.interestRate}% / thn · {d.tenorMonths} bulan
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => openEdit(d)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(168,85,247,0.10)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.18)' }}>
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => handleDelete(d.id)} className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: 'var(--red-dim)', color: 'var(--red)' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-0 mb-3 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.90)' }}>
                  {[
                    { label: 'Modal',       value: formatCurrency(d.nominal),       color: '#d6aaff' },
                    { label: 'Bunga',       value: formatCurrency(d.totalInterest), color: 'var(--accent)' },
                    { label: 'Nilai Akhir', value: formatCurrency(d.finalValue),    color: 'var(--text-primary)' },
                  ].map((row, ri) => (
                    <div key={row.label}
                      className="flex items-center justify-between px-3 py-2"
                      style={{ borderBottom: ri < 2 ? '1px solid var(--border)' : 'none' }}>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{row.label}</p>
                      <p className="text-xs font-bold font-mono" style={{ color: row.color }}>{row.value}</p>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-3 pb-2 pt-2">
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sisa Hari</p>
                    <p className="text-xs font-bold" style={{ color: dayColor }}>
                      {d.daysRemaining <= 0 ? '🔔 HARI INI!' : `${d.daysRemaining} hari`}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="progress-bar mb-2">
                  <div className="progress-bar-fill" style={{ width: `${d.percentComplete}%`, background: dayColor }} />
                </div>
                <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  <span>{formatDate(d.startDate, 'dd MMM yy')}</span>
                  <div className="flex items-center gap-1">
                    <Clock size={10} />
                    <span>{d.percentComplete.toFixed(0)}%</span>
                  </div>
                  <span>{formatDate(d.maturityDate, 'dd MMM yy')}</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* History toggle */}
      {history.length > 0 && (
        <div className="mt-6">
          <button onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between py-3 px-4 rounded-xl mb-3"
            style={{ background: 'rgba(255,255,255,0.75)', color: 'var(--text-secondary)' }}>
            <span className="text-sm font-medium">Riwayat Deposito ({history.length})</span>
            <CheckCircle size={16} color="var(--text-muted)" />
          </button>
          <AnimatePresence>
            {showHistory && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-2">
                {history.map((d) => (
                  <div key={d.id} className="glass-card p-3 flex items-center justify-between opacity-60">
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{d.bankName}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {formatCurrency(d.nominal)} · Cair {formatDate(d.maturityDate)}
                      </p>
                    </div>
                    <p className="text-sm font-bold" style={{ color: 'var(--accent)' }}>+{formatCurrency(d.totalInterest)}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Add modal */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => setShowAdd(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="relative w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl p-6"
              style={{ background: 'rgba(255,255,255,0.80)', border: '1px solid var(--border)', maxHeight: '90dvh', overflowY: 'auto' }}
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Tambah Deposito</h2>
                <button onClick={() => setShowAdd(false)} className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.90)', color: 'var(--text-secondary)' }}>
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-4">

                {/* Bank Name with auto-cap + quick suggestions */}
                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Nama Bank</label>
                  <input
                    type="text"
                    className="input-glass"
                    placeholder="contoh: BCA, Mandiri, BRI"
                    value={form.bankName}
                    onChange={(e) => handleBankNameChange(e.target.value)}
                  />
                  {/* Quick suggestions */}
                  {!form.bankName && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {BANK_SUGGESTIONS.map((b) => (
                        <button key={b}
                          onClick={() => setForm((p) => ({ ...p, bankName: b }))}
                          className="px-2 py-1 rounded-lg text-xs"
                          style={{ background: 'rgba(255,255,255,0.90)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                          {b}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Nominal (Rp)</label>
                  <input type="number" className="input-glass" placeholder="contoh: 10000000"
                    value={form.nominal} onChange={(e) => setForm({ ...form, nominal: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Bunga (%/thn)</label>
                    <input type="number" step="0.01" className="input-glass" placeholder="contoh: 4.5"
                      value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Tenor (bulan)</label>
                    <input type="number" className="input-glass" placeholder="contoh: 12"
                      value={form.tenorMonths} onChange={(e) => setForm({ ...form, tenorMonths: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Tanggal Mulai</label>
                  <input type="date" className="input-glass"
                    value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>

                {preview && (
                  <div className="p-3 rounded-xl space-y-1.5" style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: '#a855f7' }}>Preview Perhitungan (Pajak {TAX_RATE}%)</p>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: 'var(--text-muted)' }}>Bunga Kotor</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{formatCurrency(preview.interest)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: 'var(--text-muted)' }}>Pajak Deposito (PPh {TAX_RATE}%)</span>
                      <span style={{ color: 'var(--red)' }}>-{formatCurrency(preview.tax)}</span>
                    </div>
                    <div className="h-px" style={{ background: 'rgba(168,85,247,0.25)' }} />
                    <div className="flex justify-between text-xs">
                      <span className="font-bold" style={{ color: 'var(--text-muted)' }}>Bunga Bersih</span>
                      <span className="font-bold" style={{ color: 'var(--accent)' }}>+{formatCurrency(preview.netInterest)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="font-bold" style={{ color: 'var(--text-muted)' }}>Total Akhir (Bersih)</span>
                      <span className="font-bold" style={{ color: '#a855f7' }}>{formatCurrency(preview.netFinalValue)}</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Catatan (opsional)</label>
                  <input type="text" className="input-glass" placeholder="Misal: Untuk dana darurat"
                    value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>

                <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: 'rgba(59,130,246,0.08)' }}>
                  <Bell size={14} color="#3b82f6" style={{ marginTop: 1, flexShrink: 0 }} />
                  <p className="text-xs" style={{ color: '#3b82f6' }}>
                    Notifikasi H-3, H-2, H-1 dan hari jatuh tempo. Otomatis selesai saat progress 100%.
                  </p>
                </div>

                <button onClick={handleAdd} disabled={saving}
                  className="w-full py-3.5 rounded-2xl font-semibold text-white transition-all active:scale-[0.98]"
                  style={{
                    background: saving ? 'rgba(168,85,247,0.4)' : 'linear-gradient(135deg, #a855f7, #7c3aed)',
                    boxShadow: saving ? 'none' : '0 4px 16px rgba(168,85,247,0.28)',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-space)',
                  }}>
                  {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Simpan Deposito'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Edit Modal ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {editTarget && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
              onClick={() => setEditTarget(null)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="relative w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl"
              style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid var(--border)', maxHeight: '92dvh', overflowY: 'auto' }}
              onClick={(e) => e.stopPropagation()}>
              <div className="drag-indicator mt-3 sm:hidden" />
              <div className="flex items-center justify-between px-5 py-4">
                <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Edit Deposito</h2>
                <button onClick={() => setEditTarget(null)}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.06)', color: 'var(--text-secondary)' }}>
                  <X size={18} />
                </button>
              </div>
              <div className="px-5 pb-7 space-y-4">
                <div className="p-3 rounded-xl" style={{ background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.14)' }}>
                  <p className="text-xs font-bold" style={{ color: '#c084fc' }}>{editTarget.bankName}</p>
                </div>

                {/* Bank name */}
                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Nama Bank <span style={{ color: 'var(--accent)' }}>*</span>
                  </label>
                  <input type="text" className="input-glass" placeholder="Contoh: BCA"
                    value={editForm.bankName}
                    onChange={(e) => setEditForm({ ...editForm, bankName: capitalizeFirst(e.target.value) })} />
                  {editErrors.bankName && (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertCircle size={11} color="var(--red)" />
                      <p className="text-[11px]" style={{ color: 'var(--red)' }}>{editErrors.bankName}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Nominal (Rp) <span style={{ color: 'var(--accent)' }}>*</span>
                  </label>
                  <input type="number" className="input-glass" placeholder="Contoh: 10000000"
                    value={editForm.nominal} onChange={(e) => setEditForm({ ...editForm, nominal: e.target.value })} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>
                      Bunga (%/thn) <span style={{ color: 'var(--accent)' }}>*</span>
                    </label>
                    <input type="number" step="0.01" className="input-glass" placeholder="Contoh: 4.5"
                      value={editForm.interestRate} onChange={(e) => setEditForm({ ...editForm, interestRate: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>
                      Tenor (bulan) <span style={{ color: 'var(--accent)' }}>*</span>
                    </label>
                    <input type="number" className="input-glass" placeholder="Contoh: 12"
                      value={editForm.tenorMonths} onChange={(e) => setEditForm({ ...editForm, tenorMonths: e.target.value })} />
                  </div>
                </div>

                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>Tanggal Mulai</label>
                  <input type="date" className="input-glass"
                    value={editForm.startDate} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })} />
                </div>

                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>Catatan (opsional)</label>
                  <input type="text" className="input-glass" placeholder="Catatan"
                    value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
                </div>

                <button onClick={handleEdit} disabled={editSaving}
                  className="w-full py-3.5 rounded-2xl font-semibold text-white transition-all active:scale-[0.98]"
                  style={{
                    background: editSaving ? 'rgba(168,85,247,0.4)' : 'linear-gradient(135deg, #a855f7, #7c3aed)',
                    boxShadow: editSaving ? 'none' : '0 4px 16px rgba(168,85,247,0.28)',
                    cursor: editSaving ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-space)',
                  }}>
                  {editSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : '✓ Simpan Perubahan'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
