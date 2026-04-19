// ============================================
// FINTRACK PRO - TypeScript Types
// ============================================

export type WalletType = 'cash' | 'bank' | 'ewallet'

export interface User {
  id: string
  email: string
  name: string
  image?: string
  createdAt: string
}

// ---- TRANSACTIONS ----
export interface Category {
  id: string
  name: string
  icon: string
  type: 'income' | 'expense' | 'transfer'
  color: string
  userId: string
  createdAt: string
}

export type TransactionType = 'income' | 'expense' | 'transfer'

export interface Transaction {
  id: string
  userId: string
  type: TransactionType
  amount: number
  categoryId: string
  categoryName?: string
  categoryIcon?: string
  description: string
  date: string
  wallet: WalletType
  toWallet?: WalletType // for transfer
  tags?: string[]
  createdAt: string
  updatedAt: string
}

export interface WalletBalance {
  cash: number
  bank: number
  ewallet: number
  total: number
}

export interface MonthlyStats {
  income: number
  expense: number
  balance: number
  month: string
}

// ---- PORTFOLIO ----

// Gold
export type GoldSource = 'antam' | 'pegadaian' | 'treasury'

export interface GoldHolding {
  id: string
  userId: string
  grams: number
  source: GoldSource
  buyPrice?: number // harga beli per gram
  buyDate?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface GoldPrice {
  source: GoldSource
  buyPrice: number   // harga beli (bisa beli dari sini)
  sellPrice: number  // harga jual (harga buyback)
  updatedAt: string
  currency: string
}

// Stocks
export interface StockHolding {
  id: string
  userId: string
  symbol: string    // e.g., "BBCA"
  lots: number      // jumlah lot
  avgPrice: number  // harga beli rata-rata per lembar
  buyDate?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface StockPrice {
  symbol: string
  name: string
  currentPrice: number
  change: number        // perubahan nominal
  changePercent: number // perubahan persen
  volume?: number
  marketCap?: number
  updatedAt: string
}

export interface StockWithValue extends StockHolding {
  currentPrice: number
  currentValue: number   // lots × 100 × currentPrice
  costBasis: number      // lots × 100 × avgPrice
  profitLoss: number     // currentValue - costBasis
  profitLossPercent: number
  stockInfo?: StockPrice
}

// Deposits
export interface Deposit {
  id: string
  userId: string
  bankName: string
  nominal: number
  interestRate: number   // % per tahun
  tenorMonths: number
  startDate: string
  maturityDate: string   // calculated
  finalValue: number     // calculated
  totalInterest: number  // calculated
  status: 'active' | 'matured' | 'withdrawn'
  notes?: string
  notificationSent?: {
    h3?: boolean
    h2?: boolean
    h1?: boolean
    h0?: boolean
  }
  createdAt: string
  updatedAt: string
}

export interface DepositWithCountdown extends Deposit {
  daysRemaining: number
  percentComplete: number
  currentValue: number // nilai saat ini (accrued interest)
}

// Portfolio Summary
export interface PortfolioSummary {
  gold: {
    totalGrams: number
    totalValue: number
    prices: Record<GoldSource, GoldPrice>
  }
  stocks: {
    holdings: StockWithValue[]
    totalValue: number
    totalCost: number
    totalProfitLoss: number
    totalProfitLossPercent: number
  }
  deposits: {
    active: DepositWithCountdown[]
    totalNominal: number
    totalFinalValue: number
    totalInterest: number
  }
  totalNetWorth: number
}

// ---- NOTIFICATIONS ----
export interface PushSubscriptionData {
  userId: string
  subscription: PushSubscription
  createdAt: string
}

export interface Notification {
  id: string
  userId: string
  type: 'deposit_maturity' | 'price_alert' | 'general'
  title: string
  message: string
  data?: Record<string, unknown>
  read: boolean
  createdAt: string
}

// ---- API RESPONSES ----
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// ---- FILTERS ----
export interface TransactionFilters {
  month?: string    // format: "2024-07"
  year?: string
  categoryId?: string
  type?: TransactionType
  wallet?: WalletType
  search?: string
}

// ---- IMPORT/EXPORT ----
export interface ExportData {
  transactions: Transaction[]
  categories: Category[]
  portfolio: {
    gold: GoldHolding[]
    stocks: StockHolding[]
    deposits: Deposit[]
  }
  exportedAt: string
  userId: string
}
