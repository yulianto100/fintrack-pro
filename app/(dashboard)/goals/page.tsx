'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApiList } from '@/hooks/useApiData'
import type { Goal } from '@/types'
import { GoalCard } from '@/components/goals/GoalCard'
import { Plus, X, Target } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

const GOAL_ICONS = ['🎯','🏠','🚗','✈️','📱','💍','🎓','💪','🌴','👶','💼','🏋️']
const GOAL_COLORS = ['#22C55E','#63b3ed','#f6cc60','#F87171','#d6aaff','#4fd1c5','#f6ad55']

export default function GoalsPage() {
  const { data: goals, refetch } = useApiList<Goal>('/api/goals', { refreshMs: 30000 })
  const [showAdd, setShowAdd] = useState(false)
  const [showTopUp, setShowTopUp] = useState<Goal|null>(null)
  const [saving, setSaving] = useState(false)
  const [topUpAmount, setTopUpAmount] = useState('')
  const [form, setForm] = useState({
    title:'', targetAmount:'',
    icon:'🎯', color:'#22C55E',
  })

  const handleAdd = async () => {
    if (!form.title || !form.targetAmount) { toast.error('Nama dan target wajib diisi'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/goals', {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Goal ditambahkan! 🎯')
      setShowAdd(false); refetch()
      setForm({ title:'', targetAmount:'', icon:'🎯', color:'#22C55E' })
    } catch { toast.error('Gagal menambahkan goal') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus goal ini?')) return
    await fetch(`/api/goals/${id}`, { method:'DELETE' })
    toast.success('Goal dihapus'); refetch()
  }

  const handleTopUp = async () => {
    if (!showTopUp || !topUpAmount) return
    const add = parseFloat(topUpAmount.replace(/\./g,''))
    if (isNaN(add) || add <= 0) { toast.error('Jumlah tidak valid'); return }
    setSaving(true)
    try {
      const newCurrent = showTopUp.currentAmount + add
      const res = await fetch(`/api/goals/${showTopUp.id}`, {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ currentAmount: newCurrent }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      if (newCurrent >= showTopUp.targetAmount) toast.success('🎉 Goal tercapai!')
      else toast.success(`+${formatCurrency(add)} ditambahkan!`)
      setShowTopUp(null); setTopUpAmount(''); refetch()
    } catch { toast.error('Gagal update goal') }
    finally { setSaving(false) }
  }

  const totalTarget  = goals.reduce((s,g)=>s+g.targetAmount,0)
  const totalCurrent = goals.reduce((s,g)=>s+g.currentAmount,0)

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-display font-bold" style={{ color:'var(--text-primary)' }}>🎯 Financial Goals</h1>
          <p className="text-xs" style={{ color:'var(--text-muted)' }}>Raih target keuangan Anda</p>
        </div>
        <button onClick={()=>setShowAdd(true)} className="btn-primary px-4 py-2 flex items-center gap-1.5 text-sm">
          <Plus size={16}/> Tambah
        </button>
      </div>

      {/* Summary */}
      {goals.length > 0 && (
        <div className="glass-hero p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold" style={{ color:'var(--text-muted)' }}>PROGRESS KESELURUHAN</p>
            <p className="text-sm font-bold" style={{ color:'var(--accent)' }}>
              {totalTarget > 0 ? (totalCurrent/totalTarget*100).toFixed(1) : 0}%
            </p>
          </div>
          <div className="progress-bar mb-2">
            <div className="progress-bar-fill transition-all duration-700"
              style={{ width:`${totalTarget>0?(totalCurrent/totalTarget*100):0}%`, background:'linear-gradient(90deg,#22C55E,#16A34A)' }}/>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color:'var(--text-muted)' }}>Terkumpul: {formatCurrency(totalCurrent)}</p>
            <p className="text-xs" style={{ color:'var(--text-muted)' }}>Target: {formatCurrency(totalTarget)}</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {goals.length === 0 && (
        <div className="text-center py-16 glass-card">
          <p className="text-5xl mb-4">🎯</p>
          <p className="font-display font-bold text-lg mb-2" style={{ color:'var(--text-primary)' }}>
            Belum ada Financial Goal
          </p>
          <p className="text-sm mb-6" style={{ color:'var(--text-muted)' }}>
            Tetapkan target keuangan dan pantau progresmu setiap hari
          </p>
          <button onClick={()=>setShowAdd(true)} className="btn-primary px-6 py-3">
            + Buat Goal Pertama
          </button>
        </div>
      )}

      {/* Goals list */}
      <div className="space-y-3">
        {goals.map(g => (
          <GoalCard key={g.id} goal={g} onDelete={handleDelete} onTopUp={setShowTopUp}/>
        ))}
      </div>

      {/* Add Goal Modal */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              className="absolute inset-0" style={{background:'rgba(0,0,0,0.65)',backdropFilter:'blur(6px)'}}
              onClick={()=>setShowAdd(false)}/>
            <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
              transition={{type:'spring',damping:30,stiffness:350}}
              className="relative w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl"
              style={{background:'rgba(255,255,255,0.80)',border:'1px solid var(--border)',maxHeight:'90dvh',overflowY:'auto'}}
              onClick={e=>e.stopPropagation()}>
              <div className="drag-indicator mt-3 sm:hidden"/>
              <div className="flex items-center justify-between px-5 py-4">
                <h2 className="font-display font-bold text-lg" style={{color:'var(--text-primary)'}}>Buat Financial Goal</h2>
                <button onClick={()=>setShowAdd(false)} className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{background:'rgba(255,255,255,0.90)',color:'var(--text-secondary)'}}>
                  <X size={18}/>
                </button>
              </div>
              <div className="px-5 pb-7 space-y-4">
                {/* Icon picker */}
                <div>
                  <label className="text-xs mb-2 block font-semibold" style={{color:'var(--text-muted)'}}>Icon & Warna</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {GOAL_ICONS.map(ic => (
                      <button key={ic} onClick={()=>setForm({...form,icon:ic})}
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all"
                        style={{
                          background: form.icon===ic ? `${form.color}25` : 'rgba(255,255,255,0.88)',
                          border:`1px solid ${form.icon===ic ? form.color+'55' : 'var(--border)'}`,
                        }}>{ic}</button>
                    ))}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {GOAL_COLORS.map(c => (
                      <button key={c} onClick={()=>setForm({...form,color:c})}
                        className="w-7 h-7 rounded-full transition-all"
                        style={{
                          background:c,
                          boxShadow: form.color===c ? `0 0 0 3px ${c}50, 0 0 0 5px ${c}20` : 'none',
                        }}/>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{color:'var(--text-muted)'}}>
                    Nama Goal <span style={{color:'var(--accent)'}}>*</span>
                  </label>
                  <input type="text" className="input-glass" placeholder="contoh: Dana Darurat, DP Rumah"
                    value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
                </div>

                <div>
                  <label className="text-xs mb-1.5 block font-semibold" style={{color:'var(--text-muted)'}}>
                    Target (Rp) <span style={{color:'var(--accent)'}}>*</span>
                  </label>
                  <input type="number" className="input-glass" placeholder="contoh: 100000000"
                    value={form.targetAmount} onChange={e=>setForm({...form,targetAmount:e.target.value})}/>
                </div>
                {/* Preview */}
                {form.title && form.targetAmount && (
                  <div className="p-3 rounded-xl" style={{background:`${form.color}10`,border:`1px solid ${form.color}30`}}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{form.icon}</span>
                      <span className="font-semibold text-sm" style={{color:form.color}}>{form.title}</span>
                    </div>
                    <p className="text-xs" style={{color:'var(--text-muted)'}}>Target: {formatCurrency(Number(form.targetAmount))}</p>
                  </div>
                )}

                <button onClick={handleAdd} disabled={saving} className="btn-primary w-full py-4">
                  {saving
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"/>
                    : '🎯 Buat Goal'
                  }
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
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              className="absolute inset-0" style={{background:'rgba(0,0,0,0.65)',backdropFilter:'blur(6px)'}}
              onClick={()=>setShowTopUp(null)}/>
            <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
              transition={{type:'spring',damping:30,stiffness:350}}
              className="relative w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl p-6"
              style={{background:'rgba(255,255,255,0.80)',border:'1px solid var(--border)'}}
              onClick={e=>e.stopPropagation()}>
              <h2 className="font-display font-bold text-lg mb-1" style={{color:'var(--text-primary)'}}>
                {showTopUp.icon} Top Up Progress
              </h2>
              <p className="text-xs mb-4" style={{color:'var(--text-muted)'}}>
                {showTopUp.title} — sisa {formatCurrency(showTopUp.targetAmount - showTopUp.currentAmount)}
              </p>
              <input type="number" className="input-glass mb-4" placeholder="Jumlah (Rp)"
                value={topUpAmount} onChange={e=>setTopUpAmount(e.target.value)} autoFocus/>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={()=>setShowTopUp(null)} className="btn-ghost py-3">Batal</button>
                <button onClick={handleTopUp} disabled={saving} className="btn-primary py-3">
                  {saving ? '...' : '+ Tambah'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
