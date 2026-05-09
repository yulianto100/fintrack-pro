'use client'

import type { WalletType } from '@/types'
import { WalletCard } from './WalletCard'
import { DashboardSectionHeader } from './DashboardSectionHeader'

interface Props {
  walletBalances: Record<WalletType, number>
  hidden: boolean
}

export function WalletSection({ walletBalances, hidden }: Props) {
  return (
    <section className="space-y-3">
      <DashboardSectionHeader title="Dompet" />
      <div className="grid grid-cols-3 gap-3">
        <WalletCard type="cash" balance={walletBalances.cash} hidden={hidden} />
        <WalletCard type="bank" balance={walletBalances.bank} hidden={hidden} />
        <WalletCard type="ewallet" balance={walletBalances.ewallet} hidden={hidden} />
      </div>
    </section>
  )
}
