'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import type { Transaction, GoldHolding, StockHolding, Deposit, Insight } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface Props {
  transactions: Transaction[]
  goldHoldings: GoldHolding[]
  stocks:       StockHolding[]
  deposits:     Deposit[]
  totalWealth:  number
  goldValue:    number
  stockValue?:  number
  walletTotal?: number
}

// ── Each insight gets a stable dismissal key based on its title slug ──
function toKey(title: string): string {
  return 'insight_dismissed_' + title.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 60)
}

function generateInsights({
  transactions, goldValue, stocks, deposits, totalWealth, goldHoldings, stockValue = 0, walletTotal = 0,
}: Props): Insight[] {
  const insights: Insight[] = []
  const now    = new Date()
  const thisM  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}`
  const lastMDate = new Date(now.getFullYear(), now.getMonth() - 1)
  const lastM  = `${lastMDate.getFullYear()}-${String(lastMDate.getMonth() + 1).padStart(2,'0')}`

  const thisExpense = transactions.filter(t => t.type==='expense' && t.date.startsWith(thisM)).reduce((s,t)=>s+t.amount,0)
  const lastExpense = transactions.filter(t => t.type==='expense' && t.date.startsWith(lastM)).reduce((s,t)=>s+t.amount,0)
  const thisIncome  = transactions.filter(t => t.type==='income'  && t.date.startsWith(thisM)).reduce((s,t)=>s+t.amount,0)

  // 1. Spending trend
  if (lastExpense > 0 && thisExpense > 0) {
    const diff = ((thisExpense - lastExpense) / lastExpense) * 100
    if (diff > 20) {
      insights.push({ type:'warning', icon:'📈',
        title: `Pengeluaran naik ${diff.toFixed(0)}% bulan ini`,
        message: `Lebih tinggi ${formatCurrency(thisExpense - lastExpense)} dari bulan lalu. Tinjau pengeluaranmu.` })
    } else if (diff < -15) {
      insights.push({ type:'success', icon:'🎉',
        title: `Hemat ${Math.abs(diff).toFixed(0)}% bulan ini!`,
        message: `Kamu berhasil hemat ${formatCurrency(lastExpense - thisExpense)} dibanding bulan lalu.` })
    }
  }

  // 2. Cash runway
  if (thisExpense > 0 && walletTotal > 0) {
    const months = walletTotal / thisExpense
    if (months < 3) {
      insights.push({ type:'warning', icon:'⚠️',
        title: `Kas hanya cukup ${months.toFixed(1)} bulan`,
        message: `Berdasarkan pengeluaran bulan ini (${formatCurrency(thisExpense)}). Pertimbangkan tambah pemasukan.` })
    }
  }

  // 3. Biggest expense category
  const catMap: Record<string,number> = {}
  transactions.filter(t=>t.type==='expense' && t.date.startsWith(thisM)).forEach(t=>{
    catMap[t.categoryName||'Lainnya'] = (catMap[t.categoryName||'Lainnya']||0) + t.amount
  })
  const topCat = Object.entries(catMap).sort((a,b)=>b[1]-a[1])[0]
  if (topCat && thisExpense > 0) {
    const pct = (topCat[1]/thisExpense*100).toFixed(0)
    if (parseInt(pct) >= 30) {
      insights.push({ type:'info', icon:'🔍',
        title: `${topCat[0]} menyerap ${pct}% pengeluaran`,
        message: `Total ${formatCurrency(topCat[1])} bulan ini untuk kategori ini.` })
    }
  }

  // 4. Savings rate
  if (thisIncome > 0 && thisExpense > 0) {
    const savingsRate = ((thisIncome - thisExpense) / thisIncome) * 100
    if (savingsRate >= 30) {
      insights.push({ type:'success', icon:'💪',
        title: `Tabungan rate ${savingsRate.toFixed(0)}% — bagus!`,
        message: `Kamu menyimpan ${formatCurrency(thisIncome-thisExpense)} dari total pemasukan bulan ini.` })
    } else if (savingsRate < 0) {
      insights.push({ type:'warning', icon:'🚨',
        title: 'Pengeluaran melebihi pemasukan!',
        message: `Defisit ${formatCurrency(thisExpense-thisIncome)} bulan ini. Segera evaluasi budget.` })
    }
  }

  // 5. Portfolio allocation warning
  if (totalWealth > 0) {
    const goldPct = (goldValue/totalWealth)*100
    if (goldPct > 60) {
      insights.push({ type:'warning', icon:'⚖️',
        title: `${goldPct.toFixed(0)}% aset terkonsentrasi di emas`,
        message: 'Diversifikasi ke saham atau deposito dapat mengurangi risiko.' })
    }
    if (goldValue > 0 && stockValue > 0) {
      insights.push({ type:'info', icon:'📊',
        title: 'Portofolio terdiversifikasi dengan baik',
        message: `Emas ${(goldValue/totalWealth*100).toFixed(0)}% · Saham ${(stockValue/totalWealth*100).toFixed(0)}% dari total aset.` })
    }
  }

  // 6. Deposit maturity alert
  const urgent = deposits.filter(d=>{
    if (d.status!=='active') return false
    const days = Math.round((new Date(d.maturityDate).getTime()-Date.now())/86400000)
    return days>=0 && days<=7
  })
  if (urgent.length>0) {
    insights.push({ type:'warning', icon:'🔔',
      title: `${urgent.length} deposito jatuh tempo minggu ini`,
      message: `${urgent.map(d=>d.bankName).join(', ')} segera jatuh tempo. Rencanakan perpanjangan.` })
  }

  // 7. No investments nudge
  if (goldHoldings.length===0 && stocks.length===0 && deposits.length===0 && totalWealth > 5_000_000) {
    insights.push({ type:'info', icon:'🚀',
      title: 'Mulai berinvestasi sekarang',
      message: 'Uangmu belum bekerja. Pertimbangkan emas, saham, atau deposito untuk pertumbuhan jangka panjang.' })
  }

  return insights.slice(0, 4)
}

const STYLE: Record<string, { bg:string; border:string; text:string }> = {
  warning: { bg:'rgba(252,129,129,0.06)', border:'rgba(252,129,129,0.20)', text:'#fc8181' },
  info:    { bg:'rgba(99,179,237,0.06)',  border:'rgba(99,179,237,0.20)',  text:'#63b3ed' },
  success: { bg:'rgba(52,211,110,0.06)',  border:'rgba(52,211,110,0.20)', text:'#34d36e' },
}

// ── Storage helpers: persist dismissed keys in localStorage ──
const STORAGE_KEY = 'fintrack_dismissed_insights'

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch { return new Set() }
}

function saveDismissed(set: Set<string>): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...set])) } catch { /* noop */ }
}

export function SmartInsights(props: Props) {
  const allInsights = useMemo(() => generateInsights(props), [props])

  // dismissed: Set of title-keys the user has closed this session + across sessions
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  // Hydrate from localStorage only on client
  useEffect(() => {
    setDismissed(loadDismissed())
  }, [])

  const dismiss = useCallback((title: string) => {
    setDismissed(prev => {
      const next = new Set(prev)
      next.add(toKey(title))
      saveDismissed(next)
      return next
    })
  }, [])

  const visible = useMemo(
    () => allInsights.filter(ins => !dismissed.has(toKey(ins.title))),
    [allInsights, dismissed]
  )

  // How many are hidden so we can offer a "restore" if all dismissed
  const hiddenCount = allInsights.length - visible.length

  const restoreAll = useCallback(() => {
    const next = new Set(dismissed)
    allInsights.forEach(ins => next.delete(toKey(ins.title)))
    setDismissed(next)
    saveDismissed(next)
  }, [dismissed, allInsights])

  if (allInsights.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-[11px] font-semibold" style={{ color:'var(--text-muted)' }}>INSIGHTS</p>
        {hiddenCount > 0 && hiddenCount === allInsights.length && (
          <button
            onClick={restoreAll}
            className="text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors"
            style={{ color:'var(--accent)', background:'var(--accent-dim)', border:'1px solid rgba(52,211,110,0.2)' }}>
            Tampilkan ({hiddenCount})
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {visible.map((ins) => {
          const s = STYLE[ins.type]
          return (
            <motion.div
              key={ins.title}
              layout
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 0 }}
              exit={{ opacity: 0, height: 0, scale: 0.97, transition: { duration: 0.2 } }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div
                className="flex items-start gap-3 p-3.5 rounded-2xl relative"
                style={{ background: s.bg, border: `1px solid ${s.border}` }}
              >
                {/* Icon */}
                <span className="text-xl flex-shrink-0 mt-0.5">{ins.icon}</span>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-5">
                  <p className="text-sm font-semibold leading-tight" style={{ color: s.text }}>
                    {ins.title}
                  </p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color:'var(--text-muted)' }}>
                    {ins.message}
                  </p>
                </div>

                {/* Dismiss button */}
                <button
                  onClick={() => dismiss(ins.title)}
                  aria-label="Tutup insight ini"
                  className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: `${s.border}`,
                    color: s.text,
                    opacity: 0.7,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
                >
                  <X size={10} strokeWidth={2.5} />
                </button>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>

      {/* Show subtle hint when some (but not all) are dismissed */}
      {hiddenCount > 0 && hiddenCount < allInsights.length && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex justify-end px-1"
        >
          <button
            onClick={restoreAll}
            className="text-[10px] font-medium transition-colors"
            style={{ color:'var(--text-muted)' }}>
            + {hiddenCount} insight disembunyikan · Tampilkan
          </button>
        </motion.div>
      )}
    </div>
  )
}
