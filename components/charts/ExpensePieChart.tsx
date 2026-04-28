'use client'
import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { Transaction } from '@/types'
import { formatCurrency } from '@/lib/utils'

const COLORS = ['#22C55E','#3B82F6','#F59E0B','#EF4444','#A855F7','#14B8A6','#F97316']

interface Props { transactions: Transaction[]; month: string }

export function ExpensePieChart({ transactions, month }: Props) {
  const { data, total } = useMemo(() => {
    const map: Record<string,{ name:string; value:number }> = {}
    transactions.filter(t=>t.type==='expense' && t.date.startsWith(month)).forEach(t=>{
      const k = t.categoryName||'Lainnya'
      map[k] = { name:k, value:(map[k]?.value||0)+t.amount }
    })
    const arr = Object.values(map).sort((a,b)=>b.value-a.value).slice(0,7)
    return { data:arr, total:arr.reduce((s,d)=>s+d.value,0) }
  }, [transactions, month])

  if (data.length===0) return null
  return (
    <div>
      <p className="text-[11px] font-semibold mb-3 px-1" style={{ color:'var(--text-muted)' }}>PENGELUARAN PER KATEGORI</p>
      <div className="glass-card p-4">
        <div className="flex items-center gap-4">
          <div style={{ width:110, height:110, flexShrink:0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" strokeWidth={0}>
                  {data.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} opacity={0.9}/>)}
                </Pie>
                <Tooltip formatter={(v:number)=>[formatCurrency(v),'']}
                  contentStyle={{ background:'var(--surface-sheet)',border:'1px solid rgba(34,197,94,0.18)',borderRadius:8,fontSize:11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-1.5 min-w-0">
            {data.slice(0,5).map((d,i) => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background:COLORS[i%COLORS.length] }}/>
                <p className="text-xs truncate flex-1" style={{ color:'var(--text-secondary)' }}>{d.name}</p>
                <p className="text-xs font-mono font-bold flex-shrink-0" style={{ color:'var(--text-primary)' }}>
                  {total>0 ? (d.value/total*100).toFixed(0) : 0}%
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
