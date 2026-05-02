'use client'

/**
 * PortfolioInvestButton
 *
 * Drop-in wrapper for the Portfolio page's "Beli Investasi" button.
 * Uses the shared <InvestmentFlow> component with enableWalletSelection=false
 * (portfolio already has wallet context from its own page state).
 *
 * USAGE — replace existing buy button + modal in portfolio page:
 *
 *   import { PortfolioInvestButton } from '@/components/investment/PortfolioInvestButton'
 *
 *   // Where you previously had:
 *   <button onClick={() => setInvestOpen(true)}>Beli Investasi</button>
 *   {investOpen && <OldBuyInvestModal ... />}
 *
 *   // Replace with:
 *   <PortfolioInvestButton
 *     defaultWallet={{ type: 'bank' }}   // or whichever wallet is selected in portfolio
 *     onSuccess={refetch}                // your existing refetch / refresh callback
 *   />
 */

import { useState }        from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp }      from 'lucide-react'
import { InvestmentFlow }  from './InvestmentFlow'

interface Props {
  defaultWallet?: { type: 'cash' | 'bank' | 'ewallet'; accountId?: string | null }
  onSuccess?:     () => void
  /** Render prop — customize the trigger button if needed */
  renderTrigger?: (open: () => void) => React.ReactNode
}

export function PortfolioInvestButton({ defaultWallet, onSuccess, renderTrigger }: Props) {
  const [open, setOpen] = useState(false)

  const trigger = renderTrigger
    ? renderTrigger(() => setOpen(true))
    : (
      <motion.button
        whileTap={{ scale: 0.97 }}
        whileHover={{ scale: 1.02 }}
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold"
        style={{
          background: 'var(--accent)',
          color:      '#000',
          boxShadow:  '0 6px 20px rgba(34,197,94,0.28)',
        }}
      >
        <TrendingUp size={16} strokeWidth={2.5} />
        Beli Investasi
      </motion.button>
    )

  return (
    <>
      {trigger}

      <AnimatePresence>
        {open && (
          <InvestmentFlow
            source="portfolio"
            enableWalletSelection={false}
            defaultWallet={defaultWallet ?? { type: 'bank' }}
            onClose={() => setOpen(false)}
            onSuccess={() => {
              onSuccess?.()
              window.dispatchEvent(new CustomEvent('fintrack:portfolio-updated'))
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
