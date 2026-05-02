'use client'

import { useEffect, useState } from 'react'
import { motion }              from 'framer-motion'
import { Wallet, AlertCircle, Loader2 } from 'lucide-react'
import { formatCurrency }      from '@/lib/utils'

export type WalletType = 'cash' | 'bank' | 'ewallet'

export interface WalletOption {
  type:      WalletType
  accountId: string | null
  name:      string
  balance:   number
  icon:      string
}

interface Props {
  selected:        WalletOption | null
  onSelect:        (w: WalletOption) => void
  requiredAmount?: number
  /** Aggregate balances from dashboard (cash / bank total / ewallet total) */
  walletBalances?: { cash: number; bank: number; ewallet: number }
}

export function WalletSelectorStep({
  selected,
  onSelect,
  requiredAmount = 0,
  walletBalances,
}: Props) {
  const [options, setOptions] = useState<WalletOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        // Same endpoint used by TransactionModal — proven to work
        const res  = await fetch('/api/wallet-accounts')
        const json = await res.json()
        const accounts: {
          id: string
          name: string
          type: WalletType
          balance?: number
          currentBalance?: number
        }[] = json.data || json.accounts || []

        const list: WalletOption[] = []

        // ── Cash (always show, use aggregate balance from prop) ──────────────
        const cashBal = walletBalances?.cash ?? 0
        list.push({
          type:      'cash',
          accountId: null,
          name:      'Cash',
          balance:   cashBal,
          icon:      '💵',
        })

        // ── Bank accounts ────────────────────────────────────────────────────
        const bankAccounts = accounts.filter(a => a.type === 'bank')
        if (bankAccounts.length > 0) {
          for (const acc of bankAccounts) {
            list.push({
              type:      'bank',
              accountId: acc.id,
              name:      acc.name,
              balance:   acc.balance ?? acc.currentBalance ?? (walletBalances?.bank ?? 0),
              icon:      '🏦',
            })
          }
        } else if ((walletBalances?.bank ?? 0) > 0) {
          // Fallback: aggregate bank balance if no individual accounts
          list.push({
            type:      'bank',
            accountId: null,
            name:      'Bank',
            balance:   walletBalances?.bank ?? 0,
            icon:      '🏦',
          })
        }

        // ── E-Wallet accounts ─────────────────────────────────────────────────
        const ewalletAccounts = accounts.filter(a => a.type === 'ewallet')
        if (ewalletAccounts.length > 0) {
          for (const acc of ewalletAccounts) {
            list.push({
              type:      'ewallet',
              accountId: acc.id,
              name:      acc.name,
              balance:   acc.balance ?? acc.currentBalance ?? (walletBalances?.ewallet ?? 0),
              icon:      '📱',
            })
          }
        } else if ((walletBalances?.ewallet ?? 0) > 0) {
          list.push({
            type:      'ewallet',
            accountId: null,
            name:      'E-Wallet',
            balance:   walletBalances?.ewallet ?? 0,
            icon:      '📱',
          })
        }

        setOptions(list)
      } catch {
        // If API fails entirely, fall back to aggregate balances
        if (walletBalances) {
          const fallback: WalletOption[] = [
            { type: 'cash',    accountId: null, name: 'Cash',     balance: walletBalances.cash,    icon: '💵' },
            { type: 'bank',    accountId: null, name: 'Bank',     balance: walletBalances.bank,    icon: '🏦' },
            { type: 'ewallet', accountId: null, name: 'E-Wallet', balance: walletBalances.ewallet, icon: '📱' },
          ].filter(o => o.balance > 0)
          setOptions(fallback)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [walletBalances])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Memuat dompet...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-base font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>
          Pilih sumber dana
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Pilih dompet yang akan digunakan untuk investasi ini
        </p>
      </div>

      <div className="flex flex-col gap-2 mt-1">
        {options.map((opt, i) => {
          const isSelected     = selected?.type === opt.type && selected?.accountId === opt.accountId
          const isInsufficient = requiredAmount > 0 && opt.balance < requiredAmount

          return (
            <motion.button
              key={`${opt.type}-${opt.accountId ?? 'generic'}-${i}`}
              whileTap={{ scale: 0.97 }}
              onClick={() => !isInsufficient && onSelect(opt)}
              className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl text-left"
              style={{
                background: isSelected
                  ? 'rgba(34,197,94,0.12)'
                  : isInsufficient
                  ? 'rgba(239,68,68,0.04)'
                  : 'var(--surface-2)',
                border: `1.5px solid ${
                  isSelected
                    ? 'rgba(34,197,94,0.40)'
                    : isInsufficient
                    ? 'rgba(239,68,68,0.20)'
                    : 'var(--border)'
                }`,
                boxShadow:  isSelected ? '0 4px 16px rgba(34,197,94,0.15)' : 'none',
                opacity:    isInsufficient ? 0.55 : 1,
                cursor:     isInsufficient ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: isSelected ? 'rgba(34,197,94,0.18)' : 'var(--surface-3)' }}>
                {opt.icon}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {opt.name}
                </p>
                <p className="text-xs font-mono font-semibold mt-0.5"
                  style={{ color: isInsufficient ? 'var(--red)' : isSelected ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {formatCurrency(opt.balance)}
                </p>
              </div>

              {/* Status indicator */}
              {isInsufficient ? (
                <div className="flex items-center gap-1 text-[10px] font-semibold flex-shrink-0"
                  style={{ color: 'var(--red)' }}>
                  <AlertCircle size={12} />
                  Tidak cukup
                </div>
              ) : isSelected ? (
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--accent)' }}>
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full border-2 flex-shrink-0"
                  style={{ borderColor: 'var(--border)' }} />
              )}
            </motion.button>
          )
        })}

        {options.length === 0 && (
          <div className="text-center py-8">
            <Wallet size={32} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Tidak ada dompet tersedia</p>
          </div>
        )}
      </div>
    </div>
  )
}
