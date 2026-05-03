'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react'
import { useTransactions }    from '@/hooks/useTransactions'
import { useBalanceVisibility } from '@/hooks/useBalanceVisibility'
import { useApiList }          from '@/hooks/useApiData'
import { TransactionModal }    from '@/components/transactions/TransactionModal'
import { TransactionGroup }    from '@/components/transactions/TransactionGroup'
import { SummaryCards }        from '@/components/transactions/SummaryCards'
import { SmartInsight }        from '@/components/transactions/SmartInsight'
import { EmptyState }          from '@/components/transactions/EmptyState'
import { FloatingActionButton } from '@/components/transactions/FloatingActionButton'
import { getCurrentMonth }     from '@/lib/utils'
import type { Transaction, Category, TransactionType } from '@/types'

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
      <button onClick={onRemove} className="opacity-70 hover:opacity-100">
        <X size={10} strokeWidth={2.5} />
      </button>
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const { hidden }   = useBalanceVisibility()
  const {
    transactions,
    allTransactions,
    loading,
    filters,
    setFilters,
    clearFilters,
    hasActiveFilter,
    searchQuery,
    setSearchQuery,
    addTransaction,
    deleteTransaction,
    updateTransaction,
  } = useTransactions()

  const { data: categories } = useApiList<Category>('/api/categories')

  // Modal state
  const [modalOpen,    setModalOpen   ] = useState(false)
  const [editTx,       setEditTx      ] = useState<Transaction | undefined>()
  const [defaultType,  setDefaultType ] = useState<TransactionType>('expense')

  // Filter panel
  const [filterOpen,   setFilterOpen  ] = useState(false)
  const monthOptions = useMemo(buildMonthOptions, [])

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

  const handleModalClose = useCallback((updated?: Transaction) => {
    setModalOpen(false)
    setEditTx(undefined)
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    await deleteTransaction(id)
  }, [deleteTransaction])

  // ── Active filter chips ───────────────────────────────────────────────────────

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; remove: () => void }[] = []
    if (filters.month) {
      const opt = monthOptions.find(o => o.value === filters.month)
      chips.push({ key: 'month', label: opt?.label ?? filters.month, remove: () => setFilters({ ...filters, month: undefined }) })
    }
    if (filters.type) {
      const label = filters.type === 'income' ? 'Pemasukan' : filters.type === 'expense' ? 'Pengeluaran' : 'Transfer'
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
    return chips
  }, [filters, monthOptions, categories, setFilters])

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen pb-32" style={{ background: 'var(--background)' }}>

      {/* ── Header ── */}
      <div
        className="sticky top-0 z-30 px-4 pt-12 pb-3"
        style={{
          background:         'var(--background)',
          backdropFilter:     'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom:       '1px solid var(--border)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-0.5"
              style={{ color: 'var(--text-muted)' }}>
              Riwayat
            </p>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Transaksi
            </h1>
          </div>

          {/* Filter toggle */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilterOpen(o => !o)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{
              background: filterOpen ? 'rgba(34,197,94,0.12)' : 'var(--surface-2)',
              color:      filterOpen ? 'var(--accent)'        : 'var(--text-secondary)',
              border:     `1px solid ${filterOpen ? 'rgba(34,197,94,0.25)' : 'var(--border)'}`,
              transition: 'all 0.15s',
            }}
          >
            <SlidersHorizontal size={13} />
            Filter
            {hasActiveFilter && (
              <span
                className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                style={{ background: 'var(--accent)', color: '#000' }}
              >
                {activeChips.length}
              </span>
            )}
          </motion.button>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Cari transaksi..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm"
            style={{
              background: 'var(--surface-2)',
              border:     '1px solid var(--border)',
              color:      'var(--text-primary)',
              outline:    'none',
            }}
          />
          {searchQuery && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2"
              onClick={() => setSearchQuery('')}
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={13} />
            </button>
          )}
        </div>

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
                        income: 'Pemasukan', expense: 'Pengeluaran', transfer: 'Transfer', credit_expense: 'Kartu Kredit'
                      }
                      const active = filters.type === t
                      return (
                        <motion.button
                          key={t}
                          whileTap={{ scale: 0.94 }}
                          onClick={() => setFilters({ ...filters, type: active ? undefined : t })}
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

      {/* ── Body ── */}
      <div className="flex flex-col gap-4 px-4 pt-4">

        {/* Summary cards */}
        <SummaryCards
          transactions={transactions}
          allTransactions={allTransactions}
          filters={filters}
          setFilters={setFilters}
        />

        {/* Smart insight */}
        <SmartInsight transactions={allTransactions} />

        {/* Loading skeleton */}
        {loading && (
          <div className="flex flex-col gap-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-2xl animate-pulse"
                style={{ background: 'var(--surface-2)', animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && transactions.length === 0 && (
          <EmptyState onAddTransaction={() => openAdd('expense')} />
        )}

        {/* Transaction groups */}
        {!loading && transactions.length > 0 && (
          <TransactionGroup
            transactions={transactions}
            hidden={hidden}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* ── Transaction Modal ── */}
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
    </div>
  )
}
