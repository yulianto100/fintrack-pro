import { create } from 'zustand'
import type { GoldPriceMap, StockPrice, GoldHolding, StockHolding, Deposit } from '@/types'

interface AppStore {
  // Gold prices (real-time, 10s refresh)
  goldPrices:      GoldPriceMap | null
  goldLastUpdated: Date | null
  goldIsLive:      boolean
  goldLoading:     boolean
  setGoldPrices:   (p: GoldPriceMap, isLive?: boolean) => void

  // Portfolio holdings
  goldHoldings:    GoldHolding[]
  stocks:          StockHolding[]
  deposits:        Deposit[]
  stockPrices:     Record<string, StockPrice | null>

  setGoldHoldings: (h: GoldHolding[]) => void
  setStocks:       (h: StockHolding[]) => void
  setDeposits:     (d: Deposit[]) => void
  setStockPrices:  (p: Record<string, StockPrice | null>) => void
}

export const useStore = create<AppStore>((set) => ({
  goldPrices:      null,
  goldLastUpdated: null,
  goldIsLive:      false,
  goldLoading:     true,
  setGoldPrices: (goldPrices, goldIsLive = false) =>
    set({ goldPrices, goldLastUpdated: new Date(), goldIsLive, goldLoading: false }),

  goldHoldings: [],
  stocks:       [],
  deposits:     [],
  stockPrices:  {},

  setGoldHoldings: (goldHoldings) => set({ goldHoldings }),
  setStocks:       (stocks)        => set({ stocks }),
  setDeposits:     (deposits)      => set({ deposits }),
  setStockPrices:  (stockPrices)   => set({ stockPrices }),
}))
