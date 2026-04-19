'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTransactions } from '@/hooks/useTransactions'
import { useFirebaseList } from '@/hooks/useFirebaseRealtime'
import { formatCurrency, formatDate, getMonthOptions } from '@/lib/utils'
import type { Category, Transaction } from '@/types'
import { Filter, Download, Search, ChevronDown, Trash2, Edit3 } from 'lucide-react'
import { QuickAddFAB } from '@/components/transactions/QuickAddFAB'
import { TransactionModal } from '@/components/transactions/TransactionModal'
import toast from 'react-hot-toast'

export default function TransactionsPage() {
  const {
    transactions, loading, filters, setFilters, stats,
    deleteTransaction,
  } = useTransactions()
  const { data: categories } = useFirebaseList<Category>('categories')

  const [showFilters, setShowFilters] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editTx, setEditTx] = useState<Transaction | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const monthOptions = getMonthOptions(24)

  const displayedTransactions = useMemo(() => {
    if (!searchQuery) return transactions
    const q = searchQuery.toLowerCase()
    return transactions.filter(
      (t) =>
        t.description?.toLowerCase().includes(q) ||
        t.categoryName?.toLowerCase().includes(q)
    )
  }, [transactions, searchQuery])

  const handleExport = async () => {
    const url = `/api/export?month=${filters.month || ''}`
    const a = document.createElement('a')
    a.href = url
    a.click()
    toast.success('Export berhasil!')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus transaksi ini?')) return
    await deleteTransaction(id)
    setExpandedId(null)
  }

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, Transaction[]> = {}
    displayedTransactions.forEach((t) => {
      const key = t.date.split('T')[0]
      if (!groups[key]) groups[key] = []
      groups[key].push(t)
    })
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }, [displayedTransactions])

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>
            Transaksi
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {displayedTransactions.length} transaksi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{
              background: showFilters ? 'var(--accent-dim)' : 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: showFilters ? 'var(--accent)' : 'var(--text-secondary)',
            }}
          >
            <Filter size={16} />
          </button>
          <button
            onClick={handleExport}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
            }}
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'Pemasukan', value: stats.income, color: 'var(--accent)' },
          { label: 'Pengeluaran', value: stats.expense, color: 'var(--red)' },
          { label: 'Saldo', value: stats.balance, color: stats.balance >= 0 ? 'var(--accent)' : 'var(--red)' },
        ].map((s) => (
          <div key={s.label} className="glass-card p-3 text-center">
            <p className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            <p className="text-xs font-bold font-mono" style={{ color: s.color }}>
              {formatCurrency(s.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden mb-4"
          >
            <div className="glass-card p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {/* Month filter */}
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Bulan</label>
                  <select
                    className="input-glass text-sm"
                    value={filters.month || ''}
                    onChange={(e) => setFilters({ ...filters, month: e.target.value || undefined })}
                  >
                    <option value="">Semua bulan</option>
                    {monthOptions.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {/* Type filter */}
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Tipe</label>
                  <select
                    className="input-glass text-sm"
                    value={filters.type || ''}
                    onChange={(e) => setFilters({ ...filters, type: (e.target.value as 'income' | 'expense' | 'transfer') || undefined })}
                  >
                    <option value="">Semua tipe</option>
                    <option value="income">Pemasukan</option>
                    <option value="expense">Pengeluaran</option>
                    <option value="transfer">Transfer</option>
                  </select>
                </div>

                {/* Category filter */}
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Kategori</label>
                  <select
                    className="input-glass text-sm"
                    value={filters.categoryId || ''}
                    onChange={(e) => setFilters({ ...filters, categoryId: e.target.value || undefined })}
                  >
                    <option value="">Semua kategori</option>
                    {(categories || []).map((c) => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Wallet filter */}
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Wallet</label>
                  <select
                    className="input-glass text-sm"
                    value={filters.wallet || ''}
                    onChange={(e) => setFilters({ ...filters, wallet: (e.target.value as 'cash' | 'bank' | 'ewallet') || undefined })}
                  >
                    <option value="">Semua wallet</option>
                    <option value="cash">💵 Cash</option>
                    <option value="bank">🏦 Bank</option>
                    <option value="ewallet">📱 E-Wallet</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => setFilters({ month: undefined })}
                className="text-xs w-full py-2 rounded-lg transition-all"
                style={{ color: 'var(--text-muted)', background: 'var(--surface-3)' }}
              >
                Reset filter
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Cari transaksi..."
          className="input-glass pl-9 text-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Transaction list grouped by date */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-2xl" />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📭</p>
          <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Tidak ada transaksi</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Coba ubah filter atau tambah transaksi baru
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([date, txList]) => (
            <div key={date}>
              <p className="text-xs font-semibold mb-2 px-1" style={{ color: 'var(--text-muted)' }}>
                {formatDate(date, 'EEEE, dd MMMM yyyy')}
              </p>
              <div className="glass-card overflow-hidden">
                {txList.map((t, i) => (
                  <div key={t.id}>
                    {/* Transaction row */}
                    <button
                      className="w-full flex items-center gap-3 p-3 transition-all text-left"
                      style={{
                        background: expandedId === t.id ? 'rgba(255,255,255,0.03)' : 'transparent',
                        borderBottom: i < txList.length - 1 ? '1px solid var(--border)' : 'none',
                      }}
                      onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                        style={{
                          background:
                            t.type === 'income' ? 'var(--accent-dim)'
                            : t.type === 'expense' ? 'var(--red-dim)'
                            : 'var(--blue-dim)',
                        }}
                      >
                        {t.categoryIcon || '💰'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {t.description || t.categoryName}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {t.categoryName}
                          {t.type === 'transfer' && t.toWallet
                            ? ` · ${t.wallet} → ${t.toWallet}`
                            : ` · ${t.wallet}`}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p
                          className="text-sm font-bold font-mono"
                          style={{
                            color: t.type === 'income' ? 'var(--accent)'
                              : t.type === 'expense' ? 'var(--red)'
                              : 'var(--blue)',
                          }}
                        >
                          {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}
                          {formatCurrency(t.amount)}
                        </p>
                        <ChevronDown
                          size={14}
                          style={{
                            color: 'var(--text-muted)',
                            transform: expandedId === t.id ? 'rotate(180deg)' : 'none',
                            transition: 'transform 0.2s',
                            marginLeft: 'auto',
                          }}
                        />
                      </div>
                    </button>

                    {/* Expanded detail */}
                    <AnimatePresence>
                      {expandedId === t.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div
                            className="px-4 pb-3 pt-1 flex items-center justify-between"
                            style={{ background: 'rgba(255,255,255,0.02)' }}
                          >
                            <div className="space-y-1">
                              {t.tags && t.tags.length > 0 && (
                                <div className="flex gap-1 flex-wrap">
                                  {t.tags.map((tag) => (
                                    <span key={tag} className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                Dibuat: {formatDate(t.createdAt, 'dd MMM yyyy HH:mm')}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditTx(t)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                                style={{ background: 'var(--blue-dim)', color: 'var(--blue)' }}
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(t.id)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                                style={{ background: 'var(--red-dim)', color: 'var(--red)' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="h-8" />
      <QuickAddFAB />

      {/* Edit modal */}
      {editTx && (
        <TransactionModal
          transaction={editTx}
          onClose={() => setEditTx(null)}
        />
      )}
    </div>
  )
}
