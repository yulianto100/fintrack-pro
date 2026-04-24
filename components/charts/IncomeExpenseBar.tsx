'use client'
import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { Transaction } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface Props { transactions: Transaction[] }

export function IncomeExpenseBar({ transactions }: Props) {
  const data = useMemo(() => {
    const months: string[] = []
    for (let i=4; i>=0; i--) {
      const d = new Date(); d.setMonth(d.getMonth()-i)
      months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)
    }
    return months.map(m => {
      const label = new Date(m+'-01').toLocaleDateString('id-ID',{month:'short'})
      const inc = transactions.filter(t=>t.type==='income'  && t.date.startsWith(m)).reduce((s,t)=>s+t.amount,0)
      const exp = transactions.filter(t=>t.type==='expense' && t.date.startsWith(m)).reduce((s,t)=>s+t.amount,0)
      return { month:label, Pemasukan:inc, Pengeluaran:exp }
    })
  }, [transactions])

  if (data.every(d=>d.Pemasukan===0 && d.Pengeluaran===0)) return null
  return (
    <div>
      <p className="text-[11px] font-semibold mb-3 px-1" style={{ color:'var(--text-muted)' }}>PEMASUKAN VS PENGELUARAN</p>
      <div className="glass-card p-4" style={{ height:160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="35%" margin={{ top:4, right:4, left:0, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(52,211,110,0.06)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill:'#4a7d62', fontSize:10 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip formatter={(v:number,n:string)=>[formatCurrency(v),n]}
              contentStyle={{ background:'rgba(18,48,30,0.97)',border:'1px solid rgba(52,211,110,0.25)',borderRadius:8,fontSize:11 }} cursor={false} />
            <Bar dataKey="Pemasukan"   fill="#34d36e" radius={[10, 10, 0, 0]}
  activeBar={false} />
            <Bar dataKey="Pengeluaran" fill="#fc8181" radius={[10, 10, 0, 0]}
  activeBar={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 mt-2 px-1">
        {[{c:'#34d36e',l:'Pemasukan'},{c:'#fc8181',l:'Pengeluaran'}].map(({c,l})=>(
          <div key={l} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background:c }}/>
            <span className="text-[10px]" style={{ color:'var(--text-muted)' }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
