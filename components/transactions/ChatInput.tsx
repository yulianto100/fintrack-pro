'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageCircle, Send, X, Check, Edit3, Sparkles,
  ArrowDownCircle, ArrowUpCircle, ArrowLeftRight,
  Wallet, Calendar, Tag,
} from 'lucide-react'
import { parseNaturalLanguage, NLP_EXAMPLES } from '@/lib/nlp-parser'
import { autoCategorize, suggestCategory } from '@/lib/categorization'
import { useTransactions } from '@/hooks/useTransactions'
import { useApiList } from '@/hooks/useApiData'
import type { Category, TransactionType, WalletType } from '@/types'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

// ── Types ────────────────────────────────────────────────────────────────────

interface ParsedPreview {
  type: TransactionType
  amount: number
  description: string
  date: string
  wallet?: WalletType
  categoryId?: string
  categoryName?: string
  categoryIcon?: string
  confidence: number
}

// ── Component ────────────────────────────────────────────────────────────────

export function ChatInput() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [preview, setPreview] = useState<ParsedPreview | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showExamples, setShowExamples] = useState(true)
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { addTransaction } = useTransactions()
  const { data: categories } = useApiList<Category>('/api/categories')

  useEffect(() => {
    setMounted(true)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [isOpen])

  // Parse input on change
  const handleInputChange = useCallback((value: string) => {
    setInput(value)
    setError('')
    setShowExamples(value.length === 0)

    if (value.trim().length < 3) {
      setPreview(null)
      return
    }

    const result = parseNaturalLanguage(value)

    if (result.success && result.data) {
      const { type, amount, description, date, wallet, confidence } = result.data

      // Try to auto-categorize
      const txType = type === 'transfer' ? 'expense' : type
      const categoryId = autoCategorize(description, categories, txType as 'income' | 'expense')
      const category = categories.find((c) => c.id === categoryId)

      setPreview({
        type,
        amount,
        description,
        date,
        wallet,
        categoryId: categoryId || undefined,
        categoryName: category?.name,
        categoryIcon: category?.icon,
        confidence,
      })
    } else {
      setPreview(null)
      if (value.length >= 5) {
        setError(result.error || '')
      }
    }
  }, [categories])

  // Submit transaction
  const handleSubmit = useCallback(async () => {
    if (!preview) return

    setSaving(true)
    try {
      await addTransaction({
        type: preview.type,
        amount: preview.amount,
        description: preview.description,
        date: preview.date,
        wallet: preview.wallet || 'cash',
        categoryId: preview.categoryId || '',
      })

      toast.success(
        `✨ ${preview.type === 'income' ? 'Pemasukan' : 'Pengeluaran'} ${formatCurrency(preview.amount)} tercatat!`,
        { duration: 3000 }
      )

      // Reset
      setInput('')
      setPreview(null)
      setIsOpen(false)
    } catch {
      // Error already handled by useTransactions
    } finally {
      setSaving(false)
    }
  }, [preview, addTransaction])

  // Handle enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && preview && !saving) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  // Use example
  const handleExampleClick = (example: string) => {
    setInput(example)
    handleInputChange(example)
    setShowExamples(false)
    inputRef.current?.focus()
  }

  return (
    <>
      {/* Trigger Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            type="button"
            onClick={() => setIsOpen(true)}
            className="fixed left-5 z-50 flex h-11 w-11 items-center justify-center rounded-full sm:h-12 sm:w-auto sm:gap-2 sm:px-4 sm:py-3"
            style={{
              bottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom,0px) + 28px)',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
            }}
            aria-label="Input cepat dengan chat"
          >
            <Sparkles size={18} strokeWidth={2.2} />
            <span className="hidden text-xs font-semibold sm:inline">Chat</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      {mounted && createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
              />

              {/* Panel */}
              <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-[61] rounded-t-3xl p-5 pb-8"
              style={{
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                borderBottom: 'none',
                boxShadow: '0 -20px 48px rgba(15,23,42,0.18)',
                maxHeight: '80vh',
                overflowY: 'auto',
              }}
            >
              {/* Header */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ background: 'rgba(99,102,241,0.15)' }}
                  >
                    <Sparkles size={16} style={{ color: '#818cf8' }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Input Cepat AI
                    </h3>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      Ketik natural, langsung tercatat
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ background: 'var(--surface-3)' }}
                  aria-label="Tutup"
                >
                  <X size={16} style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>

              {/* Input */}
              <div
                className="flex items-center gap-2 rounded-2xl px-4 py-3"
                style={{
                  background: 'var(--surface-3)',
                  border: `1.5px solid ${preview ? 'rgba(99,102,241,0.5)' : 'var(--border)'}`,
                  transition: 'border-color 0.2s',
                }}
              >
                <MessageCircle size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Makan siang 35rb..."
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: 'var(--text-primary)' }}
                  autoComplete="off"
                />
                {input && (
                  <button
                    type="button"
                    onClick={() => { setInput(''); setPreview(null); setError(''); setShowExamples(true) }}
                    className="flex h-6 w-6 items-center justify-center rounded-full"
                    style={{ background: 'var(--surface-2)' }}
                  >
                    <X size={12} style={{ color: 'var(--text-muted)' }} />
                  </button>
                )}
              </div>

              {/* Error */}
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-xs"
                  style={{ color: '#f87171' }}
                >
                  {error}
                </motion.p>
              )}

              {/* Examples */}
              <AnimatePresence>
                {showExamples && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 overflow-hidden"
                  >
                    <p className="mb-2 text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
                      Contoh input:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {NLP_EXAMPLES.slice(0, 6).map((ex) => (
                        <button
                          key={ex}
                          type="button"
                          onClick={() => handleExampleClick(ex)}
                          className="rounded-full px-3 py-1.5 text-[11px] font-medium transition-all hover:scale-105"
                          style={{
                            background: 'var(--surface-3)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {ex}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Preview Card */}
              <AnimatePresence>
                {preview && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="mt-4 rounded-2xl p-4"
                    style={{
                      background: 'var(--surface-1)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {/* Type & Amount */}
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TypeBadge type={preview.type} />
                        <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                          {formatCurrency(preview.amount)}
                        </span>
                      </div>
                      <ConfidenceBadge confidence={preview.confidence} />
                    </div>

                    {/* Details */}
                    <div className="space-y-2">
                      <DetailRow
                        icon={<Edit3 size={13} />}
                        label="Deskripsi"
                        value={preview.description}
                      />
                      {preview.categoryName && (
                        <DetailRow
                          icon={<Tag size={13} />}
                          label="Kategori"
                          value={`${preview.categoryIcon || '📋'} ${preview.categoryName}`}
                        />
                      )}
                      <DetailRow
                        icon={<Calendar size={13} />}
                        label="Tanggal"
                        value={formatDateDisplay(preview.date)}
                      />
                      {preview.wallet && (
                        <DetailRow
                          icon={<Wallet size={13} />}
                          label="Wallet"
                          value={preview.wallet === 'cash' ? '💵 Cash' : preview.wallet === 'bank' ? '🏦 Bank' : '📱 E-Wallet'}
                        />
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={saving}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
                        style={{
                          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                          color: '#fff',
                          boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
                        }}
                      >
                        {saving ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Check size={16} strokeWidth={2.5} />
                            Simpan
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPreview(null); setInput(''); setShowExamples(true) }}
                        className="flex items-center justify-center rounded-xl px-4 py-3 text-sm font-medium"
                        style={{
                          background: 'var(--surface-3)',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        Batal
                      </button>
                    </div>

                    {!preview.categoryName && (
                      <p className="mt-2 text-center text-[11px]" style={{ color: '#fbbf24' }}>
                        ⚠️ Kategori tidak terdeteksi — akan disimpan tanpa kategori
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: TransactionType }) {
  const config = {
    expense: { icon: <ArrowDownCircle size={14} />, label: 'Keluar', bg: 'rgba(248,113,113,0.15)', color: '#f87171' },
    income: { icon: <ArrowUpCircle size={14} />, label: 'Masuk', bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
    transfer: { icon: <ArrowLeftRight size={14} />, label: 'Transfer', bg: 'rgba(96,165,250,0.15)', color: '#60a5fa' },
    credit_expense: { icon: <ArrowDownCircle size={14} />, label: 'Kredit', bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
  }

  const c = config[type] || config.expense

  return (
    <span
      className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold"
      style={{ background: c.bg, color: c.color }}
    >
      {c.icon}
      {c.label}
    </span>
  )
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100)
  const color = pct >= 80 ? '#4ade80' : pct >= 60 ? '#fbbf24' : '#f87171'

  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ background: `${color}20`, color }}
    >
      {pct}% yakin
    </span>
  )
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{label}:</span>
      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}

function formatDateDisplay(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  if (dateStr === today) return 'Hari ini'
  if (dateStr === yesterday) return 'Kemarin'

  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
