'use client'

import { useState, useMemo, useCallback, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams, useRouter } from 'next/navigation'
import { useApiList } from '@/hooks/useApiData'
import { useTransactions } from '@/hooks/useTransactions'
import type { Goal, BudgetStatus, Category } from '@/types'
import { GoalCard } from '@/components/goals/GoalCard'
import { BudgetCard } from '@/components/goals/BudgetCard'
import { GoalsFAB } from '@/components/goals/GoalsFAB'
import { InsightCard } from '@/components/goals/InsightCard'
import { generateInsights, getMonthlyNetSavings } from '@/lib/goals-finance'
import { formatCurrency, getCurrentMonth, getMonthOptions } from '@/lib/utils'
import { Target, PiggyBank, X, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

const GOAL_ICONS  = ['🎯','🏠','🚗','✈️','📱','💍','🎓','💪','🌴','👶','💼','🏋️']
const GOAL_COLORS = ['#22C55E','#63b3ed','#f6cc60','#F87171','#d6aaff','#4fd1c5','#f6ad55']

function GoalsContent() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const activeTab    = (searchParams.get('tab') === 'budget' ? 'budget' : 'goals') as 'goals' | 'budget'

  const setTab = (tab: 'goals' | 'budget') => {
    router.replace(tab === 'budget' ? '/goals?tab=budget' : '/goals', { scroll: false })
  }

  const { data: goals,      refetch: refetchGoals   } = useApiList<Goal>('/api/goals',          { refreshMs: 30000 })
  const { data: budgets,    refetch: refetchBudgets  } = useApiList<BudgetStatus>('/api/budget', { refreshMs: 30000 })
  const { data: categories }                           = useApiList<Category>('/api/categories')
  const { transactions }                               = useTransactions()

  // Goals state
  const [showAddGoal, setShowAddGoal]   = useState(false)
  const [showTopUp,   setShowTopUp]     = useState<Goal | null>(null)
  const [topUpAmount, setTopUpAmount]   = useState('')
  const [savingGoal,  setSavingGoal]    = useState(false)
  const [goalForm,    setGoalForm]      = useState({ title: '', targetAmount: '', icon: '🎯', color: '#22C55E' })

  // Budget state
  const [showAddBudget, setShowAddBudget] = useState(false)
  const [savingBudget,  setSavingBudget]  = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [budgetForm,    setBudgetForm]    = useState({ categoryId: '', limitAmount: '' })

  const budgetsByMonth    = useMemo(() => budgets.filter((b) => b.month === selectedMonth), [budgets, selectedMonth])
  const expenseCategories = useMemo(() => categories.filter((c) => c.type === 'expense'),   [categories])
  const monthlyNet        = useMemo(() => getMonthlyNetSavings(transactions),                [transactions])
  const insights          = useMemo(() => generateInsights(goals, budgets, transactions),    [goals, budgets, transactions])
  const monthOptions      = getMonthOptions(6)

  const totalTarget  = goals.reduce((s, g) => s + g.targetAmount,  0)
  const totalCurrent = goals.reduce((s, g) => s + g.currentAmount, 0)
  const totalBudget  = budgetsByMonth.reduce((s, b) => s + b.limitAmount, 0)
  const totalSpent   = budgetsByMonth.reduce((s, b) => s + b.spent,       0)

  // Goal handlers
  const handleAddGoal = useCallback(async () => {
    if (!goalForm.title || !goalForm.targetAmount) { toast.error('Nama dan target wajib diisi'); return }
    setSavingGoal(true)
    try {
      const res  = await fetch('/api/goals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...goalForm, targetAmount: Number(goalForm.targetAmount) }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Goal ditambahkan! 🎯')
      setShowAddGoal(false)
      setGoalForm({ title: '', targetAmount: '', icon: '🎯', color: '#22C55E' })
      refetchGoals()
    } catch { toast.error('Gagal menambahkan goal') }
    finally { setSavingGoal(false) }
  }, [goalForm, refetchGoals])

  const handleDeleteGoal = useCallback(async (id: string) => {
    if (!confirm('Hapus goal ini?')) return
    await fetch(`/api/goals/${id}`, { method: 'DELETE' })
    toast.success('Goal dihapus')
    refetchGoals()
  }, [refetchGoals])

  const handleTopUp = useCallback(async () => {
    if (!showTopUp || !topUpAmount) return
    const add = parseFloat(topUpAmount.replace(/\./g, ''))
    if (isNaN(add) || add <= 0) { toast.error('Jumlah tidak valid'); return }
    setSavingGoal(true)
    try {
      const newCurrent = showTopUp.currentAmount + add
      const res  = await fetch(`/api/goals/${showTopUp.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentAmount: newCurrent }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      if (newCurrent >= showTopUp.targetAmount) toast.success('🎉 Goal tercapai!')
      else toast.success(`+${formatCurrency(add)} ditambahkan!`)
      setShowTopUp(null); setTopUpAmount(''); refetchGoals()
    } catch { toast.error('Gagal update goal') }
    finally { setSavingGoal(false) }
  }, [showTopUp, topUpAmount, refetchGoals])

  // Budget handlers
  const handleAddBudget = useCallback(async () => {
    if (!budgetForm.categoryId || !budgetForm.limitAmount) { toast.error('Kategori dan limit wajib diisi'); return }
    setSavingBudget(true)
    try {
      const cat = categories.find((c) => c.id === budgetForm.categoryId)
      const res  = await fetch('/api/budget', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId:    budgetForm.categoryId,
          categoryName:  cat?.name,
          categoryIcon:  cat?.icon,
          categoryColor: cat?.color,
          limitAmount:   Number(budgetForm.limitAmount),
          month:         selectedMonth,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Budget ditambahkan! 📊')
      setShowAddBudget(false)
      setBudgetForm({ categoryId: '', limitAmount: '' })
      refetchBudgets()
    } catch { toast.error('Gagal menambahkan budget') }
    finally { setSavingBudget(false) }
  }, [budgetForm, selectedMonth, categories, refetchBudgets])

  const handleDeleteBudget = useCallback(async (id: string, name: string) => {
    if (!confirm(`Hapus budget "${name}"?`)) return
    await fetch(`/api/budget?id=${id}`, { method: 'DELETE' })
    toast.success('Budget dihapus')
    refetchBudgets()
  }, [refetchBudgets])

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto pb-32">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>
            Perencanaan Keuangan
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Goals & Budget</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-2xl mb-5"
        style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
        {([['goals', '🎯', 'Goals'], ['budget', '📊', 'Budget']] as const).map(([tab, icon, label]) => (
          <button key={tab} onClick={() => setTab(tab)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background:  activeTab === tab ? 'var(--accent)' : 'transparent',
              color:       activeTab === tab ? '#fff'          : 'var(--text-muted)',
              boxShadow:   activeTab === tab ? '0 2px 12px rgba(34,197,94,0.30)' : 'none',
            }}>
            <span>{icon}</span> {label}
          </button>
        ))}
      </div>

      {/* Smart Insights */}
      {insights.length > 0 && (
        <div className="space-y-2 mb-5">
          {insights.slice(0, 3).map((ins) => (
            <InsightCard key={ins.id} insight={ins} />
          ))}
        </div>
      )}

      {/* GOALS TAB */}
      <AnimatePresence mode="wait">
        {activeTab === 'goals' && (
          <motion.div key="goals-tab"
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>

            {goals.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="glass-hero p-5 mb-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>PROGRESS KESELURUHAN</p>
                  <p className="text-sm font-bold font-mono" style={{ color: 'var(--accent)' }}>
                    {totalTarget > 0 ? (totalCurrent / totalTarget * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <div className="progress-bar mb-3">
                  <motion.div className="progress-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${totalTarget > 0 ? (totalCurrent / totalTarget * 100) : 0}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{ background: 'linear-gradient(90deg, #22C55E, #16A34A)' }} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Terkumpul</p>
                    <p className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{formatCurrency(totalCurrent)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Total Target</p>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(totalTarget)}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {goals.length === 0 && (
              <div className="text-center py-16 glass-card px-6">
                <p className="text-5xl mb-4">🎯</p>
                <p className="font-display font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
                  Belum ada Financial Goal
                </p>
                <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                  Tetapkan target keuangan dan pantau progresmu setiap hari
                </p>
                <button onClick={() => setShowAddGoal(true)} className="btn-primary px-6 py-3">
                  + Buat Goal Pertama
                </button>
              </div>
            )}

            <div className="space-y-3">
              {goals.map((g, i) => (
                <GoalCard key={g.id} goal={g} onDelete={handleDeleteGoal}
                  onTopUp={setShowTopUp} monthlyContribution={monthlyNet} index={i} />
              ))}
            </div>
          </motion.div>
        )}

        {/* BUDGET TAB */}
        {activeTab === 'budget' && (
          <motion.div key="budget-tab"
            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>

            {/* Month selector */}
            <div className="relative mb-4">
              <select className="input-glass text-sm appearance-none pr-8 w-full"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}>
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--text-muted)' }} />
            </div>

            {budgetsByMonth.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="glass-hero p-5 mb-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>RINGKASAN BUDGET</p>
                  <p className="text-sm font-bold font-mono"
                    style={{ color: totalSpent > totalBudget ? 'var(--red)' : 'var(--accent)' }}>
                    {totalBudget > 0 ? (totalSpent / totalBudget * 100).toFixed(0) : 0}%
                  </p>
                </div>
                <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: 'var(--surface-3)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${totalBudget > 0 ? Math.min(100, totalSpent / totalBudget * 100) : 0}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: totalSpent > totalBudget ? 'var(--red)' : 'var(--accent)' }} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Terpakai</p>
                    <p className="text-sm font-bold"
                      style={{ color: totalSpent > totalBudget ? 'var(--red)' : 'var(--accent)' }}>
                      {formatCurrency(totalSpent)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Total Limit</p>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(totalBudget)}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {budgetsByMonth.length === 0 && (
              <div className="text-center py-16 glass-card px-6">
                <p className="text-5xl mb-4">📊</p>
                <p className="font-display font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
                  Belum ada Budget
                </p>
                <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                  Tetapkan limit pengeluaran per kategori untuk bulan ini
                </p>
                <button onClick={() => setShowAddBudget(true)} className="btn-primary px-6 py-3">
                  + Buat Budget Pertama
                </button>
              </div>
            )}

            <div className="space-y-3">
              {budgetsByMonth.map((b, i) => (
                <BudgetCard key={b.id} budget={b} onDelete={handleDeleteBudget} index={i} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <GoalsFAB activeTab={activeTab} onAddGoal={() => setShowAddGoal(true)} onAddBudget={() => setShowAddBudget(true)} />

      {/* Add Goal Modal */}
      <AnimatePresence>
        {showAddGoal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
              onClick={() => setShowAddGoal(false)} />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="relative w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl"
              style={{ background: 'var(--surface-modal)', border: '1px solid var(--border)', maxHeight: '90dvh', overflowY: 'auto' }}
              onClick={(e) => e.stopPropagation()}>
              <div className="drag-indicator mt-3 sm:hidden" />
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-2">
                  <Target size={18} color="var(--accent)" />
                  <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Buat Financial Goal</h2>
                </div>
                <button onClick={() => setShowAddGoal(false)}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--surface-close)', color: 'var(--text-secondary)' }}>
                  <X size={18} />
                </button>
              </div>
              <div className="px-5 pb-7 space-y-4">
                <div>
                  <label className="text-xs mb-2 block font-semibold" style={{ color: 'var(--text-muted)' }}>Icon</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {GOAL_ICONS.map((ic) => (
                      <button key={ic} onClick={() => setGoalForm({ ...goalForm, icon: ic })}
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all"
                        style={{
                          background: goalForm.icon === ic ? `${goalForm.color}25` : 'var(--surface-btn)',
                          border: `1px solid ${goalForm.icon === ic ? goalForm.color + '55' : 'var(--border)'}`,
                        }}>{ic}</button>
                    ))}
                  </div>
                  <label className="text-xs mb-2 block font-semibold" style={{ color: 'var(--text-muted)' }}>Warna</label>
                  <div className="flex gap-2 flex-wrap">
                    {GOAL_COLORS.map((c) => (
                      <button key={c} onClick={() => setGoalForm({ ...goalForm, color: c })}
                        className="w-7 h-7 rounded-full transition-all"
                        style={{
                          background: c,
                          boxShadow: goalForm.color === c ? `0 0 0 3px ${c}50, 0 0 0 5px ${c}20` : 'none',
                        }} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Nama Goal <span style={{ color: 'var(--accent)' }}>*</span>
                  </label>
                  <input type="text" className="input-glass" placeholder="contoh: Dana Darurat, DP Rumah"
                    value={goalForm.title} onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Target (Rp) <span style={{ color: 'var(--accent)' }}>*</span>
                  </label>
                  <input type="number" className="input-glass" placeholder="contoh: 100000000"
                    value={goalForm.targetAmount} onChange={(e) => setGoalForm({ ...goalForm, targetAmount: e.target.value })} />
                </div>
                {goalForm.title && goalForm.targetAmount && (
                  <div className="p-3 rounded-xl"
                    style={{ background: `${goalForm.color}10`, border: `1px solid ${goalForm.color}30` }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{goalForm.icon}</span>
                      <span className="font-semibold text-sm" style={{ color: goalForm.color }}>{goalForm.title}</span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Target: {formatCurrency(Number(goalForm.targetAmount))}
                    </p>
                  </div>
                )}
                <button onClick={handleAddGoal} disabled={savingGoal} className="btn-primary w-full py-4">
                  {savingGoal
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                    : '🎯 Buat Goal'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Top Up Modal */}
      <AnimatePresence>
        {showTopUp && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
              onClick={() => { setShowTopUp(null); setTopUpAmount('') }} />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="relative w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl p-6"
              style={{ background: 'var(--surface-modal)', border: '1px solid var(--border)' }}
              onClick={(e) => e.stopPropagation()}>
              <h2 className="font-display font-bold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>
                {showTopUp.icon} Top Up Progress
              </h2>
              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                {showTopUp.title} — sisa {formatCurrency(showTopUp.targetAmount - showTopUp.currentAmount)}
              </p>
              <input type="number" className="input-glass mb-4" placeholder="Jumlah (Rp)"
                value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} autoFocus />
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { setShowTopUp(null); setTopUpAmount('') }} className="btn-ghost py-3">Batal</button>
                <button onClick={handleTopUp} disabled={savingGoal} className="btn-primary py-3">
                  {savingGoal ? '...' : '+ Tambah'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Budget Modal */}
      <AnimatePresence>
        {showAddBudget && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
              onClick={() => setShowAddBudget(false)} />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="relative w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl"
              style={{ background: 'var(--surface-modal)', border: '1px solid var(--border)', maxHeight: '85dvh', overflowY: 'auto' }}
              onClick={(e) => e.stopPropagation()}>
              <div className="drag-indicator mt-3 sm:hidden" />
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-2">
                  <PiggyBank size={18} color="var(--accent)" />
                  <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Tambah Budget</h2>
                </div>
                <button onClick={() => setShowAddBudget(false)}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--surface-close)', color: 'var(--text-secondary)' }}>
                  <X size={18} />
                </button>
              </div>
              <div className="px-5 pb-7 space-y-4">
                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>Bulan</label>
                  <select className="input-glass text-sm" value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}>
                    {monthOptions.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Kategori <span style={{ color: 'var(--accent)' }}>*</span>
                  </label>
                  <select className="input-glass text-sm" value={budgetForm.categoryId}
                    onChange={(e) => setBudgetForm({ ...budgetForm, categoryId: e.target.value })}>
                    <option value="">Pilih kategori</option>
                    {expenseCategories.map((c) => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Limit (Rp) <span style={{ color: 'var(--accent)' }}>*</span>
                  </label>
                  <input type="number" className="input-glass" placeholder="contoh: 500000"
                    value={budgetForm.limitAmount}
                    onChange={(e) => setBudgetForm({ ...budgetForm, limitAmount: e.target.value })} />
                </div>
                <button onClick={handleAddBudget} disabled={savingBudget} className="btn-primary w-full py-4">
                  {savingBudget
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                    : '📊 Simpan Budget'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function GoalsPage() {
  return (
    <Suspense fallback={
      <div className="px-4 py-5 max-w-2xl mx-auto space-y-4">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="skeleton h-12 rounded-2xl" />
        <div className="skeleton h-32 rounded-2xl" />
        <div className="skeleton h-24 rounded-2xl" />
        <div className="skeleton h-24 rounded-2xl" />
      </div>
    }>
      <GoalsContent />
    </Suspense>
  )
}
