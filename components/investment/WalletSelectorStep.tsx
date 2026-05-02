'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Wallet, AlertCircle, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export type WalletType = 'cash' | 'bank' | 'ewallet'

export interface WalletOption {
  type:      WalletType
  accountId: string | null  // null = generic (cash)
  name:      string
  balance:   number
  icon:      string
}

interface Props {
  selected:         WalletOption | null
  onSelect:         (w: WalletOption) => void
  requiredAmount?:  number  // used for insufficient balance highlight
}

const TYPE_META: Record<WalletType, { icon: string; fallbackName: string }> = {
  cash:    { icon: '💵', fallbackName: 'Cash'    },
  bank:    { icon: '🏦', fallbackName: 'Bank'    },
  ewallet: { icon: '📱', fallbackName: 'E-Wallet'},
}

export function WalletSelectorStep({ selected, onSelect, requiredAmount = 0 }: Props) {
  const [options, setOptions] = useState<WalletOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        // Fetch wallet balances
        const [balRes, accRes] = await Promise.all([
          fetch('/api/wallet-balances').then(r => r.json()),
          fetch('/api/wallet-accounts').then(r => r.json()),
        ])

        const list: WalletOption[] = []

        // Cash — always one entry
        const cashBal = balRes?.data?.cash ?? balRes?.cash ?? 0
        list.push({
          type:      'cash',
          accountId: null,
          name:      'Cash',
          balance:   cashBal,
          icon:      '💵',
        })

        // Bank accounts
        const accounts: { id: string; name: string; type: WalletType; balance?: number }[] =
          accRes?.data || []

        for (const acc of accounts.filter(a => a.type === 'bank')) {
          list.push({
            type:      'bank',
            accountId: acc.id,
            name:      acc.name,
            balance:   acc.balance ?? (balRes?.data?.bank ?? 0),
            icon:      '🏦',
          })
        }

        // If no bank accounts, add generic bank entry
        if (!accounts.some(a => a.type === 'bank')) {
          const bankBal = balRes?.data?.bank ?? balRes?.bank ?? 0
          if (bankBal > 0) {
            list.push({ type: 'bank', accountId: null, name: 'Bank', balance: bankBal, icon: '🏦' })
          }
        }

        // E-Wallet accounts
        for (const acc of accounts.filter(a => a.type === 'ewallet')) {
          list.push({
            type:      'ewallet',
            accountId: acc.id,
            name:      acc.name,
            balance:   acc.balance ?? (balRes?.data?.ewallet ?? 0),
            icon:      '📱',
          })
        }

        // If no ewallet accounts, add generic ewallet entry
        if (!accounts.some(a => a.type === 'ewallet')) {
          const ewBal = balRes?.data?.ewallet ?? balRes?.ewallet ?? 0
          if (ewBal > 0) {
            list.push({ type: 'ewallet', accountId: null, name: 'E-Wallet', balance: ewBal, icon: '📱' })
          }
        }

        setOptions(list)
      } catch {
        // Fallback: use balances from walletBalances prop if API fails
        setOptions([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

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
          const isSelected    = selected?.type === opt.type && selected?.accountId === opt.accountId
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
                boxShadow: isSelected ? '0 4px 16px rgba(34,197,94,0.15)' : 'none',
                opacity:   isInsufficient ? 0.55 : 1,
                cursor:    isInsufficient ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Icon */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{
                  background: isSelected ? 'rgba(34,197,94,0.18)' : 'var(--surface-3)',
                }}
              >
                {opt.icon}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {opt.name}
                </p>
                <p
                  className="text-xs font-mono font-semibold mt-0.5"
                  style={{ color: isInsufficient ? 'var(--red)' : isSelected ? 'var(--accent)' : 'var(--text-muted)' }}
                >
                  {formatCurrency(opt.balance)}
                </p>
              </div>

              {/* Status */}
              {isInsufficient ? (
                <div className="flex items-center gap-1 text-[10px] font-semibold flex-shrink-0"
                  style={{ color: 'var(--red)' }}>
                  <AlertCircle size={12} />
                  Tidak cukup
                </div>
              ) : isSelected ? (
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--accent)' }}
                >
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              ) : (
                <div
                  className="w-5 h-5 rounded-full border-2 flex-shrink-0"
                  style={{ borderColor: 'var(--border)' }}
                />
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
