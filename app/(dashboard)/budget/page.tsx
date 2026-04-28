'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, X, Check, Target } from 'lucide-react'
import { useApiList } from '@/hooks/useApiData'
import type { BudgetStatus, Category } from '@/types'
import { formatCurrency, formatMonth } from '@/lib/utils'
import toast from 'react-hot-toast'

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function BudgetPage() {
  const router = useRouter()
  const thisMonth = currentMonth()

  const { data: budgets, refetch } = useApiList<BudgetStatus>(`/api/budget?month=${thisMonth}`, { refreshMs: 15000 })
  const { data: categories }       = useApiList<Category>('/api/categories')

  const [showAdd,  setShowAdd ] = useState(false)
  const [saving,   setSaving  ] = useState(false)
  const [form, setForm] = useState({ categoryId: '', limitAmount: '' })

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories]
  )

  // Categories not yet budgeted this month
  const unbudgeted = useMemo(() => {
    const budgetedIds = new Set(budgets.map((b) => b.categoryId))
    return expenseCategories.filter((c) => !budgetedIds.has(c.id))
  }, [expenseCategories, budgets])

  const selectedCat = useMemo(
    () => expenseCategories.find((c) => c.id === form.categoryId),
    [expenseCategories, form.categoryId]
  )

  const totalBudget = budgets.reduce((s, b) => s + b.limitAmount, 0)
  const totalSpent  = budgets.reduce((s, b) => s + b.spent, 0)

  const handleAdd = async () => {
    if (!form.categoryId || !form.limitAmount) { toast.error('Pilih kategori dan isi limit'); return }
    const limit = parseFloat(form.limitAmount.replace(/\D/g, ''))
    if (!limit || limit <= 0) { toast.error('Jumlah tidak valid'); return }
    setSaving(true)
    try {
      const cat = expenseCategories.find((c) => c.id === form.categoryId)
      const res = await fetch('/api/budget', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId:    form.categoryId,
          categoryName:  cat?.name,
          categoryIcon:  cat?.icon,
          categoryColor: cat?.color,
          limitAmount:   limit,
          month:         thisMonth,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Budget ditambahkan! ✓')
      setShowAdd(false)
      setForm({ categoryId: '', limitAmount: '' })
      refetch()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan budget')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus budget "${name}"?`)) return
    await fetch(`/api/budget?id=${id}`, { method: 'DELETE' })
    toast.success('Budget dihapus')
    refetch()
  }

  const handleAmountInput = (val: string) => {
    const numeric = val.replace(/\D/g, '')
    if (!numeric) { setForm((p) => ({ ...p, limitAmount: '' })); return }
    setForm((p) => ({ ...p, limitAmount: parseInt(numeric, 10).toLocaleString('id-ID') }))
  }

  return (
    <div className="px-4 py-6 max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>
            Budget
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {formatMonth(thisMonth)}
          </p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="btn-primary px-3 py-2 flex items-center gap-1.5 text-sm">
          <Plus size={15} /> Tambah
        </button>
      </div>

      {/* Summary */}
      {budgets.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>TOTAL BUDGET BULAN INI</p>
            <p className="text-xs font-bold" style={{ color: totalSpent > totalBudget ? 'var(--red)' : 'var(--accent)' }}>
              {totalSpent > totalBudget ? 'OVER BUDGET' : `${((totalSpent / totalBudget) * 100).toFixed(0)}% terpakai`}
            </p>
          </div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-2xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(totalSpent)}
            </p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>/ {formatCurrency(totalBudget)}</p>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: totalSpent > totalBudget ? 'var(--red)' : 'var(--accent)' }}
            />
          </div>
        </motion.div>
      )}

      {/* Budget list */}
      {budgets.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--accent-dim)' }}>
            <Target size={24} color="var(--accent)" />
          </div>
          <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Belum ada budget</p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            Tambah budget per kategori untuk kontrol pengeluaran
          </p>
          <button onClick={() => setShowAdd(true)} className="btn-primary px-5 py-2.5 text-sm">
            + Tambah Budget
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map((b, i) => {
            const over    = b.percent >= 100
            const warning = b.percent >= 80
            const color   = over ? 'var(--red)' : warning ? '#f97316' : 'var(--accent)'
            const bg      = over ? 'rgba(239,68,68,0.08)' : warning ? 'rgba(249,115,22,0.08)' : 'var(--surface-1)'

            return (
              <motion.div key={b.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass-card p-4"
                style={{ borderColor: over ? 'rgba(239,68,68,0.25)' : warning ? 'rgba(249,115,22,0.2)' : 'var(--border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: bg }}>
                      {b.categoryIcon || '📋'}
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {b.categoryName || 'Kategori'}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Sisa {formatCurrency(Math.max(b.remaining, 0))}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm font-bold font-mono" style={{ color }}>
                        {b.percent.toFixed(0)}%
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {formatCurrency(b.spent)} / {formatCurrency(b.limitAmount)}
                      </p>
                    </div>
                    <button onClick={() => handleDelete(b.id, b.categoryName || '')}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: 'var(--red-dim)', color: 'var(--red)' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(b.percent, 100)}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut', delay: i * 0.04 }}
                    className="h-full rounded-full"
                    style={{ background: color }}
                  />
                </div>
                {over && (
                  <p className="text-[10px] mt-1.5 font-medium" style={{ color: 'var(--red)' }}>
                    ⚠ Melebihi limit {formatCurrency(-b.remaining)}
                  </p>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Add Budget Modal */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
              onClick={() => setShowAdd(false)} />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="relative w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl p-6"
              style={{ background: 'var(--surface-4)', border: '1px solid var(--border)' }}
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                  Tambah Budget
                </h2>
                <button onClick={() => setShowAdd(false)}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Category picker */}
                <div>
                  <label className="text-xs mb-2 block font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Kategori Pengeluaran
                  </label>
                  {unbudgeted.length === 0 ? (
                    <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
                      Semua kategori sudah punya budget bulan ini.
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {unbudgeted.map((cat) => (
                        <button key={cat.id}
                          onClick={() => setForm((p) => ({ ...p, categoryId: cat.id }))}
                          className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all"
                          style={{
                            background: form.categoryId === cat.id ? `${cat.color}25` : 'var(--surface-3)',
                            border:    `1px solid ${form.categoryId === cat.id ? cat.color + '70' : 'rgba(34,197,94,0.15)'}`,
                          }}>
                          <span className="text-xl">{cat.icon}</span>
                          <span className="text-[9px] text-center leading-tight truncate w-full"
                            style={{ color: form.categoryId === cat.id ? cat.color : 'var(--text-secondary)' }}>
                            {cat.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Limit Budget (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold pointer-events-none"
                      style={{ color: selectedCat?.color || 'var(--accent)' }}>Rp</span>
                    <input type="text" inputMode="numeric" className="input-glass text-base font-bold"
                      style={{ paddingLeft: '3rem', color: selectedCat?.color || 'var(--accent)' }}
                      placeholder="0"
                      value={form.limitAmount}
                      onChange={(e) => handleAmountInput(e.target.value)} />
                  </div>
                </div>

                {/* Quick presets */}
                <div>
                  <p className="text-[10px] mb-2" style={{ color: 'var(--text-muted)' }}>Preset cepat:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[500_000, 1_000_000, 2_000_000, 3_000_000, 5_000_000].map((amount) => (
                      <button key={amount}
                        onClick={() => setForm((p) => ({ ...p, limitAmount: amount.toLocaleString('id-ID') }))}
                        className="px-2.5 py-1 rounded-lg text-xs"
                        style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                        {formatCurrency(amount)}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={handleAdd} disabled={saving || !form.categoryId || !form.limitAmount}
                  className="btn-primary w-full py-3.5 flex items-center justify-center gap-2">
                  {saving
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                    : <><Check size={15}/> Simpan Budget</>
                  }
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
