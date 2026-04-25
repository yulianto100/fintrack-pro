// ============================================
// FINTRACK PRO - TypeScript Types (v3)
// ============================================

export type WalletType = 'cash' | 'bank' | 'ewallet'
export type WalletAccountType = 'bank' | 'ewallet'

export interface User {
  id: string; email: string; name: string; image?: string; createdAt: string
}

// ---- WALLET ACCOUNTS ----
export interface WalletAccount {
  id: string
  userId: string
  type: WalletAccountType
  name: string
  balance: number
  createdAt: string
  updatedAt: string
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
  walletAccountId?: string
  toWalletAccountId?: string
  tags?: string[]; createdAt: string; updatedAt: string
}

export interface WalletBalance { cash: number; bank: number; ewallet: number; total: number }
export interface MonthlyStats  { income: number; expense: number; balance: number; month: string }

// ---- PORTFOLIO: GOLD ----
export type GoldSource  = 'antam' | 'pegadaian' | 'treasury' | 'ubs' | 'galeri24'
export type GoldType    = 'digital' | 'fisik'

export interface GoldHolding {
  id: string; userId: string
  goldType:  GoldType
  source:    GoldSource
  grams:     number
  buyPrice?: number
  buyDate?:  string
  notes?:    string
  realizedProfit?: number
  createdAt: string; updatedAt: string
}

export interface GoldPrice {
  source:    GoldSource
  buyPrice:  number
  sellPrice: number
  spread:    number
  updatedAt: string
  currency:  string
  isLive:    boolean
}

export interface GoldPriceMap { [key: string]: GoldPrice }

// ---- PORTFOLIO: STOCKS ----
export interface StockHolding {
  id: string; userId: string; symbol: string; lots: number; avgPrice: number
  buyDate?: string; notes?: string
  realizedProfit?: number
  createdAt: string; updatedAt: string
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
  taxRate?: number
  netInterest?: number
  netFinalValue?: number
  status: 'active' | 'matured' | 'withdrawn'
  notes?: string
  notificationSent?: { h3?: boolean; h2?: boolean; h1?: boolean; h0?: boolean }
  createdAt: string; updatedAt: string
}

export interface DepositWithCountdown extends Deposit {
  daysRemaining: number; percentComplete: number; currentValue: number
}

// ---- PORTFOLIO: SBN ----
export type SBNType = 'ORI' | 'SR' | 'SBR' | 'ST' | 'SBSN'

export interface SBNHolding {
  id: string
  userId: string
  seri: string
  type: SBNType
  nominal: number
  annualRate: number
  taxRate: number
  tenorMonths: number
  startDate: string
  maturityDate: string
  grossReturn: number
  taxAmount: number
  netReturn: number
  totalFinal: number
  status: 'active' | 'matured'
  notes?: string
  createdAt: string
  updatedAt: string
}

// ---- PORTFOLIO: REKSADANA ----
export type ReksadanaType = 'pasar_uang' | 'pendapatan_tetap' | 'campuran' | 'saham' | 'indeks'

export interface ReksadanaHolding {
  id: string
  userId: string
  productName: string
  manager: string
  type: ReksadanaType
  unit: number
  buyNAV: number
  currentNAV: number
  buyDate: string
  notes?: string
  createdAt: string
  updatedAt: string
}

// ---- PORTFOLIO SUMMARY ----
export interface PortfolioSummary {
  gold:      { totalGrams: number; totalValue: number; totalPnl: number; prices: GoldPriceMap }
  stocks:    { totalValue: number; totalCost: number; totalProfitLoss: number; totalProfitLossPercent: number }
  deposits:  { totalNominal: number; totalFinalValue: number; count: number }
  sbn:       { totalNominal: number; totalNetReturn: number; count: number }
  reksadana: { totalValue: number; totalCost: number; totalPnl: number; count: number }
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
  portfolio: {
    gold: GoldHolding[]; stocks: StockHolding[]; deposits: Deposit[]
    sbn?: SBNHolding[]; reksadana?: ReksadanaHolding[]
  }
  exportedAt: string; userId: string
}

// ---- FINANCIAL GOALS ----
export interface Goal {
  id:          string
  userId:      string
  title:       string
  targetAmount: number
  currentAmount: number
  icon:        string
  color:       string
  createdAt:   string
  updatedAt:   string
}

// ---- STREAK ----
export interface UserStreak {
  userId:         string
  currentStreak:  number
  bestStreak:     number
  lastInputDate:  string
  updatedAt:      string
}

// ---- NET WORTH HISTORY ----
export interface NetWorthSnapshot {
  id:        string
  userId:    string
  value:     number
  createdAt: string
}

// ---- BUDGET ----
export interface BudgetCategory {
  id:         string
  userId:     string
  categoryId: string
  categoryName?: string
  categoryIcon?: string
  categoryColor?: string
  limitAmount: number
  month:      string
  createdAt:  string
  updatedAt:  string
}

export interface BudgetStatus extends BudgetCategory {
  spent:   number
  percent: number
  remaining: number
}

// ---- IMPORT LOG ----
export interface ImportLog {
  id:          string
  userId:      string
  fileName:    string
  totalRows:   number
  imported:    number
  skipped:     number
  createdAt:   string
}
