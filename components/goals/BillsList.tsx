'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays, Check, ChevronDown, Pencil, Trash2, WalletCards, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApiList } from '@/hooks/useApiData'
import { EmptyHint } from '@/components/shared/EmptyHint'
import { formatCurrency } from '@/lib/utils'
import type { Bill, BillRecurring, Category, WalletAccount, WalletType } from '@/types'

interface Props {
  categories: Category[]
  hidden?: boolean
  openAdd: boolean
  onOpenAdd: () => void
  onCloseAdd: () => void
}

interface BillForm {
  name: string
  amount: string
  dueDate: string
  categoryId: string
  recurring: BillRecurring
  notes: string
}

const MASKED = '••••••'

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function emptyForm(): BillForm {
  return {
    name: '',
    amount: '',
    dueDate: todayKey(),
    categoryId: '',
    recurring: 'none',
    notes: '',
  }
}

function parseDateKey(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

function diffDays(date: string): number {
  const due = parseDateKey(date)
  const today = parseDateKey(todayKey())
  return Math.floor((due.getTime() - today.getTime()) / 86400000)
}

function formatDate(date: string): string {
  return parseDateKey(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function recurringLabel(value: BillRecurring): string {
  if (value === 'monthly') return 'Bulanan'
  if (value === 'yearly') return 'Tahunan'
  return 'Sekali'
}

function statusBadge(bill: Bill): { label: string; bg: string; color: string } {
  if (bill.isPaid) {
    return { label: 'Lunas', bg: 'rgba(34,197,94,0.13)', color: 'var(--accent)' }
  }

  const days = diffDays(bill.dueDate)
  if (days < 0) {
    return { label: `Lewat ${Math.abs(days)} hari`, bg: 'rgba(248,113,113,0.14)', color: 'var(--red)' }
  }
  if (days === 0) {
    return { label: 'Hari ini', bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' }
  }
  if (days <= 3) {
    return { label: `${days} hari lagi`, bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' }
  }
  return { label: formatDate(bill.dueDate), bg: 'var(--surface-2)', color: 'var(--text-muted)' }
}

export function BillsList({ categories, hidden = false, openAdd, onOpenAdd, onCloseAdd }: Props) {
  const { data: bills, refetch } = useApiList<Bill>('/api/bills', { refreshMs: 30000 })
  const { data: walletAccounts } = useApiList<WalletAccount>('/api/wallet-accounts', { refreshMs: 30000 })
  const [form, setForm] = useState<BillForm>(emptyForm)
  const [editBill, setEditBill] = useState<Bill | null>(null)
  const [saving, setSaving] = useState(false)
  const [payTargetId, setPayTargetId] = useState<string | null>(null)
  const [payWallet, setPayWallet] = useState<WalletType>('bank')
  const [payWalletAccountId, setPayWalletAccountId] = useState<string>('')
  const [paying, setPaying] = useState(false)

  const sortedBills = useMemo(
    () => [...bills].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [bills],
  )

  const paymentAccounts = useMemo(
    () => payWallet === 'cash' ? [] : walletAccounts.filter((account) => account.type === payWallet),
    [payWallet, walletAccounts],
  )

  useEffect(() => {
    if (openAdd) {
      setEditBill(null)
      setForm(emptyForm())
    }
  }, [openAdd])

  const closeModal = useCallback(() => {
    setEditBill(null)
    setForm(emptyForm())
    onCloseAdd()
  }, [onCloseAdd])

  const openEdit = useCallback((bill: Bill) => {
    setEditBill(bill)
    setForm({
      name: bill.name,
      amount: String(bill.amount),
      dueDate: bill.dueDate,
      categoryId: bill.categoryId || '',
      recurring: bill.recurring,
      notes: bill.notes || '',
    })
  }, [])

  const handleSubmit = useCallback(async () => {
    const amount = Number(form.amount)
    if (!form.name.trim() || !Number.isFinite(amount) || amount <= 0 || !form.dueDate) {
      toast.error('Nama, jumlah, dan tanggal wajib diisi')
      return
    }

    const category = categories.find((item) => item.id === form.categoryId)
    setSaving(true)
    try {
      const res = await fetch(editBill ? `/api/bills/${editBill.id}` : '/api/bills', {
        method: editBill ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          amount,
          dueDate: form.dueDate,
          categoryId: form.categoryId,
          categoryName: category?.name || '',
          categoryIcon: category?.icon || '',
          recurring: form.recurring,
          notes: form.notes.trim(),
        }),
      })
      const json = await res.json() as { success: boolean; error?: string }
      if (!json.success) throw new Error(json.error || 'Gagal menyimpan')
      toast.success(editBill ? 'Tagihan diperbarui' : 'Tagihan ditambahkan')
      closeModal()
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }, [categories, closeModal, editBill, form, refetch])

  const handleDelete = useCallback(async (bill: Bill) => {
    try {
      const res = await fetch(`/api/bills/${bill.id}`, { method: 'DELETE' })
      const json = await res.json() as { success: boolean; error?: string }
      if (!json.success) throw new Error(json.error || 'Gagal hapus')
      toast.success('Tagihan dihapus')
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal hapus')
    }
  }, [refetch])

  const handlePay = useCallback(async (bill: Bill) => {
    setPaying(true)
    try {
      const body: { wallet: WalletType; walletAccountId?: string } = { wallet: payWallet }
      if (payWallet !== 'cash' && payWalletAccountId) body.walletAccountId = payWalletAccountId

      const res = await fetch(`/api/bills/${bill.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json() as { success: boolean; error?: string }
      if (!json.success) throw new Error(json.error || 'Gagal bayar')
      toast.success('Tagihan dibayar')
      setPayTargetId(null)
      setPayWalletAccountId('')
      refetch()
      window.dispatchEvent(new CustomEvent('fintrack:wallet-updated'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal bayar')
    } finally {
      setPaying(false)
    }
  }, [payWallet, payWalletAccountId, refetch])

  const modalOpen = openAdd || editBill !== null

  return (
    <div className="space-y-3">
      {sortedBills.length === 0 ? (
        <div className="glass-card">
          <EmptyHint
            icon={<CalendarDays size={32} style={{ color: 'var(--accent)' }} />}
            title="Belum ada tagihan"
            description="Catat jatuh tempo agar tidak terlewat"
            primaryCta={{ label: 'Tambah Tagihan', onClick: onOpenAdd }}
          />
        </div>
      ) : (
        sortedBills.map((bill, index) => {
          const badge = statusBadge(bill)
          const isPayingThis = payTargetId === bill.id
          return (
            <motion.div
              key={bill.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="glass-card p-4"
              style={{ borderColor: diffDays(bill.dueDate) < 0 && !bill.isPaid ? 'rgba(248,113,113,0.25)' : 'var(--border)' }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-lg"
                  style={{ background: 'var(--surface-2)' }}
                >
                  {bill.categoryIcon || '📅'}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {bill.name}
                    </p>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ background: badge.bg, color: badge.color }}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {formatDate(bill.dueDate)} • {recurringLabel(bill.recurring)}
                  </p>
                  {bill.categoryName && (
                    <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {bill.categoryName}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <p
                    className="font-mono text-sm font-bold"
                    style={{ color: bill.isPaid ? 'var(--text-muted)' : 'var(--red)', letterSpacing: hidden ? 1.5 : 'normal' }}
                  >
                    {hidden ? MASKED : formatCurrency(bill.amount)}
                  </p>
                  <div className="flex items-center gap-1">
                    {!bill.isPaid && (
                      <button
                        type="button"
                        onClick={() => setPayTargetId(isPayingThis ? null : bill.id)}
                        className="rounded-lg px-2 py-1 text-[11px] font-semibold"
                        style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
                      >
                        Bayar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEdit(bill)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg"
                      style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
                      aria-label="Edit tagihan"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => { void handleDelete(bill) }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg"
                      style={{ background: 'var(--red-dim)', color: 'var(--red)' }}
                      aria-label="Hapus tagihan"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {isPayingThis && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 rounded-xl p-3" style={{ background: 'var(--surface-2)' }}>
                      <div className="mb-2 flex items-center gap-2">
                        <WalletCards size={14} style={{ color: 'var(--accent)' }} />
                        <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                          Bayar dari
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {(['cash', 'bank', 'ewallet'] as WalletType[]).map((wallet) => {
                          const active = payWallet === wallet
                          const label = wallet === 'cash' ? 'Cash' : wallet === 'bank' ? 'Bank' : 'E-Wallet'
                          return (
                            <button
                              key={wallet}
                              type="button"
                              onClick={() => {
                                setPayWallet(wallet)
                                setPayWalletAccountId('')
                              }}
                              className="rounded-lg py-2 text-xs font-semibold"
                              style={{
                                background: active ? 'var(--accent-dim)' : 'var(--surface-0)',
                                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                                border: `1px solid ${active ? 'rgba(34,197,94,0.30)' : 'var(--border)'}`,
                              }}
                            >
                              {label}
                            </button>
                          )
                        })}
                      </div>

                      {paymentAccounts.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {paymentAccounts.map((account) => {
                            const active = payWalletAccountId === account.id
                            return (
                              <button
                                key={account.id}
                                type="button"
                                onClick={() => setPayWalletAccountId(active ? '' : account.id)}
                                className="rounded-lg px-2 py-1 text-[11px] font-semibold"
                                style={{
                                  background: active ? 'var(--accent-dim)' : 'var(--surface-0)',
                                  color: active ? 'var(--accent)' : 'var(--text-secondary)',
                                  border: `1px solid ${active ? 'rgba(34,197,94,0.30)' : 'var(--border)'}`,
                                }}
                              >
                                {account.name}
                              </button>
                            )
                          })}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => { void handlePay(bill) }}
                        disabled={paying}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold"
                        style={{ background: 'var(--accent)', color: '#fff', opacity: paying ? 0.75 : 1 }}
                      >
                        {paying ? (
                          <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        ) : (
                          <>
                            <Check size={15} /> Tandai Dibayar
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })
      )}

      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
              onClick={closeModal}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="relative mx-auto w-full max-w-md rounded-t-3xl p-5 sm:rounded-3xl"
              style={{ background: 'var(--surface-modal)', border: '1px solid var(--border)', maxHeight: '90dvh', overflowY: 'auto' }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    Tagihan
                  </p>
                  <h2 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {editBill ? 'Edit tagihan' : 'Tambah tagihan'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ background: 'var(--surface-close)', color: 'var(--text-secondary)' }}
                  aria-label="Tutup form tagihan"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Nama <span style={{ color: 'var(--accent)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input-glass"
                    placeholder="contoh: Internet rumah"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                      Jumlah <span style={{ color: 'var(--accent)' }}>*</span>
                    </label>
                    <input
                      type="number"
                      className="input-glass"
                      placeholder="250000"
                      value={form.amount}
                      onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                      Jatuh tempo <span style={{ color: 'var(--accent)' }}>*</span>
                    </label>
                    <input
                      type="date"
                      className="input-glass"
                      value={form.dueDate}
                      onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Kategori
                  </label>
                  <div className="relative">
                    <select
                      className="input-glass appearance-none pr-8 text-sm"
                      value={form.categoryId}
                      onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                    >
                      <option value="">Tanpa kategori</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.icon} {category.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--text-muted)' }}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Pengulangan
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      ['none', 'Sekali'],
                      ['monthly', 'Bulanan'],
                      ['yearly', 'Tahunan'],
                    ] as const).map(([value, label]) => {
                      const active = form.recurring === value
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, recurring: value }))}
                          className="rounded-xl py-2 text-xs font-semibold"
                          style={{
                            background: active ? 'var(--accent-dim)' : 'var(--surface-2)',
                            color: active ? 'var(--accent)' : 'var(--text-secondary)',
                            border: `1px solid ${active ? 'rgba(34,197,94,0.30)' : 'var(--border)'}`,
                          }}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Catatan
                  </label>
                  <textarea
                    className="input-glass min-h-[82px] resize-none"
                    placeholder="opsional"
                    value={form.notes}
                    onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => { void handleSubmit() }}
                  disabled={saving}
                  className="btn-primary flex w-full items-center justify-center gap-2 py-4"
                >
                  {saving ? (
                    <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <>
                      <Check size={16} /> Simpan
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
