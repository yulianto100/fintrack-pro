'use client'
import { motion } from 'framer-motion'
import type { Goal } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Trash2, Target } from 'lucide-react'

interface Props { goal: Goal; onDelete: (id:string)=>void; onTopUp: (goal:Goal)=>void }

export function GoalCard({ goal, onDelete, onTopUp }: Props) {
  const pct     = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
  const remain  = goal.targetAmount - goal.currentAmount
 
  const motivation =
    pct >= 100 ? '🎉 Goal tercapai! Luar biasa!' :
    pct >= 80  ? `🔥 Hampir sampai! Kurang ${formatCurrency(remain)}` :
    pct >= 50  ? `💪 Sudah separuh jalan!` :
    pct >= 25  ? `📈 Terus semangat!` :
    '🚀 Perjalanan baru dimulai'

  return (
    <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
      className="glass-card p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background:`${goal.color}18` }}>{goal.icon}</div>
          <div>
            <p className="font-semibold text-sm" style={{ color:'var(--text-primary)' }}>{goal.title}</p>
            <p className="text-xs" style={{ color:'var(--text-muted)' }}>
              {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>onDelete(goal.id)} className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background:'var(--red-dim)', color:'var(--red)' }}>
            <Trash2 size={12}/>
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-bar mb-2">
        <motion.div className="progress-bar-fill"
          initial={{ width:0 }} animate={{ width:`${pct}%` }}
          transition={{ duration:0.8, ease:'easeOut' }}
          style={{ background:`linear-gradient(90deg, ${goal.color}, ${goal.color}cc)` }}/>
      </div>

      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted">
  {pct >= 100
    ? '🎉 Goal tercapai!'
    : pct >= 75
    ? '🔥 Dikit lagi!'
    : pct >= 50
    ? '💪 Setengah jalan!'
    : '🚀 Yuk mulai nabung!'}
</p>      
      </div>

      <p className="text-xs mb-3" style={{ color:'var(--text-secondary)' }}>{motivation}</p>

      {pct < 100 && (
        <button onClick={()=>onTopUp(goal)}
          className="w-full py-2 rounded-xl text-xs font-semibold transition-all"
          style={{ background:goal.color+'20', color:goal.color, border:`1px solid ${goal.color}35` }}>
          + Top Up Progress
        </button>
      )}
    </motion.div>
  )
}
