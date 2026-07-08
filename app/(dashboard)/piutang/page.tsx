'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HandCoins, Plus, Search, CalendarClock, CheckCircle2, AlertTriangle, X, Wallet, ReceiptText } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApiList } from '@/hooks/useApiData'
import { formatCurrency } from '@/lib/utils'
import { haptics } from '@/lib/haptics'
import type { Loan, LoanPayment, WalletAccount } from '@/types'

const STATUS: Record<Loan['status'], { label: string; tone: string; bg: string }> = {
  active: { label: 'Aktif', tone: 'var(--accent)', bg: 'rgba(34,197,94,0.10)' },
  overdue: { label: 'Telat', tone: 'var(--red)', bg: 'rgba(248,113,113,0.12)' },
  paid: { label: 'Lunas', tone: 'var(--blue)', bg: 'rgba(99,179,237,0.12)' },
  written_off: { label: 'Dihapuskan', tone: 'var(--text-muted)', bg: 'var(--surface-3)' },
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function ModalShell({ title, subtitle, children, onClose }: { title: string; subtitle: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-3 pb-3 sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <button aria-label="Tutup" className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: 28, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 28, opacity: 0, scale: 0.98 }}
        className="relative w-full max-w-lg rounded-[28px] overflow-hidden"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', boxShadow: '0 28px 80px rgba(0,0,0,0.30)' }}
      >
        <div className="flex items-start justify-between gap-4 p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{title}</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>
        <div className="p-5 max-h-[72dvh] overflow-y-auto">{children}</div>
      </motion.div>
    </motion.div>
  )
}

