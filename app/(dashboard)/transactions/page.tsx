'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, Search, SlidersHorizontal, X, ChevronDown, Tag, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTransactions }    from '@/hooks/useTransactions'
import { useBalanceVisibility } from '@/hooks/useBalanceVisibility'
import { useApiList }          from '@/hooks/useApiData'
import { TransactionModal }    from '@/components/transactions/TransactionModal'
import { TransactionGroup }    from '@/components/transactions/TransactionGroup'
import { SummaryCards }        from '@/components/transactions/SummaryCards'
import { SmartInsight }        from '@/components/transactions/SmartInsight'
import { SpendingHeatmap }     from '@/components/transactions/SpendingHeatmap'
import { EmptyState }          from '@/components/transactions/EmptyState'
import { FloatingActionButton } from '@/components/transactions/FloatingActionButton'
import { ChatInput } from '@/components/transactions/ChatInput'
import { EmptyHint } from '@/components/shared/EmptyHint'
import { SkeletonRow } from '@/components/shared/Skeleton'
import type { Transaction, Category, TransactionType } from '@/types'
import { toastConfirm } from '@/lib/toast-undo'
import { useRefreshContext } from '../refresh-context'
import { haptics } from '@/lib/haptics'

// ─── Month picker helper ──────────────────────────────────────────────────────

function buildMonthOptions() {
  const opts: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const val   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    opts.push({ value: val, label })
  }
  return opts
}

// ─── Filter chip ─────────────────────────────────────────────────────────────

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{
        background: 'rgba(34,197,94,0.12)',
        border:     '1px solid rgba(34,197,94,0.25)',
        color:      'var(--accent)',
      }}
    >
      {label}
      <button onClick={() => {
        haptics.light()
        onRemove()
      }} className="opacity-70 hover:opacity-100">
        <X size={10} strokeWidth={2.5} />
      </button>
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function FilterButton({
  active,
  count,
  onClick,
}: {
  active: boolean
  count: number
  onClick: () => void
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="relative flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold"
      style={{
        background: active ? 'rgba(34,197,94,0.13)' : 'var(--surface-2)',
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
        border: `1px solid ${active ? 'rgba(34,197,94,0.34)' : 'var(--border)'}`,
        boxShadow: active ? '0 8px 22px rgba(34,197,94,0.10)' : 'none',
        transition: 'all 0.15s',
      }}
    >
      <SlidersHorizontal size={13} />
      <span>{count > 0 ? `Filter · ${count}` : 'Filter'}</span>
      {count > 0 && (
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
      )}
    </motion.button>
  )
}

function TransactionSearchBar({
  value,
  onChange,
  onClear,
}: {
  value: string
  onChange: (value: string) => void
  onClear: () => void
}) {
  return (
    <div className="relative">
      <Search
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2"
        style={{ color: 'var(--text-muted)' }}
      />
      <input
        type="text"
        placeholder="Cari transaksi..."
        value={value}
        onChange={event => onChange(event.target.value)}
        className="w-full rounded-xl py-2.5 pl-9 pr-9 text-sm"
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
          outline: 'none',
        }}
      />
      {value && (
        <button
          className="absolute right-3 top-1/2 -translate-y-1/2"
          onClick={onClear}
          style={{ color: 'var(--text-muted)' }}
          aria-label="Hapus pencarian"
        >
          <X size={13} />
        </button>
      )}
    </div>
  )
}

