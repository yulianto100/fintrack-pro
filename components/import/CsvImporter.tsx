'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, Check, ChevronRight, AlertTriangle, FileText, RefreshCw } from 'lucide-react'
import { parseCsv, parseDate, parseAmount, smartCategorize } from '@/lib/csv-parser'
import type { ImportRow } from '@/app/api/import/route'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

type ImportStep = 'upload' | 'mapping' | 'preview' | 'done'

interface ColumnMapping {
  date:        string
  description: string
  amount:      string
  debitAmount?: string   // if bank uses separate debit/credit columns
  creditAmount?: string
  isDebit?:    string    // column that indicates debit (D/C marker)
}

const WALLET_OPTIONS = [
  { value: 'bank',    label: '🏦 Bank'    },
  { value: 'ewallet', label: '📱 E-Wallet'},
  { value: 'cash',    label: '💵 Cash'    },
]

export function CsvImporter({ onDone }: { onDone?: () => void }) {
  const [step,      setStep     ] = useState<Step>('upload')
  const [headers,   setHeaders  ] = useState<string[]>([])
  const [rawRows,   setRawRows  ] = useState<Record<string,string>[]>([])
  const [fileName,  setFileName ] = useState('')
  const [mapping,   setMapping  ] = useState<ColumnMapping>({ date: '', description: '', amount: '' })
  const [wallet,    setWallet   ] = useState('bank')
  const [preview,   setPreview  ] = useState<ImportRow[]>([])
  const [saving,    setSaving   ] = useState(false)
  const [result,    setResult   ] = useState<{ imported: number; skipped: number } | null>(null)
  const [dragOver,  setDragOver ] = useState(false)

  const processFile = useCallback(async (file: File) => {
    const text = await file.text()
    const { headers: h, rows } = parseCsv(text)
    setHeaders(h)
    setRawRows(rows)
    setFileName(file.name)

    // Auto-detect column mapping using common header names
    const autoMap: ColumnMapping = { date: '', description: '', amount: '' }
    for (const header of h) {
      const lh = header.toLowerCase()
      if (!autoMap.date        && /tanggal|date|tgl|waktu|time/.test(lh))       autoMap.date = header
      if (!autoMap.description && /keterangan|deskripsi|desc|uraian|info|nama|remark|detail/.test(lh)) autoMap.description = header
      if (!autoMap.amount      && /jumlah|nominal|amount|debet|kredit|mutasi|nilai/.test(lh)) autoMap.amount = header
      if (!autoMap.debitAmount && /debet|debit|keluar/.test(lh))  autoMap.debitAmount = header
      if (!autoMap.creditAmount&& /kredit|credit|masuk/.test(lh)) autoMap.creditAmount = header
    }
    setMapping(autoMap)
    setStep('mapping')
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.name.endsWith('.csv')) processFile(file)
    else toast.error('Hanya file .csv yang didukung')
  }, [processFile])

  const buildPreview = useCallback(() => {
    if (!mapping.date || !mapping.description) {
      toast.error('Pilih kolom tanggal dan deskripsi minimal')
      return
    }

    const rows: ImportRow[] = []
    for (const row of rawRows.slice(0, 200)) {
      const dateStr = parseDate(row[mapping.date] || '')
      if (!dateStr) continue

      let amount = 0
      // Mode 1: separate debit/credit columns
      if (mapping.debitAmount && mapping.creditAmount) {
        const debit  = parseAmount(row[mapping.debitAmount]  || '')
        const credit = parseAmount(row[mapping.creditAmount] || '')
        if      (credit > 0) amount =  credit
        else if (debit  > 0) amount = -debit
      }
      // Mode 2: single amount column
      else if (mapping.amount) {
        const raw = row[mapping.amount] || ''
        amount = parseAmount(raw)
        // Detect debit/credit marker if present
        if (mapping.isDebit) {
          const marker = (row[mapping.isDebit] || '').toUpperCase()
          if (marker === 'DB' || marker === 'D' || marker === 'DR') amount = -Math.abs(amount)
          else if (marker === 'CR' || marker === 'C' || marker === 'K') amount = Math.abs(amount)
        }
      }

      if (amount === 0) continue

      const desc   = row[mapping.description] || ''
      const smart  = smartCategorize(desc, amount, amount < 0)
      const type   = amount < 0 ? 'expense' : 'income'

      rows.push({
        date:        dateStr,
        description: desc,
        amount:      Math.abs(amount),
        type:        smart.type !== 'transfer' ? smart.type : type,
        category:    smart.category,
        wallet,
      })
    }

    if (rows.length === 0) {
      toast.error('Tidak ada baris valid ditemukan. Periksa mapping kolom.')
      return
    }

    setPreview(rows)
    setStep('preview')
  }, [mapping, rawRows, wallet])

  const handleSave = async () => {
    if (preview.length === 0) return
    setSaving(true)
    try {
      const res  = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: preview, fileName }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setResult(json.data)
      setStep('done')
      onDone?.()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengimport')
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setStep('upload'); setHeaders([]); setRawRows([]); setFileName('')
    setMapping({ date: '', description: '', amount: '' }); setPreview([])
    setResult(null); setWallet('bank')
  }

  const SelectCol = ({ label, field }: { label: string; field: keyof ColumnMapping }) => (
    <div>
      <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</label>
      <select
        className="input-glass text-sm"
        value={mapping[field] || ''}
        onChange={(e) => setMapping((p) => ({ ...p, [field]: e.target.value }))}
      >
        <option value="">— Tidak dipakai —</option>
        {headers.map((h) => <option key={h} value={h}>{h}</option>)}
      </select>
    </div>
  )

  return (
    <div className="max-w-xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-5">
        {(['upload','mapping','preview','done'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{
                background: step === s ? 'var(--accent)' : steps_done(step).includes(s) ? 'rgba(52,211,110,0.2)' : 'var(--surface-3)',
                color:      step === s ? 'white'        : steps_done(step).includes(s) ? 'var(--accent)' : 'var(--text-muted)',
              }}>
              {steps_done(step).includes(s) ? <Check size={10}/> : i+1}
            </div>
            {i < 3 && <div className="w-4 h-px" style={{ background: 'var(--border)' }}/>}
          </div>
        ))}
        <span className="ml-2 text-xs capitalize" style={{ color: 'var(--text-muted)' }}>
          {STEP_LABELS[step]}
        </span>
      </div>

      <AnimatePresence mode="wait">

        {/* ── STEP 1: UPLOAD ── */}
        {step === 'upload' && (
          <motion.div key="upload" initial={{ opacity:0,x:20 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,x:-20 }}>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className="rounded-2xl border-2 border-dashed p-8 text-center transition-all"
              style={{ borderColor: dragOver ? 'var(--accent)' : 'rgba(52,211,110,0.2)', background: dragOver ? 'rgba(52,211,110,0.05)' : 'transparent' }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'var(--accent-dim)' }}>
                <Upload size={24} color="var(--accent)" />
              </div>
              <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Upload Mutasi Bank (CSV)</p>
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Drag & drop atau klik untuk pilih file</p>
              <label className="btn-primary px-5 py-2.5 cursor-pointer inline-flex items-center gap-2 text-sm">
                <FileText size={15}/> Pilih File CSV
                <input type="file" accept=".csv" className="hidden" onChange={handleFileInput}/>
              </label>
            </div>

            {/* Format hints */}
            <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>FORMAT YANG DIDUKUNG</p>
              <div className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                {['BCA, Mandiri, BNI, BRI — export CSV dari internet banking',
                  'Kolom: Tanggal, Keterangan, Debet/Kredit, Jumlah',
                  'Encoding: UTF-8 atau UTF-8 BOM',
                  'Hingga 200 baris per import'].map((t) => (
                  <p key={t} className="flex items-start gap-1.5"><span style={{ color: 'var(--accent)' }}>•</span>{t}</p>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: MAPPING ── */}
        {step === 'mapping' && (
          <motion.div key="mapping" initial={{ opacity:0,x:20 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,x:-20 }}
            className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: 'var(--accent-dim)', border: '1px solid rgba(52,211,110,0.2)' }}>
              <FileText size={16} color="var(--accent)"/>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{fileName}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{rawRows.length} baris · {headers.length} kolom</p>
              </div>
            </div>

            <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>MAPPING KOLOM (WAJIB)</p>
              <SelectCol label="Kolom Tanggal *"    field="date" />
              <SelectCol label="Kolom Deskripsi *"  field="description" />
              <p className="text-[10px] pt-1 font-semibold" style={{ color: 'var(--text-muted)' }}>JUMLAH — pilih salah satu:</p>
              <SelectCol label="Kolom Jumlah (gabungan +/−)" field="amount" />
              <div className="grid grid-cols-2 gap-2">
                <SelectCol label="Kolom Debet (keluar)" field="debitAmount" />
                <SelectCol label="Kolom Kredit (masuk)" field="creditAmount" />
              </div>
              <SelectCol label="Kolom D/C marker (opsional)" field="isDebit" />
            </div>

            <div>
              <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>Default Wallet</label>
              <div className="flex gap-2">
                {WALLET_OPTIONS.map((w) => (
                  <button key={w.value} onClick={() => setWallet(w.value)}
                    className="flex-1 py-2 rounded-xl text-xs font-medium"
                    style={{
                      background: wallet === w.value ? 'var(--accent-dim)' : 'var(--surface-3)',
                      color:      wallet === w.value ? 'var(--accent)' : 'var(--text-secondary)',
                      border:    `1px solid ${wallet === w.value ? 'rgba(52,211,110,0.3)' : 'var(--border)'}`,
                    }}>
                    {w.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sample preview of first 3 rows */}
            {rawRows.length > 0 && mapping.date && (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <p className="text-[10px] px-3 py-2 font-semibold" style={{ color: 'var(--text-muted)', background: 'var(--surface-2)' }}>
                  PREVIEW 3 BARIS PERTAMA
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr style={{ background: 'var(--surface-3)' }}>
                        {headers.slice(0, 5).map((h) => (
                          <th key={h} className="px-2 py-1.5 text-left font-semibold"
                            style={{ color: Object.values(mapping).includes(h) ? 'var(--accent)' : 'var(--text-muted)' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rawRows.slice(0, 3).map((row, i) => (
                        <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                          {headers.slice(0, 5).map((h) => (
                            <td key={h} className="px-2 py-1.5 truncate max-w-[80px]"
                              style={{ color: 'var(--text-secondary)' }}>
                              {row[h] || '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={reset} className="flex-1 py-3 rounded-xl text-sm"
                style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                Batal
              </button>
              <button onClick={buildPreview}
                className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 text-sm">
                Preview Transaksi <ChevronRight size={15}/>
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: PREVIEW ── */}
        {step === 'preview' && (
          <motion.div key="preview" initial={{ opacity:0,x:20 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,x:-20 }}
            className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <AlertTriangle size={16} color="#f59e0b"/>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                <strong>{preview.length} transaksi</strong> siap diimport. Review sebelum simpan.
              </p>
            </div>

            {/* Transaction list */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', maxHeight: 320, overflowY: 'auto' }}>
              {preview.slice(0, 50).map((row, i) => (
                <div key={i}
                  className="flex items-center gap-3 px-3 py-2.5"
                  style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--surface-2)' : 'transparent' }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                    style={{ background: row.type === 'income' ? 'rgba(52,211,110,0.12)' : 'rgba(239,68,68,0.12)' }}>
                    {row.type === 'income' ? '↑' : '↓'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>{row.description || '—'}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {row.date} · {row.category}
                    </p>
                  </div>
                  <p className="text-xs font-bold font-mono flex-shrink-0"
                    style={{ color: row.type === 'income' ? 'var(--accent)' : 'var(--red)' }}>
                    {row.type === 'income' ? '+' : '-'}{formatCurrency(row.amount)}
                  </p>
                </div>
              ))}
              {preview.length > 50 && (
                <p className="text-center py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  +{preview.length - 50} baris lagi
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep('mapping')} className="flex-1 py-3 rounded-xl text-sm"
                style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                ← Edit Mapping
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 text-sm">
                {saving
                  ? <><RefreshCw size={14} className="animate-spin"/> Menyimpan...</>
                  : <><Check size={14}/> Simpan {preview.length} Transaksi</>
                }
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 4: DONE ── */}
        {step === 'done' && result && (
          <motion.div key="done" initial={{ opacity:0,scale:0.95 }} animate={{ opacity:1,scale:1 }}
            className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
              style={{ background: 'var(--accent-dim)' }}>
              <Check size={28} color="var(--accent)" />
            </div>
            <div>
              <p className="text-xl font-display font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Import Berhasil!</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {result.imported} transaksi berhasil, {result.skipped} dilewati
              </p>
            </div>
            <button onClick={reset} className="btn-primary px-6 py-2.5 mx-auto text-sm">
              Import File Lain
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}

const STEP_LABELS: Record<Step, string> = {
  upload:  'Upload File',
  mapping: 'Mapping Kolom',
  preview: 'Preview',
  done:    'Selesai',
}
type ImportStep = 'upload' | 'mapping' | 'preview' | 'done'
const STEP_ORDER: Step[] = ['upload', 'mapping', 'preview', 'done']
function steps_done(current: Step): Step[] {
  const idx = STEP_ORDER.indexOf(current)
  return STEP_ORDER.slice(0, idx)
}