export default function PiutangPage() {
  const { data: loans, refetch } = useApiList<Loan>('/api/loans', { refreshMs: 30000 })
  const { data: accounts } = useApiList<WalletAccount>('/api/wallet-accounts')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'paid' | 'overdue'>('active')
  const [showAdd, setShowAdd] = useState(false)
  const [payLoan, setPayLoan] = useState<Loan | null>(null)
  const [detailLoan, setDetailLoan] = useState<Loan | null>(null)
  const [payments, setPayments] = useState<LoanPayment[]>([])
  const [saving, setSaving] = useState(false)

  const [loanForm, setLoanForm] = useState({ personName: '', principalAmount: '', loanDate: today(), dueDate: '', walletAccountId: '', note: '' })
  const [payForm, setPayForm] = useState({ amount: '', paymentDate: today(), walletAccountId: '', note: '' })

  const activeLoans = loans.filter((l) => l.status === 'active' || l.status === 'overdue')
  const overdueLoans = loans.filter((l) => l.status === 'overdue')
  const paidThisMonth = loans
    .filter((l) => l.status === 'paid' && l.updatedAt?.startsWith(today().slice(0, 7)))
    .reduce((s, l) => s + Number(l.principalAmount || 0), 0)
  const totalReceivable = activeLoans.reduce((s, l) => s + Number(l.remainingAmount || 0), 0)

  const filteredLoans = useMemo(() => loans.filter((loan) => {
    const matchesQuery = loan.personName.toLowerCase().includes(query.toLowerCase()) || loan.note?.toLowerCase().includes(query.toLowerCase())
    const matchesFilter = filter === 'all' ? true : filter === 'active' ? loan.status === 'active' || loan.status === 'overdue' : loan.status === filter
    return matchesQuery && matchesFilter
  }), [loans, query, filter])

  const addLoan = async () => {
    if (!loanForm.personName.trim() || !loanForm.principalAmount) { toast.error('Nama dan nominal wajib diisi'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/loans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...loanForm, principalAmount: Number(loanForm.principalAmount) }) })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      haptics.success(); toast.success('Piutang ditambahkan')
      setShowAdd(false); setLoanForm({ personName: '', principalAmount: '', loanDate: today(), dueDate: '', walletAccountId: '', note: '' })
      refetch(); window.dispatchEvent(new CustomEvent('fintrack:wallet-updated')); window.dispatchEvent(new CustomEvent('fintrack:transactions-updated'))
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal menambah piutang') }
    finally { setSaving(false) }
  }

  const pay = async () => {
    if (!payLoan || !payForm.amount) return
    setSaving(true)
    try {
      const res = await fetch(`/api/loans/${payLoan.id}/payments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payForm, amount: Number(payForm.amount) }) })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      haptics.success(); toast.success(Number(payForm.amount) >= payLoan.remainingAmount ? 'Piutang lunas 🎉' : 'Pembayaran dicatat')
      setPayLoan(null); setPayForm({ amount: '', paymentDate: today(), walletAccountId: '', note: '' })
      refetch(); window.dispatchEvent(new CustomEvent('fintrack:wallet-updated')); window.dispatchEvent(new CustomEvent('fintrack:transactions-updated'))
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Gagal mencatat pembayaran') }
    finally { setSaving(false) }
  }

  const openDetail = async (loan: Loan) => {
    setDetailLoan(loan); setPayments([])
    const res = await fetch(`/api/loans/${loan.id}/payments`)
    const json = await res.json().catch(() => null)
    if (json?.success) setPayments(json.data || [])
  }

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--accent)' }}>UANG DIPINJAM ORANG</p>
          <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>Piutang</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Catat pinjaman keluar, cicilan, sisa, jatuh tempo.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="h-11 px-4 rounded-2xl flex items-center gap-2 font-semibold text-sm" style={{ background: 'var(--accent)', color: '#05130B' }}>
          <Plus size={18} /> Baru
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-[24px] p-4" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.18), rgba(34,197,94,0.05))', border: '1px solid rgba(34,197,94,0.18)' }}>
          <HandCoins size={20} style={{ color: 'var(--accent)' }} />
          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>Total piutang aktif</p>
          <p className="text-lg font-display font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalReceivable)}</p>
        </div>
        <div className="rounded-[24px] p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <CalendarClock size={20} style={{ color: overdueLoans.length ? 'var(--red)' : 'var(--accent)' }} />
          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>Belum lunas / telat</p>
          <p className="text-lg font-display font-bold" style={{ color: 'var(--text-primary)' }}>{activeLoans.length} orang / {overdueLoans.length} telat</p>
        </div>
      </div>

      <div className="rounded-[24px] p-3 mb-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 px-2 py-2 rounded-2xl mb-3" style={{ background: 'var(--surface-2)' }}>
          <Search size={17} style={{ color: 'var(--text-muted)' }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama peminjam..." className="bg-transparent outline-none flex-1 text-sm" style={{ color: 'var(--text-primary)' }} />
        </div>
        <div className="grid grid-cols-4 gap-1">
          {(['active', 'overdue', 'paid', 'all'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className="rounded-2xl py-2 text-xs font-semibold" style={{ background: filter === f ? 'var(--accent)' : 'var(--surface-2)', color: filter === f ? '#05130B' : 'var(--text-muted)' }}>
              {f === 'active' ? 'Aktif' : f === 'overdue' ? 'Telat' : f === 'paid' ? 'Lunas' : 'Semua'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredLoans.map((loan) => {
          const pct = loan.principalAmount ? Math.min(100, (loan.paidAmount / loan.principalAmount) * 100) : 0
          const status = STATUS[loan.status]
          return (
            <motion.div key={loan.id} layout className="rounded-[26px] p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold truncate" style={{ color: 'var(--text-primary)' }}>{loan.personName}</h3>
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold" style={{ color: status.tone, background: status.bg }}>{status.label}</span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{loan.dueDate ? `Jatuh tempo ${loan.dueDate}` : 'Tanpa jatuh tempo'} {loan.walletAccountName ? `• ${loan.walletAccountName}` : ''}</p>
                </div>
                {loan.status === 'overdue' ? <AlertTriangle size={20} style={{ color: 'var(--red)' }} /> : loan.status === 'paid' ? <CheckCircle2 size={20} style={{ color: 'var(--blue)' }} /> : <HandCoins size={20} style={{ color: 'var(--accent)' }} />}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
                <div><p style={{ color: 'var(--text-muted)' }}>Total</p><p className="font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(loan.principalAmount)}</p></div>
                <div><p style={{ color: 'var(--text-muted)' }}>Dibayar</p><p className="font-bold" style={{ color: 'var(--blue)' }}>{formatCurrency(loan.paidAmount)}</p></div>
                <div><p style={{ color: 'var(--text-muted)' }}>Sisa</p><p className="font-bold" style={{ color: 'var(--accent)' }}>{formatCurrency(loan.remainingAmount)}</p></div>
              </div>
              <div className="h-2 rounded-full mt-3 overflow-hidden" style={{ background: 'var(--surface-3)' }}><div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--accent)' }} /></div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <button onClick={() => openDetail(loan)} className="rounded-2xl py-2 text-sm font-semibold" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>Detail</button>
                <button disabled={loan.remainingAmount <= 0 || loan.status === 'written_off'} onClick={() => { setPayLoan(loan); setPayForm((p) => ({ ...p, amount: String(loan.remainingAmount) })) }} className="rounded-2xl py-2 text-sm font-semibold disabled:opacity-45" style={{ background: 'var(--accent)', color: '#05130B' }}>Catat Bayar</button>
              </div>
            </motion.div>
          )
        })}
        {filteredLoans.length === 0 && <div className="text-center py-14 rounded-[28px]" style={{ background: 'var(--surface-1)', border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>Belum ada piutang di filter ini.</div>}
      </div>

      <div className="mt-4 rounded-[22px] p-4 text-xs" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
        Lunas bulan ini: <b style={{ color: 'var(--text-primary)' }}>{formatCurrency(paidThisMonth)}</b>. Kasih pinjam bukan expense. Bayar balik bukan income. Saldo akun tetap otomatis gerak.
      </div>

      <AnimatePresence>
        {showAdd && <ModalShell title="Tambah Piutang" subtitle="Saldo akun asal berkurang, piutang tercatat." onClose={() => setShowAdd(false)}>
          <div className="space-y-3">
            <input className="input" placeholder="Nama peminjam" value={loanForm.personName} onChange={(e) => setLoanForm({ ...loanForm, personName: e.target.value })} />
            <input className="input" placeholder="Nominal" type="number" value={loanForm.principalAmount} onChange={(e) => setLoanForm({ ...loanForm, principalAmount: e.target.value })} />
            <select className="input" value={loanForm.walletAccountId} onChange={(e) => setLoanForm({ ...loanForm, walletAccountId: e.target.value })}>
              <option value="">Cash / tanpa akun detail</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} — {formatCurrency(a.balance)}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3"><input className="input" type="date" value={loanForm.loanDate} onChange={(e) => setLoanForm({ ...loanForm, loanDate: e.target.value })} /><input className="input" type="date" value={loanForm.dueDate} onChange={(e) => setLoanForm({ ...loanForm, dueDate: e.target.value })} /></div>
            <textarea className="input min-h-[88px]" placeholder="Catatan optional" value={loanForm.note} onChange={(e) => setLoanForm({ ...loanForm, note: e.target.value })} />
            <button disabled={saving} onClick={addLoan} className="w-full h-12 rounded-2xl font-bold disabled:opacity-60" style={{ background: 'var(--accent)', color: '#05130B' }}>{saving ? 'Menyimpan...' : 'Simpan Piutang'}</button>
          </div>
        </ModalShell>}

        {payLoan && <ModalShell title={`Bayar: ${payLoan.personName}`} subtitle={`Sisa ${formatCurrency(payLoan.remainingAmount)}`} onClose={() => setPayLoan(null)}>
          <div className="space-y-3">
            <input className="input" placeholder="Nominal dibayar" type="number" max={payLoan.remainingAmount} value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} />
            <select className="input" value={payForm.walletAccountId} onChange={(e) => setPayForm({ ...payForm, walletAccountId: e.target.value })}>
              <option value="">Masuk Cash / tanpa akun detail</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} — {formatCurrency(a.balance)}</option>)}
            </select>
            <input className="input" type="date" value={payForm.paymentDate} onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })} />
            <textarea className="input min-h-[88px]" placeholder="Catatan optional" value={payForm.note} onChange={(e) => setPayForm({ ...payForm, note: e.target.value })} />
            <button disabled={saving} onClick={pay} className="w-full h-12 rounded-2xl font-bold disabled:opacity-60" style={{ background: 'var(--accent)', color: '#05130B' }}>{saving ? 'Menyimpan...' : 'Catat Pembayaran'}</button>
          </div>
        </ModalShell>}

        {detailLoan && <ModalShell title={detailLoan.personName} subtitle={`Sisa ${formatCurrency(detailLoan.remainingAmount)} dari ${formatCurrency(detailLoan.principalAmount)}`} onClose={() => setDetailLoan(null)}>
          <div className="space-y-3">
            <div className="rounded-2xl p-4" style={{ background: 'var(--surface-2)' }}>
              <div className="flex items-center gap-2 text-sm font-bold" style={{ color: 'var(--text-primary)' }}><Wallet size={17} /> Info</div>
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>{detailLoan.note || 'Tidak ada catatan.'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>Riwayat pembayaran</p>
              {payments.map((p) => <div key={p.id} className="flex items-center justify-between rounded-2xl p-3" style={{ background: 'var(--surface-2)' }}><div className="flex items-center gap-2"><ReceiptText size={16} style={{ color: 'var(--accent)' }} /><div><p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(p.amount)}</p><p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{p.paymentDate} {p.walletAccountName ? `• ${p.walletAccountName}` : ''}</p></div></div></div>)}
              {payments.length === 0 && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Belum ada pembayaran.</p>}
            </div>
          </div>
        </ModalShell>}
      </AnimatePresence>

      <style jsx global>{`
        .input { width: 100%; border-radius: 18px; padding: 12px 14px; background: var(--surface-2); border: 1px solid var(--border); color: var(--text-primary); outline: none; font-size: 14px; }
        .input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(34,197,94,0.10); }
      `}</style>
    </div>
  )
}