export default function TransactionsPage() {
  const { hidden }   = useBalanceVisibility()
  const { setHandler } = useRefreshContext()
  const searchParams = useSearchParams()
  const focusId = searchParams.get('focus')
  const {
    transactions,
    allTransactions,
    loading,
    error,
    filters,
    setFilters,
    clearFilters,
    hasActiveFilter,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    deleteTransaction,
    refetch,
  } = useTransactions()

  const { data: categories } = useApiList<Category>('/api/categories')
  const { data: recentTags } = useApiList<{ tag: string; count: number }>('/api/tags/recent', { refreshMs: 60000 })

  useEffect(() => {
    setHandler(async () => {
      refetch()
    })
    return () => setHandler(null)
  }, [refetch, setHandler])

  // Modal state
  const [modalOpen,    setModalOpen   ] = useState(false)
  const [editTx,       setEditTx      ] = useState<Transaction | undefined>()
  const [defaultType,  setDefaultType ] = useState<TransactionType>('expense')

  // Filter panel
  const [filterOpen,   setFilterOpen  ] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkCategoryPicker, setShowBulkCategoryPicker] = useState(false)
  const [optimisticHiddenIds, setOptimisticHiddenIds] = useState<Set<string>>(new Set())
  const monthOptions = useMemo(buildMonthOptions, [])

  const displayedTransactions = useMemo(
    () => optimisticHiddenIds.size > 0
      ? transactions.filter((transaction) => !optimisticHiddenIds.has(transaction.id))
      : transactions,
    [transactions, optimisticHiddenIds],
  )

  useEffect(() => {
    if (!focusId) return
    const element = Array.from(document.querySelectorAll<HTMLElement>('[data-tx-id]'))
      .find((node) => node.dataset.txId === focusId)
    if (!element) return

    element.scrollIntoView({ block: 'center', behavior: 'smooth' })
    element.classList.add('finuvo-focus-flash')
    const timer = window.setTimeout(() => element.classList.remove('finuvo-focus-flash'), 1500)
    return () => window.clearTimeout(timer)
  }, [displayedTransactions, focusId])

  // ── FAB handlers ─────────────────────────────────────────────────────────────

  const openAdd = useCallback((type: TransactionType) => {
    setEditTx(undefined)
    setDefaultType(type)
    setModalOpen(true)
  }, [])

  const openEdit = useCallback((t: Transaction) => {
    setEditTx(t)
    setDefaultType(t.type)
    setModalOpen(true)
  }, [])

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const enterSelectionMode = useCallback((firstId: string) => {
    setSelectionMode(true)
    setSelectedIds(new Set([firstId]))
  }, [])

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false)
    setSelectedIds(new Set())
  }, [])

  const handleModalClose = useCallback(() => {
    setModalOpen(false)
    setEditTx(undefined)
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    await deleteTransaction(id)
  }, [deleteTransaction])

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return

    const ids = Array.from(selectedIds)
    toastConfirm(`Hapus ${ids.length} transaksi?`, () => {
      const run = async () => {
        setOptimisticHiddenIds(new Set(ids))
        exitSelectionMode()
        try {
          const res = await fetch('/api/transactions/bulk', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids }),
          })
          const json = await res.json()
          if (!json.success) throw new Error(json.error || 'Gagal hapus')

          const deleted = typeof json.data?.deleted === 'number' ? json.data.deleted : ids.length
          toast.success(`${deleted} transaksi dihapus ✓`)
          refetch()
        } catch (err: unknown) {
          setOptimisticHiddenIds(new Set())
          toast.error(err instanceof Error ? err.message : 'Gagal hapus')
        }
      }

      void run()
    }, { confirmLabel: 'Hapus' })
  }, [selectedIds, exitSelectionMode, refetch])

  const handleBulkRecategorize = useCallback(() => {
    if (selectedIds.size === 0) return
    setShowBulkCategoryPicker(true)
  }, [selectedIds.size])

  const handleApplyBulkCategory = useCallback(async (categoryId: string) => {
    setShowBulkCategoryPicker(false)
    if (selectedIds.size === 0) return

    const ids = Array.from(selectedIds)
    const count = ids.length
    exitSelectionMode()

    try {
      const res = await fetch('/api/transactions/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, categoryId }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Gagal mengubah kategori')

      const updated = typeof json.data?.updated === 'number' ? json.data.updated : count
      toast.success(`${updated} transaksi diperbarui ✓`)
      refetch()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengubah kategori')
    }
  }, [selectedIds, exitSelectionMode, refetch])

  // ── Active filter chips ───────────────────────────────────────────────────────

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; remove: () => void }[] = []
    if (filters.month) {
      const opt = monthOptions.find(o => o.value === filters.month)
      chips.push({ key: 'month', label: opt?.label ?? filters.month, remove: () => setFilters({ ...filters, month: undefined }) })
    }
    if (filters.type) {
      const typeLabels: Record<TransactionType, string> = {
        income: 'Pemasukan',
        expense: 'Pengeluaran',
        transfer: 'Transfer',
        credit_expense: 'Kartu Kredit',
        loan_given: 'Piutang Diberikan',
        loan_repayment: 'Bayar Piutang',
        loan_writeoff: 'Piutang Dihapuskan',
      }
      const label = typeLabels[filters.type]
      chips.push({ key: 'type', label, remove: () => setFilters({ ...filters, type: undefined }) })
    }
    if (filters.categoryId) {
      const cat = categories?.find(c => c.id === filters.categoryId)
      chips.push({ key: 'cat', label: cat?.name ?? 'Kategori', remove: () => setFilters({ ...filters, categoryId: undefined }) })
    }
    if (filters.wallet) {
      const walletLabel = filters.wallet === 'cash' ? 'Cash' : filters.wallet === 'bank' ? 'Bank' : 'E-Wallet'
      chips.push({ key: 'wallet', label: walletLabel, remove: () => setFilters({ ...filters, wallet: undefined }) })
    }
    if (filters.date) {
      const formatted = new Date(filters.date).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
      chips.push({ key: 'date', label: formatted, remove: () => setFilters({ ...filters, date: undefined }) })
    }
    if (filters.tags && filters.tags.length > 0) {
      filters.tags.forEach((tag) => {
        chips.push({
          key: `tag-${tag}`,
          label: `#${tag}`,
          remove: () => setFilters((prev) => ({ ...prev, tags: prev.tags?.filter((item) => item !== tag) })),
        })
      })
    }
    return chips
  }, [filters, monthOptions, categories, setFilters])

  const activeFilterCount = activeChips.length
  const filterIsActive = filterOpen || activeFilterCount > 0
  const hasSearchQuery = searchQuery.trim().length > 0
  const isInitialLoading = loading && allTransactions.length === 0
  const showError = !!error && allTransactions.length === 0
  const showFilteredEmpty = !loading && displayedTransactions.length === 0 && (hasActiveFilter || hasSearchQuery)
  const resetFiltersAndSearch = useCallback(() => {
    clearFilters()
    setSearchQuery('')
  }, [clearFilters, setSearchQuery])

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-full" style={{ background: 'var(--surface-0)' }}>

      {selectionMode && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="sticky top-0 z-30 flex items-center gap-2 px-4 py-3"
          style={{ background: 'var(--surface-0)', borderBottom: '1px solid var(--border)' }}
        >
          <button
            type="button"
            onClick={exitSelectionMode}
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}
            aria-label="Batalkan pilihan"
          >
            <X size={16} />
          </button>
          <p className="flex-1 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            {selectedIds.size} dipilih
          </p>
          <button
            type="button"
            onClick={handleBulkRecategorize}
            disabled={selectedIds.size === 0}
            className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold"
            style={{
              background: 'var(--accent-dim)',
              color: 'var(--accent)',
              opacity: selectedIds.size === 0 ? 0.55 : 1,
            }}
          >
            <Tag size={13} /> Kategori
          </button>
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={selectedIds.size === 0}
            className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold"
            style={{
              background: 'rgba(248,113,113,0.14)',
              color: 'var(--red)',
              opacity: selectedIds.size === 0 ? 0.55 : 1,
            }}
          >
            <Trash2 size={13} /> Hapus
          </button>
        </motion.div>
      )}

      {/* ── Header ── */}
      {!selectionMode && (
      <div
        className="px-4 pt-3 pb-3"
        style={{
          background:         'var(--surface-0)',
          borderBottom:       '1px solid var(--border)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-0.5"
              style={{ color: 'var(--text-muted)' }}>
              Riwayat
            </p>
            <h1 className="text-[22px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
              Transaksi
            </h1>
          </div>

          <FilterButton
            active={filterIsActive}
            count={activeFilterCount}
            onClick={() => setFilterOpen(o => !o)}
          />
        </div>

        {/* Search bar */}
        <TransactionSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery('')}
        />

        {/* Filter panel */}
        <AnimatePresence>
          {filterOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -4 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{    opacity: 0, height: 0,      y: -4 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-2.5 pt-3">
                {/* Month */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                    style={{ color: 'var(--text-muted)' }}>
                    Periode
                  </p>
                  <div className="relative">
                    <select
                      value={filters.month ?? ''}
                      onChange={e => setFilters({ ...filters, month: e.target.value || undefined })}
                      className="w-full appearance-none px-3 py-2 pr-8 rounded-xl text-sm"
                      style={{
                        background: 'var(--surface-2)',
                        border:     '1px solid var(--border)',
                        color:      'var(--text-primary)',
                        outline:    'none',
                      }}
                    >
                      <option value="">Semua bulan</option>
                      {monthOptions.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: 'var(--text-muted)' }} />
                  </div>
                </div>

                {/* Type */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                    style={{ color: 'var(--text-muted)' }}>
                    Jenis
                  </p>
                  <div className="flex gap-2">
                    {(['income', 'expense', 'transfer'] as TransactionType[]).map(t => {
                      const labels: Record<TransactionType, string> = {
                        income: 'Pemasukan', expense: 'Pengeluaran', transfer: 'Transfer', credit_expense: 'Kartu Kredit',
                        loan_given: 'Piutang Diberikan', loan_repayment: 'Bayar Piutang', loan_writeoff: 'Piutang Dihapuskan'
                      }
                      const active = filters.type === t
                      return (
                        <motion.button
                          key={t}
                          whileTap={{ scale: 0.94 }}
                          onClick={() => {
                            haptics.light()
                            setFilters({ ...filters, type: active ? undefined : t })
                          }}
                          className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                          style={{
                            background: active ? 'rgba(34,197,94,0.15)' : 'var(--surface-2)',
                            border:     `1px solid ${active ? 'rgba(34,197,94,0.30)' : 'var(--border)'}`,
                            color:      active ? 'var(--accent)' : 'var(--text-secondary)',
                          }}
                        >
                          {labels[t]}
                        </motion.button>
                      )
                    })}
                  </div>
                </div>

                {/* Category */}
                {categories && categories.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                      style={{ color: 'var(--text-muted)' }}>
                      Kategori
                    </p>
                    <div className="relative">
                      <select
                        value={filters.categoryId ?? ''}
                        onChange={e => setFilters({ ...filters, categoryId: e.target.value || undefined })}
                        className="w-full appearance-none px-3 py-2 pr-8 rounded-xl text-sm"
                        style={{
                          background: 'var(--surface-2)',
                          border:     '1px solid var(--border)',
                          color:      'var(--text-primary)',
                          outline:    'none',
                        }}
                      >
                        <option value="">Semua kategori</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </div>
                )}

                {/* Wallet */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                    style={{ color: 'var(--text-muted)' }}>
                    Wallet
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'cash' as const, label: 'Cash' },
                      { value: 'bank' as const, label: 'Bank' },
                      { value: 'ewallet' as const, label: 'E-Wallet' },
                    ].map(wallet => {
                      const active = filters.wallet === wallet.value
                      return (
                        <motion.button
                          key={wallet.value}
                          whileTap={{ scale: 0.94 }}
                          onClick={() => {
                            haptics.light()
                            setFilters({ ...filters, wallet: active ? undefined : wallet.value })
                          }}
                          className="py-2 rounded-xl text-xs font-semibold transition-all"
                          style={{
                            background: active ? 'rgba(34,197,94,0.15)' : 'var(--surface-2)',
                            border:     `1px solid ${active ? 'rgba(34,197,94,0.30)' : 'var(--border)'}`,
                            color:      active ? 'var(--accent)' : 'var(--text-secondary)',
                          }}
                        >
                          {wallet.label}
                        </motion.button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                    style={{ color: 'var(--text-muted)' }}>
                    Urutkan
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'date_desc' as const, label: 'Terbaru' },
                      { value: 'date_asc' as const, label: 'Terlama' },
                      { value: 'amount_desc' as const, label: 'Terbesar' },
                      { value: 'amount_asc' as const, label: 'Terkecil' },
                    ].map((option) => {
                      const active = sortBy === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setSortBy(option.value)}
                          className="py-2 rounded-xl text-xs font-semibold transition-all"
                          style={{
                            background: active ? 'var(--accent-dim)' : 'var(--surface-2)',
                            border: `1px solid ${active ? 'var(--border-hover)' : 'var(--border)'}`,
                            color: active ? 'var(--accent)' : 'var(--text-secondary)',
                          }}
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {recentTags.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                      style={{ color: 'var(--text-muted)' }}>
                      Tag
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {recentTags.slice(0, 12).map((recent) => {
                        const active = filters.tags?.includes(recent.tag) ?? false
                        return (
                          <button
                            key={recent.tag}
                            type="button"
                            onClick={() => {
                              haptics.light()
                              setFilters((prev) => {
                                const current = prev.tags || []
                                return {
                                  ...prev,
                                  tags: active
                                    ? current.filter((tag) => tag !== recent.tag)
                                    : [...current, recent.tag],
                                }
                              })
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                            style={{
                              background: active ? 'var(--accent-dim)' : 'var(--surface-2)',
                              border: `1px solid ${active ? 'var(--border-hover)' : 'var(--border)'}`,
                              color: active ? 'var(--accent)' : 'var(--text-secondary)',
                            }}
                          >
                            #{recent.tag}
                            <span className="ml-1 opacity-60">{recent.count}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Clear filters */}
                {hasActiveFilter && (
                  <button
                    onClick={clearFilters}
                    className="text-xs font-semibold py-1.5 rounded-xl transition-opacity hover:opacity-70"
                    style={{ color: 'var(--red)' }}
                  >
                    Reset semua filter
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active filter chips */}
        <AnimatePresence>
          {activeChips.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{    opacity: 0, height: 0      }}
              className="flex flex-wrap gap-1.5 pt-2 overflow-hidden"
            >
              {activeChips.map(chip => (
                <FilterChip key={chip.key} label={chip.label} onRemove={chip.remove} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      )}

      {/* ── Body ── */}
      <div className="flex flex-col gap-3 px-4 pt-3 pb-8">
        <SpendingHeatmap
          transactions={allTransactions}
          hidden={hidden}
          selectedDate={filters.date}
          onSelectDate={(date) => setFilters({ ...filters, date })}
        />

        {/* Summary cards */}
        <SummaryCards
          allTransactions={allTransactions}
          filters={filters}
          setFilters={setFilters}
          hidden={hidden}
          loading={isInitialLoading}
        />

        {isInitialLoading && (
          <div className="rounded-3xl p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Memuat transaksi</p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Sinkron data akun kamu...</p>
              </div>
              <div className="h-2 w-2 animate-pulse rounded-full" style={{ background: 'var(--accent)' }} />
            </div>
            <div className="flex flex-col gap-3">
            {[...Array(4)].map((_, i) => (
              <SkeletonRow key={i} className="rounded-2xl" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
            </div>
          </div>
        )}

        {showError && (
          <div className="glass-card">
            <EmptyHint
              icon={<AlertCircle size={28} />}
              title="Data gagal dimuat"
              description="Sesi atau koneksi API bermasalah. Coba refresh dulu."
              primaryCta={{ label: 'Muat Ulang', onClick: refetch }}
              variant="filtered"
            />
          </div>
        )}

        {/* Empty state */}
        {showFilteredEmpty && (
          <div className="glass-card">
            <EmptyHint
              icon="?"
              title="Tidak ada hasil"
              description="Coba ubah filter atau hapus pencarian"
              secondaryCta={{ label: 'Reset Filter', onClick: resetFiltersAndSearch }}
              variant="filtered"
            />
          </div>
        )}

        {!loading && !showError && displayedTransactions.length === 0 && !showFilteredEmpty && (
          <EmptyState onAddTransaction={() => openAdd('expense')} />
        )}

        {/* Transaction groups */}
        {!loading && displayedTransactions.length > 0 && (
          <TransactionGroup
            transactions={displayedTransactions}
            hidden={hidden}
            onEdit={openEdit}
            onDelete={handleDelete}
            afterFirstGroup={<SmartInsight transactions={allTransactions} />}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelected}
            onEnterSelectMode={enterSelectionMode}
          />
        )}
      </div>

      {/* ── Transaction Modal ── */}
      <AnimatePresence>
        {showBulkCategoryPicker && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
              onClick={() => setShowBulkCategoryPicker(false)}
            />
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="relative mx-auto w-full max-w-md rounded-t-3xl p-5 sm:rounded-3xl"
              style={{
                background: 'var(--surface-modal)',
                border: '1px solid var(--border)',
                maxHeight: '82dvh',
                overflowY: 'auto',
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    Ubah kategori
                  </p>
                  <h2 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {selectedIds.size} transaksi dipilih
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBulkCategoryPicker(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ background: 'var(--surface-close)', color: 'var(--text-secondary)' }}
                  aria-label="Tutup pilihan kategori"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => { void handleApplyBulkCategory(cat.id) }}
                    className="flex min-h-[74px] flex-col items-center gap-1 rounded-xl p-2.5 transition-all"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                  >
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="w-full truncate text-center text-[10px]" style={{ color: cat.color }}>
                      {cat.name}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalOpen && (
          <TransactionModal
            transaction={editTx}
            defaultType={defaultType}
            onClose={handleModalClose}
          />
        )}
      </AnimatePresence>

      {/* ── FAB — transaction variant ── */}
      <FloatingActionButton
        variant="transaction"
        onSelect={openAdd}
      />

      {/* ── AI Chat Input ── */}
      <ChatInput />
    </div>
  )
}
