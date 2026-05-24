'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApiList } from '@/hooks/useApiData'
import { formatCurrency } from '@/lib/utils'
import type { Transaction, TransactionTemplate } from '@/types'

function isTemplateCandidate(tx: Transaction): tx is Transaction & { type: 'income' | 'expense' } {
  return tx.type === 'income' || tx.type === 'expense'
}

export function QuickTemplates() {
  const { data: templates, refetch } = useApiList<TransactionTemplate>('/api/templates', { refreshMs: 30000 })
  const { data: recentTx } = useApiList<Transaction>('/api/transactions?limit=20', { refreshMs: 60000 })
  const [showPicker, setShowPicker] = useState(false)
  const [longPressId, setLongPressId] = useState<string | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTriggered = useRef(false)

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const handleUse = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/templates/${id}/use`, { method: 'POST' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Gagal memakai pintasan')

      const template = templates.find((item) => item.id === id)
      toast.success(`Transaksi "${template?.description || template?.categoryName || 'pintasan'}" ditambahkan ✓`)
      refetch()
      fetch('/api/wallet-accounts/sync', { method: 'POST' }).catch(() => {})
      fetch('/api/streak', { method: 'POST' }).catch(() => {})
      window.dispatchEvent(new Event('fintrack:wallet-updated'))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal memakai pintasan')
    }
  }, [refetch, templates])

  const handleDelete = useCallback(async (id: string) => {
    setLongPressId(null)
    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Gagal menghapus pintasan')
      toast.success('Pintasan dihapus')
      refetch()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus')
    }
  }, [refetch])

  const candidates = useMemo(() => {
    const seen = new Set<string>()
    const list: Transaction[] = []

    for (const tx of recentTx) {
      if (!isTemplateCandidate(tx)) continue
      const description = (tx.description || '').toLowerCase()
      const key = `${tx.type}|${tx.categoryId}|${tx.amount}|${description}`
      if (seen.has(key)) continue
      seen.add(key)

      const alreadySaved = templates.some((template) =>
        template.type === tx.type &&
        template.categoryId === tx.categoryId &&
        template.amount === tx.amount &&
        template.description.toLowerCase() === description
      )
      if (alreadySaved) continue

      list.push(tx)
      if (list.length >= 5) break
    }

    return list
  }, [recentTx, templates])

  const handleAddFromCandidate = useCallback(async (tx: Transaction) => {
    if (!isTemplateCandidate(tx)) return

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: tx.type,
          amount: tx.amount,
          categoryId: tx.categoryId,
          categoryName: tx.categoryName,
          categoryIcon: tx.categoryIcon,
          description: tx.description,
          wallet: tx.wallet,
          walletAccountId: tx.walletAccountId,
          emoji: tx.categoryIcon,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Gagal membuat pintasan')
      toast.success('Pintasan dibuat ✓')
      setShowPicker(false)
      refetch()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat pintasan')
    }
  }, [refetch])

  const handlePointerDown = useCallback((id: string) => {
    longPressTriggered.current = false
    clearLongPressTimer()
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true
      setLongPressId(id)
      navigator.vibrate?.(15)
    }, 500)
  }, [clearLongPressTimer])

  const handleTemplateClick = useCallback((id: string) => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false
      return
    }
    void handleUse(id)
  }, [handleUse])

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Pintasan Cepat</p>
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-1 text-xs font-semibold"
          style={{ color: 'var(--accent)' }}
        >
          <Plus size={13} /> Tambah
        </button>
      </div>

      {templates.length === 0 ? (
        <div
          className="rounded-2xl px-4 py-5 text-center"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
        >
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Belum ada pintasan. Tambah dari transaksi terakhir.
          </p>
        </div>
      ) : (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
          {templates.map((template) => (
            <motion.button
              key={template.id}
              type="button"
              onPointerDown={() => handlePointerDown(template.id)}
              onPointerUp={clearLongPressTimer}
              onPointerLeave={clearLongPressTimer}
              onPointerCancel={clearLongPressTimer}
              onClick={() => handleTemplateClick(template.id)}
              whileTap={{ scale: 0.94 }}
              className="flex flex-shrink-0 items-center gap-2 rounded-2xl px-3 py-2.5"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                minWidth: 130,
              }}
            >
              <span className="text-xl">{template.emoji}</span>
              <div className="min-w-0 text-left">
                <p className="max-w-[92px] truncate text-[12px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {template.description || template.categoryName}
                </p>
                <p
                  className="text-[10px] font-semibold"
                  style={{ color: template.type === 'income' ? 'var(--accent)' : 'var(--red)' }}
                >
                  {template.type === 'income' ? '+' : '-'}{formatCurrency(template.amount)}
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {longPressId && (
          <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setLongPressId(null)}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,0.5)' }}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="relative w-full max-w-md space-y-2 rounded-t-3xl p-5"
              style={{ background: 'var(--surface-modal)', border: '1px solid var(--border)' }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => { void handleDelete(longPressId) }}
                className="flex w-full items-center gap-2 rounded-xl p-3"
                style={{ background: 'var(--red-dim)', color: 'var(--red)' }}
              >
                <Trash2 size={15} /> Hapus pintasan
              </button>
              <button
                type="button"
                onClick={() => setLongPressId(null)}
                className="w-full rounded-xl p-3 text-sm font-semibold"
                style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}
              >
                Batal
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPicker && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
              onClick={() => setShowPicker(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="relative mx-auto w-full max-w-md rounded-t-3xl p-5 sm:rounded-3xl"
              style={{ background: 'var(--surface-modal)', border: '1px solid var(--border)' }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  Pilih dari transaksi terakhir
                </h2>
                <button
                  type="button"
                  onClick={() => setShowPicker(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
                  aria-label="Tutup pilihan pintasan"
                >
                  <X size={16} />
                </button>
              </div>

              {candidates.length === 0 ? (
                <p className="py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  Tidak ada kandidat. Tambah transaksi dulu.
                </p>
              ) : (
                <div className="space-y-2">
                  {candidates.map((candidate) => (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => { void handleAddFromCandidate(candidate) }}
                      className="flex w-full items-center gap-3 rounded-xl p-3 text-left"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                    >
                      <span className="text-xl">{candidate.categoryIcon || '📋'}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {candidate.description || candidate.categoryName}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {candidate.categoryName}
                        </p>
                      </div>
                      <p
                        className="text-sm font-bold"
                        style={{ color: candidate.type === 'income' ? 'var(--accent)' : 'var(--red)' }}
                      >
                        {candidate.type === 'income' ? '+' : '-'}{formatCurrency(candidate.amount)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  )
}
