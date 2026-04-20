// ============================================
// FINTRACK PRO - TypeScript Types (v2)
// ============================================

export type WalletType = 'cash' | 'bank' | 'ewallet'

export interface User {
  id: string; email: string; name: string; image?: string; createdAt: string
}

// ---- TRANSACTIONS ----
export interface Category {
  id: string; name: string; icon: string
  type: 'income' | 'expense' | 'transfer'
  color: string; userId: string; createdAt: string
}

export type TransactionType = 'income' | 'expense' | 'transfer'

export interface Transaction {
  id: string; userId: string; type: TransactionType
  amount: number; categoryId: string; categoryName?: string; categoryIcon?: string
  description: string; date: string; wallet: WalletType; toWallet?: WalletType
  tags?: string[]; createdAt: string; updatedAt: string
}

export interface WalletBalance { cash: number; bank: number; ewallet: number; total: number }
export interface MonthlyStats  { income: number; expense: number; balance: number; month: string }

// ---- PORTFOLIO: GOLD ----
export type GoldSource  = 'antam' | 'pegadaian' | 'treasury' | 'ubs' | 'galeri24'
export type GoldType    = 'digital' | 'fisik'

export interface GoldHolding {
  id: string; userId: string
  goldType:  GoldType    // digital | fisik
  source:    GoldSource  // provider
  grams:     number
  buyPrice?: number      // avg buy price per gram
  buyDate?:  string
  notes?:    string
  createdAt: string; updatedAt: string
}

export interface GoldPrice {
  source:    GoldSource
  buyPrice:  number   // harga beli (jual ke kita)
  sellPrice: number   // harga jual (buyback)
  spread:    number   // buyPrice - sellPrice
  updatedAt: string
  currency:  string
  isLive:    boolean  // true = real data, false = estimated
}

export interface GoldPriceMap { [key: string]: GoldPrice }

// ---- PORTFOLIO: STOCKS ----
export interface StockHolding {
  id: string; userId: string; symbol: string; lots: number; avgPrice: number
  buyDate?: string; notes?: string; createdAt: string; updatedAt: string
}

export interface StockPrice {
  symbol: string; name: string; currentPrice: number
  change: number; changePercent: number; volume?: number; updatedAt: string
}

export interface StockWithValue extends StockHolding {
  currentPrice: number; currentValue: number; costBasis: number
  profitLoss: number; profitLossPercent: number; stockInfo?: StockPrice
}

// ---- PORTFOLIO: DEPOSITS ----
export interface Deposit {
  id: string; userId: string; bankName: string
  nominal: number; interestRate: number; tenorMonths: number
  startDate: string; maturityDate: string
  finalValue: number; totalInterest: number
  status: 'active' | 'matured' | 'withdrawn'
  notes?: string
  notificationSent?: { h3?: boolean; h2?: boolean; h1?: boolean; h0?: boolean }
  createdAt: string; updatedAt: string
}

export interface DepositWithCountdown extends Deposit {
  daysRemaining: number; percentComplete: number; currentValue: number
}

// ---- PORTFOLIO SUMMARY ----
export interface PortfolioSummary {
  gold:     { totalGrams: number; totalValue: number; totalPnl: number; prices: GoldPriceMap }
  stocks:   { totalValue: number; totalCost: number; totalProfitLoss: number; totalProfitLossPercent: number }
  deposits: { totalNominal: number; totalFinalValue: number; count: number }
  totalNetWorth: number
}

// ---- SMART INSIGHTS ----
export interface Insight {
  type:    'warning' | 'info' | 'success'
  icon:    string
  title:   string
  message: string
}

// ---- NOTIFICATIONS ----
export interface PushSubscriptionData { userId: string; subscription: PushSubscription; createdAt: string }
export interface Notification {
  id: string; userId: string; type: 'deposit_maturity' | 'price_alert' | 'general'
  title: string; message: string; data?: Record<string, unknown>
  read: boolean; createdAt: string
}

// ---- API ----
export interface ApiResponse<T> { success: boolean; data?: T; error?: string; message?: string }

// ---- FILTERS ----
export interface TransactionFilters {
  month?: string; year?: string; categoryId?: string
  type?: TransactionType; wallet?: WalletType; search?: string
}

// ---- EXPORT ----
export interface ExportData {
  transactions: Transaction[]; categories: Category[]
  portfolio: { gold: GoldHolding[]; stocks: StockHolding[]; deposits: Deposit[] }
  exportedAt: string; userId: string
}
