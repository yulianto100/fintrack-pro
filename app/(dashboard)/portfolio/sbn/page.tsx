'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApiList } from '@/hooks/useApiData'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import { calcSBN } from '@/lib/investment-calculator'
import { addMonths } from 'date-fns'
import type { SBNHolding, SBNType } from '@/types'
import { Plus, Trash2, X, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'

const SBN_TYPES: { value: SBNType; label: string; desc: string; taxRate: number }[] = [
  { value: 'ORI',  label: 'ORI',  desc: 'Obligasi Ritel Indonesia', taxRate: 10 },
  { value: 'SR',   label: 'SR',   desc: 'Sukuk Ritel',              taxRate: 10 },
  { value: 'SBR',  label: 'SBR',  desc: 'Sav. Bond Ritel',         taxRate: 10 },
  { value: 'ST',   label: 'ST',   desc: 'Sukuk Tabungan',           taxRate: 10 },
  { value: 'SBSN', label: 'SBSN', desc: 'Surat Berharga Syariah',   taxRate: 15 },
]

export default function SBNPage() {
  const { data: holdings, loading, refetch } = useApiList<SBNHolding>('/api/portfolio/sbn', { refreshMs: 60000 })

  const [showAdd, setShowAdd] = useState(false)
  const [saving,  setSaving ] = useState(false)
  const [form, setForm] = useState({
    seri: '', type: 'ORI' as SBNType,
    nominal: '', annualRate: '', taxRate: '10',
    tenorMonths: '', startDate: new Date().toISOString().split('T')[0], notes: '',
  })

  const active  = useMemo(() => (holdings || []).filter((h) => h.status === 'active'), [holdings])
  const matured = useMemo(() => (holdings || []).filter((h) => h.status === 'matured'), [holdings])

  const totals = useMemo(() => ({
    nominal:   active.reduce((s, h) => s + h.nominal, 0),
    netReturn: active.reduce((s, h) => s + h.netReturn, 0),
    totalFinal:active.reduce((s, h) => s + h.totalFinal, 0),
  }), [active])

  // Live preview in add form
  const preview = useMemo(() => {
    if (!form.nominal || !form.annualRate || !form.tenorMonths) return null
    return calcSBN(
      parseFloat(form.nominal),
      parseFloat(form.annualRate),
      parseInt(form.tenorMonths),
      parseFloat(form.taxRate || '10')
    )
  }, [form.nominal, form.annualRate, form.tenorMonths, form.taxRate])

  const previewMaturity = useMemo(() => {
    if (!form.startDate || !form.tenorMonths) return null
    try {
      return addMonths(new Date(form.startDate), parseInt(form.tenorMonths)).toISOString().split('T')[0]
    } catch { return null }
  }, [form.startDate, form.tenorMonths])

  const handleAdd = async () => {
    if (!form.seri || !form.nominal || !form.annualRate || !form.tenorMonths || !form.startDate) {
      toast.error('Isi semua field wajib'); return
    }
    setSaving(true)
    try {
      const res  = await fetch('/api/portfolio/sbn', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('SBN berhasil ditambahkan! ✓')
      setShowAdd(false); refetch()
      setForm({ seri:'', type:'ORI', nominal:'', annualRate:'', taxRate:'10', tenorMonths:'', startDate: new Date().toISOString().split('T')[0], notes:'' })
    } catch { toast.error('Gagal menambahkan SBN') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus SBN ini?')) return
    await fetch(`/api/portfolio/sbn?id=${id}`, { method: 'DELETE' })
    toast.success('SBN dihapus'); refetch()
  }

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto">
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
        <div className="space-y-3">{[...Array(2)].map((_,i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}</div>
      ) : active.length === 0 ? (
        <div className="text-center py-16 glass-card">
          <p className="text-4xl mb-3">🏛️</p>
          <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Belum ada SBN</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Tambahkan kepemilikan SBN Anda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {active.map((h) => (
            <motion.div key={h.id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
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
                <button onClick={() => handleDelete(h.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background:'var(--red-dim)', color:'var(--red)' }}>
                  <Trash2 size={12}/>
                </button>
              </div>

              <div className="flex flex-col gap-0 rounded-xl overflow-hidden" style={{ background: 'var(--surface-3)' }}>
                {[
                  { label: 'Nominal',     value: formatCurrency(h.nominal),    color: '#d6aaff' },
                  { label: 'Bunga Kotor', value: formatCurrency(h.grossReturn), color: 'var(--text-secondary)' },
                  { label: 'Pajak',       value: `-${formatCurrency(h.taxAmount)}`, color: 'var(--red)' },
                  { label: 'Bunga Bersih',value: `+${formatCurrency(h.netReturn)}`, color: 'var(--accent)' },
                ].map((row, i, arr) => (
                  <div key={row.label}
                    className="flex items-center justify-between px-3 py-2"
                    style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{row.label}</p>
                    <p className="text-xs font-bold font-mono" style={{ color: row.color }}>{row.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mt-3">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  JT: {formatDate(h.maturityDate)}
                </p>
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                  Total: {formatCurrency(h.totalFinal)}
                </p>
              </div>
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
                  style={{ color:'var(--red)' }}>Hapus</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="absolute inset-0"
              style={{ background:'rgba(0,0,0,0.65)', backdropFilter:'blur(6px)' }}
              onClick={() => setShowAdd(false)}/>
            <motion.div initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
              transition={{ type:'spring', damping:30, stiffness:350 }}
              className="relative w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl"
              style={{ background:'var(--surface-1)', border:'1px solid var(--border)', maxHeight:'92dvh', overflowY:'auto' }}
              onClick={(e) => e.stopPropagation()}>
              <div className="drag-indicator mt-3 sm:hidden"/>
              <div className="flex items-center justify-between px-5 py-4">
                <h2 className="font-display font-bold text-lg" style={{ color:'var(--text-primary)' }}>Tambah SBN</h2>
                <button onClick={() => setShowAdd(false)}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background:'var(--surface-3)', color:'var(--text-secondary)' }}>
                  <X size={18}/>
                </button>
              </div>
              <div className="px-5 pb-7 space-y-4">
                {/* Tipe */}
                <div>
                  <label className="text-xs mb-2 block font-semibold" style={{ color:'var(--text-muted)' }}>Jenis SBN</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {SBN_TYPES.map((t) => (
                      <button key={t.value}
                        onClick={() => setForm({ ...form, type: t.value, taxRate: String(t.taxRate) })}
                        className="py-2.5 rounded-xl text-center transition-all"
                        style={{
                          background: form.type === t.value ? 'rgba(168,85,247,0.14)' : 'var(--surface-3)',
                          border: `1px solid ${form.type === t.value ? 'rgba(168,85,247,0.4)' : 'var(--border)'}`,
                        }}>
                        <p className="text-xs font-bold" style={{ color: form.type === t.value ? '#d6aaff' : 'var(--text-muted)' }}>
                          {t.label}
                        </p>
                        <p className="text-[9px]" style={{ color:'var(--text-muted)' }}>pajak {t.taxRate}%</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color:'var(--text-muted)' }}>
                    Seri <span style={{ color:'var(--accent)' }}>*</span>
                  </label>
                  <input type="text" className="input-glass uppercase" placeholder="contoh: ORI025"
                    value={form.seri} onChange={(e) => setForm({ ...form, seri: e.target.value.toUpperCase() })}/>
                </div>

                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color:'var(--text-muted)' }}>
                    Nominal (Rp) <span style={{ color:'var(--accent)' }}>*</span>
                  </label>
                  <input type="number" className="input-glass" placeholder="1000000"
                    value={form.nominal} onChange={(e) => setForm({ ...form, nominal: e.target.value })}/>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs mb-1.5 block font-semibold" style={{ color:'var(--text-muted)' }}>
                      Bunga %/thn <span style={{ color:'var(--accent)' }}>*</span>
                    </label>
                    <input type="number" step="0.01" className="input-glass" placeholder="6.5"
                      value={form.annualRate} onChange={(e) => setForm({ ...form, annualRate: e.target.value })}/>
                  </div>
                  <div>
                    <label className="text-xs mb-1.5 block font-semibold" style={{ color:'var(--text-muted)' }}>
                      Tenor (bln) <span style={{ color:'var(--accent)' }}>*</span>
                    </label>
                    <input type="number" className="input-glass" placeholder="24"
                      value={form.tenorMonths} onChange={(e) => setForm({ ...form, tenorMonths: e.target.value })}/>
                  </div>
                  <div>
                    <label className="text-xs mb-1.5 block font-semibold" style={{ color:'var(--text-muted)' }}>Pajak %</label>
                    <input type="number" className="input-glass"
                      value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })}/>
                  </div>
                </div>

                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color:'var(--text-muted)' }}>Tanggal Beli</label>
                  <input type="date" className="input-glass"
                    value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}/>
                </div>

                {/* Preview */}
                {preview && (
                  <div className="p-3.5 rounded-xl space-y-2"
                    style={{ background:'rgba(168,85,247,0.07)', border:'1px solid rgba(168,85,247,0.18)' }}>
                    <p className="text-xs font-semibold" style={{ color:'#d6aaff' }}>Estimasi Hasil</p>
                    {previewMaturity && (
                      <div className="flex justify-between text-xs">
                        <span style={{ color:'var(--text-muted)' }}>Jatuh Tempo</span>
                        <span style={{ color:'var(--text-primary)' }}>{formatDate(previewMaturity)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs">
                      <span style={{ color:'var(--text-muted)' }}>Bunga Kotor</span>
                      <span style={{ color:'var(--text-secondary)' }}>{formatCurrency(preview.grossReturn)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span style={{ color:'var(--text-muted)' }}>Pajak ({formatNumber(parseFloat(form.taxRate||'10'))}%)</span>
                      <span style={{ color:'var(--red)' }}>-{formatCurrency(preview.taxAmount)}</span>
                    </div>
                    <div className="h-px" style={{ background:'var(--border)' }}/>
                    <div className="flex justify-between text-xs">
                      <span className="font-bold" style={{ color:'var(--text-muted)' }}>Bunga Bersih</span>
                      <span className="font-bold" style={{ color:'var(--accent)' }}>+{formatCurrency(preview.netReturn)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="font-bold" style={{ color:'var(--text-muted)' }}>Total Akhir</span>
                      <span className="font-bold" style={{ color:'#d6aaff' }}>{formatCurrency(preview.totalFinal)}</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color:'var(--text-muted)' }}>Catatan (opsional)</label>
                  <input type="text" className="input-glass" placeholder="Misal: Untuk dana pendidikan"
                    value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}/>
                </div>

                <button onClick={handleAdd} disabled={saving} className="btn-primary w-full py-3.5"
                  style={{ background:'linear-gradient(135deg, #d6aaff, #7c3aed)' }}>
                  {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"/> : '💾 Simpan SBN'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
