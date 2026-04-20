'use client'

import type { Transaction, GoldHolding, StockHolding, Deposit, Insight } from '@/types'

interface Props {
  transactions: Transaction[]
  goldHoldings: GoldHolding[]
  stocks:       StockHolding[]
  deposits:     Deposit[]
  totalWealth:  number
  goldValue:    number
}

function generateInsights(props: Props): Insight[] {
  const { transactions, goldValue, stocks, deposits, totalWealth, goldHoldings } = props
  const insights: Insight[] = []

  // ── Spending trend ───────────────────────────────────────────
  const now     = new Date()
  const thisM   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}`
  const lastM   = new Date(now.getFullYear(), now.getMonth() - 1)
  const lastMStr= `${lastM.getFullYear()}-${String(lastM.getMonth() + 1).padStart(2,'0')}`

  const thisExpense = transactions.filter((t) => t.type === 'expense' && t.date.startsWith(thisM)).reduce((s, t) => s + t.amount, 0)
  const lastExpense = transactions.filter((t) => t.type === 'expense' && t.date.startsWith(lastMStr)).reduce((s, t) => s + t.amount, 0)

  if (lastExpense > 0 && thisExpense > 0) {
    const diff = ((thisExpense - lastExpense) / lastExpense) * 100
    if (diff > 20) {
      insights.push({
        type: 'warning', icon: '📈',
        title: `Pengeluaran naik ${diff.toFixed(0)}%`,
        message: 'Pengeluaran bulan ini lebih tinggi dari bulan lalu. Coba tinjau budget Anda.',
      })
    } else if (diff < -15) {
      insights.push({
        type: 'success', icon: '🎉',
        title: `Pengeluaran turun ${Math.abs(diff).toFixed(0)}%`,
        message: 'Luar biasa! Pengeluaran Anda lebih hemat dari bulan lalu.',
      })
    }
  }

  // ── Asset allocation ─────────────────────────────────────────
  if (totalWealth > 0) {
    const goldPct = (goldValue / totalWealth) * 100
    if (goldPct > 70) {
      insights.push({
        type: 'warning', icon: '⚖️',
        title: 'Konsentrasi emas terlalu tinggi',
        message: `${goldPct.toFixed(0)}% aset di emas. Pertimbangkan diversifikasi ke saham atau deposito.`,
      })
    }

    if (stocks.length === 0 && totalWealth > 5_000_000) {
      insights.push({
        type: 'info', icon: '📊',
        title: 'Belum ada investasi saham',
        message: 'Diversifikasi portofolio dengan saham IDX dapat meningkatkan potensi return jangka panjang.',
      })
    }
  }

  // ── Deposit maturity alert ────────────────────────────────────
  const soonDep = deposits.filter((d) => {
    if (d.status !== 'active') return false
    const days = Math.round((new Date(d.maturityDate).getTime() - Date.now()) / 86400_000)
    return days >= 0 && days <= 14
  })
  if (soonDep.length > 0) {
    insights.push({
      type: 'warning', icon: '🏦',
      title: `${soonDep.length} deposito jatuh tempo < 14 hari`,
      message: `${soonDep.map((d) => d.bankName).join(', ')} segera jatuh tempo. Siapkan rencana perpanjangan.`,
    })
  }

  // ── No holdings ──────────────────────────────────────────────
  if (goldHoldings.length === 0 && stocks.length === 0 && deposits.length === 0) {
    insights.push({
      type: 'info', icon: '🚀',
      title: 'Mulai investasi pertama Anda',
      message: 'Tambahkan emas, saham, atau deposito di menu Portofolio untuk mulai membangun kekayaan.',
    })
  }

  return insights.slice(0, 3) // max 3 insights
}

const COLOR: Record<string, { bg: string; border: string; text: string }> = {
  warning: { bg:'rgba(246,204,96,0.08)', border:'rgba(246,204,96,0.22)', text:'#f6cc60' },
  info:    { bg:'rgba(99,179,237,0.08)', border:'rgba(99,179,237,0.22)', text:'#63b3ed' },
  success: { bg:'rgba(52,211,110,0.08)', border:'rgba(52,211,110,0.22)', text:'#34d36e' },
}

export function SmartInsights(props: Props) {
  const insights = generateInsights(props)
  if (insights.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold px-1" style={{ color: 'var(--text-muted)' }}>INSIGHTS</p>
      {insights.map((ins, i) => {
        const c = COLOR[ins.type]
        return (
          <div key={i} className="flex items-start gap-3 p-3 rounded-xl"
            style={{ background: c.bg, border: `1px solid ${c.border}` }}>
            <span className="text-xl flex-shrink-0 mt-0.5">{ins.icon}</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: c.text }}>{ins.title}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{ins.message}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
