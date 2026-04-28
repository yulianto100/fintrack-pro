// ============================================================
// FINUVO — Investment Calculator Utilities
// ============================================================

// ─── SAHAM ──────────────────────────────────────────────────

export interface MergeStockResult {
  totalLots: number
  totalShares: number
  newAvgPrice: number
  modal: number
}

/**
 * Merge an existing stock holding with a new purchase.
 * Weighted average price formula.
 */
export function mergeStock(
  oldLots: number,
  oldAvgPrice: number,
  newLots: number,
  newPrice: number
): MergeStockResult {
  const oldShares = oldLots * 100
  const newShares = newLots * 100
  const totalShares = oldShares + newShares
  const totalLots   = oldLots + newLots
  const newAvgPrice = ((oldAvgPrice * oldShares) + (newPrice * newShares)) / totalShares
  const modal       = newAvgPrice * totalShares
  return { totalLots, totalShares, newAvgPrice, modal }
}

/**
 * Calculate realized profit from a partial/full stock sell.
 */
export function calcStockSellProfit(
  sellLots: number,
  sellPrice: number,
  avgPrice: number
): { sharesSold: number; realizedProfit: number } {
  const sharesSold      = sellLots * 100
  const realizedProfit  = (sellPrice - avgPrice) * sharesSold
  return { sharesSold, realizedProfit }
}

// ─── EMAS ───────────────────────────────────────────────────

/**
 * Calculate realized profit from a partial/full gold sell.
 */
export function calcGoldSellProfit(
  gramSold: number,
  sellPrice: number,
  avgBuyPrice: number
): { realizedProfit: number } {
  const realizedProfit = (sellPrice - avgBuyPrice) * gramSold
  return { realizedProfit }
}

// ─── DEPOSITO ───────────────────────────────────────────────

export interface DepositoResult {
  grossInterest: number   // bunga kotor
  taxAmount: number       // pajak (default 20%)
  netInterest: number     // bunga bersih
  totalFinal: number      // nominal + bunga bersih
  effectiveRate: number   // net rate after tax
}

/**
 * Standard Indonesian deposito calculation.
 * Pajak bunga deposito = 20% (PPh final Ps. 4 ayat 2).
 */
export function calcDeposito(
  nominal: number,
  annualRatePercent: number,
  tenorMonths: number,
  taxRatePercent = 20
): DepositoResult {
  const grossInterest  = nominal * (annualRatePercent / 100) * (tenorMonths / 12)
  const taxAmount      = grossInterest * (taxRatePercent / 100)
  const netInterest    = grossInterest - taxAmount
  const totalFinal     = nominal + netInterest
  const effectiveRate  = (netInterest / nominal) * (12 / tenorMonths) * 100
  return { grossInterest, taxAmount, netInterest, totalFinal, effectiveRate }
}

// ─── SBN ────────────────────────────────────────────────────

export interface SBNResult {
  grossReturn: number   // bunga kotor per periode
  taxAmount: number     // pajak (default 15% untuk SBN)
  netReturn: number     // bunga bersih
  totalFinal: number    // nominal + bunga bersih
}

/**
 * SBN (Surat Berharga Negara) return calculation.
 * Pajak bunga SBN = 10% (SBR/ST/SR) atau 0% (ORI retail individu NPWP).
 * Default 15% sebagai konservatif.
 */
export function calcSBN(
  nominal: number,
  annualRatePercent: number,
  tenorMonths: number,
  taxRatePercent: number
): SBNResult {
  const grossReturn = nominal * (annualRatePercent / 100) * (tenorMonths / 12)
  const taxAmount   = grossReturn * (taxRatePercent / 100)
  const netReturn   = grossReturn - taxAmount
  const totalFinal  = nominal + netReturn
  return { grossReturn, taxAmount, netReturn, totalFinal }
}

// ─── REKSADANA ──────────────────────────────────────────────

export interface ReksadanaResult {
  currentValue: number
  costBasis: number
  profitLoss: number
  profitLossPercent: number
}

export function calcReksadana(
  unit: number,
  currentNAV: number,
  buyNAV: number
): ReksadanaResult {
  const currentValue        = unit * currentNAV
  const costBasis           = unit * buyNAV
  const profitLoss          = currentValue - costBasis
  const profitLossPercent   = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0
  return { currentValue, costBasis, profitLoss, profitLossPercent }
}
