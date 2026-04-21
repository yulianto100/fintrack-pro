'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Upload, Check, RotateCcw, Loader2, Zap, AlertCircle } from 'lucide-react'
import { useApiList } from '@/hooks/useApiData'
import { formatCurrency } from '@/lib/utils'
import type { Category } from '@/types'
import toast from 'react-hot-toast'

interface ScanResult {
  amount:      number
  date:        string
  merchant:    string
  items:       string
  category:    string
  wallet:      string
  confidence:  number
  description: string
}

const WALLET_OPTS = [
  { value: 'cash',    label: '💵 Cash'    },
  { value: 'bank',    label: '🏦 Bank'    },
  { value: 'ewallet', label: '📱 E-Wallet' },
]

// Convert File to base64 — iOS-safe implementation
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result
      if (typeof result !== 'string') { reject(new Error('FileReader result bukan string')); return }
      // Remove data URL prefix: "data:image/jpeg;base64,XXXX" → "XXXX"
      const comma = result.indexOf(',')
      if (comma === -1) { reject(new Error('Format base64 tidak valid')); return }
      resolve(result.substring(comma + 1))
    }
    reader.onerror = () => reject(new Error('Gagal membaca file gambar'))
    reader.readAsDataURL(file)
  })
}

export default function ScanPage() {
  const { data: categories } = useApiList<Category>('/api/categories?type=expense')

  const [step,       setStep      ] = useState<'capture' | 'processing' | 'review' | 'done'>('capture')
  const [preview,    setPreview   ] = useState<string | null>(null)
  const [result,     setResult    ] = useState<ScanResult | null>(null)
  const [error,      setError     ] = useState<string | null>(null)
  const [saving,     setSaving    ] = useState(false)
  const [editAmount, setEditAmount] = useState('')
  const [editDate,   setEditDate  ] = useState('')
  const [editDesc,   setEditDesc  ] = useState('')
  const [editCat,    setEditCat   ] = useState('')
  const [editWallet, setEditWallet] = useState('bank')

  // Single input ref — avoids iOS issues with multiple refs
  const inputRef = useRef<HTMLInputElement>(null)

  const processImage = useCallback(async (file: File) => {
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('File harus berupa gambar (JPG, PNG, HEIC, dll)')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Ukuran gambar terlalu besar (max 10MB). Coba foto dengan resolusi lebih rendah.')
      return
    }

    setStep('processing')
    setError(null)

    // Create preview immediately
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)

    try {
      // iOS-safe base64 conversion
      const base64 = await fileToBase64(file)

      // Use image/jpeg as fallback for HEIC/HEIF (common on iPhone)
      const mimeType = file.type === 'image/heic' || file.type === 'image/heif'
        ? 'image/jpeg'
        : (file.type || 'image/jpeg')

      const resp = await fetch('/api/receipt/scan', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ image: base64, mimeType }),
      })

      const json = await resp.json()

      if (!json.success) throw new Error(json.error || 'Gagal memproses struk')

      const r = json.data as ScanResult
      setResult(r)
      setEditAmount(String(r.amount || ''))
      setEditDate(r.date || new Date().toISOString().split('T')[0])
      setEditDesc(r.description || '')
      setEditCat(r.category || 'Belanja')
      setEditWallet(r.wallet || 'bank')
      setStep('review')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses struk'
      setError(msg)
      setStep('capture')
    } finally {
      // Clean up object URL to prevent memory leak
      URL.revokeObjectURL(objectUrl)
    }
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processImage(file)
    // Reset input so same file can be selected again
    e.target.value = ''
  }, [processImage])

  const openCamera = () => {
    if (!inputRef.current) return
    // On iOS, removing capture attr allows gallery; adding it opens camera
    inputRef.current.setAttribute('capture', 'environment')
    inputRef.current.click()
  }

  const openGallery = () => {
    if (!inputRef.current) return
    inputRef.current.removeAttribute('capture')
    inputRef.current.click()
  }

  const handleSave = async () => {
    if (!editAmount || parseInt(editAmount) <= 0) { toast.error('Jumlah tidak valid'); return }
    setSaving(true)
    try {
      const cat = categories.find((c) =>
        c.name.toLowerCase() === editCat.toLowerCase() ||
        c.name.toLowerCase().includes(editCat.toLowerCase())
      ) || categories.find((c) => c.type === 'expense') || categories[0]

      const res  = await fetch('/api/transactions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:        'expense',
          amount:      parseInt(editAmount),
          categoryId:  cat?.id || '',
          description: editDesc,
          date:        editDate,
          wallet:      editWallet,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Transaksi berhasil disimpan! ✓')
      setStep('done')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setStep('capture'); setPreview(null); setResult(null); setError(null)
    setEditAmount(''); setEditDate(''); setEditDesc(''); setEditCat(''); setEditWallet('bank')
  }

  return (
    <div className="px-4 py-5 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>
          📸 Scan Struk
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Foto struk belanja → AI ekstrak otomatis → langsung jadi transaksi
        </p>
      </div>

      {/* Hidden file input — single input to avoid iOS issues */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,image/heic,image/heif"
        className="hidden"
        onChange={handleFileChange}
      />

      <AnimatePresence mode="wait">

        {/* ─── Capture ─── */}
        {step === 'capture' && (
          <motion.div key="capture"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            className="space-y-4">

            {error && (
              <div className="flex items-start gap-3 p-3.5 rounded-xl"
                style={{ background: 'var(--red-dim)', border: '1px solid rgba(252,129,129,0.25)' }}>
                <AlertCircle size={16} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />
                <p className="text-sm" style={{ color: 'var(--red)' }}>{error}</p>
              </div>
            )}

            {/* Camera button */}
            <button
              onClick={openCamera}
              className="w-full flex flex-col items-center justify-center gap-4 rounded-3xl transition-all active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, rgba(52,211,110,0.14), rgba(52,211,110,0.06))',
                border: '2px dashed rgba(52,211,110,0.35)',
                minHeight: 220, padding: '32px 24px',
              }}>
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#34d36e,#1fa855)', boxShadow: '0 8px 24px rgba(52,211,110,0.35)' }}>
                <Camera size={36} color="#fff" strokeWidth={1.8} />
              </div>
              <div className="text-center">
                <p className="font-display font-bold text-base mb-1" style={{ color: 'var(--text-primary)' }}>
                  Ambil Foto Struk
                </p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Gunakan kamera untuk foto langsung
                </p>
              </div>
            </button>

            {/* Gallery button */}
            <button
              onClick={openGallery}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl transition-all"
              style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <Upload size={18} />
              <span className="font-medium">Pilih dari Galeri</span>
            </button>

            <div className="flex items-center justify-center gap-2">
              <Zap size={13} color="#f6cc60" />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Diproses oleh Claude AI — akurasi tinggi
              </p>
            </div>

            <div className="glass-card p-4 space-y-2">
              <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Tips untuk hasil terbaik:</p>
              {[
                'Pastikan struk terlihat jelas & tidak blur',
                'Cahaya cukup, hindari bayangan di atas struk',
                'Foto seluruh struk termasuk bagian total',
              ].map((t) => (
                <div key={t} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--accent)' }} />
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ─── Processing ─── */}
        {step === 'processing' && (
          <motion.div key="processing"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 gap-6">
            {preview && (
              <div className="w-32 h-40 rounded-2xl overflow-hidden"
                style={{ border: '2px solid var(--accent)', boxShadow: '0 0 24px rgba(52,211,110,0.2)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="receipt" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Loader2 size={20} color="var(--accent)" className="animate-spin" />
                <p className="font-display font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Menganalisis struk...
                </p>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Claude AI sedang membaca dan mengekstrak data
              </p>
            </div>
          </motion.div>
        )}

        {/* ─── Review ─── */}
        {step === 'review' && result && (
          <motion.div key="review"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            className="space-y-4">

            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Data terdeteksi</p>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{
                  background: result.confidence >= 0.7 ? 'rgba(52,211,110,0.12)' : 'rgba(246,204,96,0.12)',
                  border: `1px solid ${result.confidence >= 0.7 ? 'rgba(52,211,110,0.3)' : 'rgba(246,204,96,0.3)'}`,
                }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: result.confidence >= 0.7 ? 'var(--accent)' : '#f6cc60' }} />
                <p className="text-xs font-medium" style={{ color: result.confidence >= 0.7 ? 'var(--accent)' : '#f6cc60' }}>
                  {Math.round(result.confidence * 100)}% akurasi
                </p>
              </div>
            </div>

            <div className="glass-card p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: 'var(--accent-dim)' }}>🏪</div>
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{result.merchant}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{result.category} · {result.date}</p>
              </div>
            </div>

            <div className="glass-card p-4 space-y-4">
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                  Total Belanja (Rp) <span style={{ color: 'var(--accent)' }}>*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold"
                    style={{ color: 'var(--red)' }}>Rp</span>
                  <input type="number" className="input-glass text-lg font-bold"
                    style={{ paddingLeft: '3rem', color: 'var(--red)' }}
                    value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
                </div>
                {parseInt(editAmount || '0') > 0 && (
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {formatCurrency(parseInt(editAmount))}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Tanggal</label>
                <input type="date" className="input-glass"
                  value={editDate} onChange={(e) => setEditDate(e.target.value)} />
              </div>

              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Keterangan</label>
                <input type="text" className="input-glass"
                  value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
              </div>

              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Kategori</label>
                <select className="input-glass"
                  value={editCat} onChange={(e) => setEditCat(e.target.value)}>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Wallet</label>
                <div className="flex gap-2">
                  {WALLET_OPTS.map((w) => (
                    <button key={w.value} onClick={() => setEditWallet(w.value)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                      style={{
                        background: editWallet === w.value ? 'var(--accent-dim)' : 'var(--surface-3)',
                        border: `1px solid ${editWallet === w.value ? 'rgba(52,211,110,0.4)' : 'var(--border)'}`,
                        color: editWallet === w.value ? 'var(--accent)' : 'var(--text-muted)',
                      }}>
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={reset} className="btn-ghost flex items-center justify-center gap-2 py-3.5">
                <RotateCcw size={16} /> Scan Ulang
              </button>
              <button onClick={handleSave} disabled={saving}
                className="btn-primary flex items-center justify-center gap-2 py-3.5">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} /> Simpan</>}
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── Done ─── */}
        {step === 'done' && (
          <motion.div key="done"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16 gap-6 text-center">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{ background: 'rgba(52,211,110,0.15)', border: '2px solid rgba(52,211,110,0.4)' }}>
              <Check size={36} color="var(--accent)" strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-display font-bold text-xl mb-2" style={{ color: 'var(--text-primary)' }}>
                Transaksi Tersimpan!
              </p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {parseInt(editAmount || '0') > 0 ? formatCurrency(parseInt(editAmount)) : ''} berhasil dicatat
              </p>
            </div>
            <button onClick={reset} className="btn-primary px-8 py-3 flex items-center gap-2">
              <Camera size={18} /> Scan Struk Lagi
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
