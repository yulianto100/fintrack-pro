/**
 * lib/nlp-parser.ts
 * Natural Language Processing parser for Indonesian financial transactions.
 * Parses text like "Makan siang 50rb" → { type, amount, description, date, wallet }
 */

import type { TransactionType, WalletType } from '@/types'

export interface ParsedTransaction {
  type: TransactionType
  amount: number
  description: string
  date: string
  wallet?: WalletType
  walletAccountId?: string
  confidence: number // 0-1
  rawInput: string
}

export interface ParseResult {
  success: boolean
  data?: ParsedTransaction
  error?: string
  suggestions?: string[]
}

// ── Amount patterns ──────────────────────────────────────────────────────────

const AMOUNT_PATTERNS = [
  // "50rb", "50ribu", "50k"
  { regex: /(\d+(?:[.,]\d+)?)\s*(?:rb|ribu|k)\b/i, multiplier: 1_000 },
  // "1.5jt", "1,5juta", "2jt"
  { regex: /(\d+(?:[.,]\d+)?)\s*(?:jt|juta|m)\b/i, multiplier: 1_000_000 },
  // "Rp 50.000", "Rp50000", "Rp 1.500.000"
  { regex: /(?:rp\.?\s*)(\d{1,3}(?:\.\d{3})*(?:,\d+)?)/i, multiplier: 1 },
  // Plain number with dots as thousand separator: "50.000", "1.500.000"
  { regex: /\b(\d{1,3}(?:\.\d{3})+)\b/, multiplier: 1 },
  // Plain large number: "50000", "1500000" (min 4 digits to avoid matching dates)
  { regex: /\b(\d{4,})\b/, multiplier: 1 },
]

// ── Type indicators ──────────────────────────────────────────────────────────

const INCOME_KEYWORDS = [
  'terima', 'dapat', 'gaji', 'salary', 'bonus', 'thr',
  'freelance', 'honor', 'dividen', 'bunga', 'cashback',
  'refund', 'masuk', 'pemasukan', 'income', 'pendapatan',
]

const TRANSFER_KEYWORDS = [
  'transfer ke', 'tf ke', 'kirim ke', 'bayar ke',
  'pindah ke', 'send to',
]

const EXPENSE_KEYWORDS = [
  'beli', 'bayar', 'buat', 'untuk', 'makan', 'minum',
  'isi', 'topup', 'top up', 'langganan', 'cicilan',
]

// ── Wallet indicators ────────────────────────────────────────────────────────

const WALLET_PATTERNS: { keywords: string[]; wallet: WalletType }[] = [
  { keywords: ['gopay', 'ovo', 'dana', 'shopeepay', 'linkaja', 'ewallet', 'e-wallet'], wallet: 'ewallet' },
  { keywords: ['bca', 'mandiri', 'bri', 'bni', 'bank', 'transfer bank', 'rekening'], wallet: 'bank' },
  { keywords: ['cash', 'tunai', 'kas', 'dompet'], wallet: 'cash' },
]

// ── Date patterns ────────────────────────────────────────────────────────────

const DATE_KEYWORDS: { keywords: string[]; getDate: () => string }[] = [
  {
    keywords: ['kemarin', 'kemaren', 'yesterday'],
    getDate: () => {
      const d = new Date(); d.setDate(d.getDate() - 1)
      return d.toISOString().split('T')[0]
    },
  },
  {
    keywords: ['lusa', 'kemarin lusa'],
    getDate: () => {
      const d = new Date(); d.setDate(d.getDate() - 2)
      return d.toISOString().split('T')[0]
    },
  },
  {
    keywords: ['hari ini', 'today', 'tadi', 'barusan'],
    getDate: () => new Date().toISOString().split('T')[0],
  },
]

// ── Main parser ──────────────────────────────────────────────────────────────

export function parseNaturalLanguage(input: string): ParseResult {
  if (!input || input.trim().length < 3) {
    return { success: false, error: 'Input terlalu pendek' }
  }

  const raw = input.trim()
  const lower = raw.toLowerCase()

  // 1. Extract amount
  const amountResult = extractAmount(lower)
  if (!amountResult) {
    return {
      success: false,
      error: 'Tidak bisa mendeteksi jumlah uang. Coba tulis angka seperti "50rb" atau "Rp 50.000"',
      suggestions: [
        `${raw} 50rb`,
        `${raw} Rp 100.000`,
      ],
    }
  }

  // 2. Determine type
  const type = detectType(lower)

  // 3. Extract description (remove amount and type keywords)
  const description = extractDescription(raw, amountResult.matched)

  // 4. Detect wallet
  const wallet = detectWallet(lower)

  // 5. Detect date
  const date = detectDate(lower)

  // 6. Calculate confidence
  const confidence = calculateConfidence(amountResult.amount, description, type, wallet)

  return {
    success: true,
    data: {
      type,
      amount: amountResult.amount,
      description: description || 'Transaksi',
      date,
      wallet: wallet || undefined,
      confidence,
      rawInput: raw,
    },
  }
}

// ── Helper functions ─────────────────────────────────────────────────────────

function extractAmount(text: string): { amount: number; matched: string } | null {
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern.regex)
    if (match) {
      // Clean the number: remove dots (thousand sep), replace comma with dot (decimal)
      let numStr = match[1]

      if (pattern.multiplier === 1 && numStr.includes('.')) {
        // Check if dots are thousand separators (e.g., "50.000")
        // If last segment after dot is 3 digits, it's a thousand separator
        const parts = numStr.split('.')
        const lastPart = parts[parts.length - 1]
        if (lastPart.length === 3) {
          numStr = parts.join('') // Remove thousand separators
        }
      }

      numStr = numStr.replace(/,/g, '.')
      const num = parseFloat(numStr) * pattern.multiplier

      if (num > 0 && num <= 100_000_000_000) { // max 100 miliar
        return { amount: Math.round(num), matched: match[0] }
      }
    }
  }
  return null
}

function detectType(text: string): TransactionType {
  // Check transfer first (more specific)
  for (const kw of TRANSFER_KEYWORDS) {
    if (text.includes(kw)) return 'transfer'
  }

  // Check income
  for (const kw of INCOME_KEYWORDS) {
    if (text.includes(kw)) return 'income'
  }

  // Default to expense (most common)
  return 'expense'
}

function extractDescription(raw: string, matchedAmount: string): string {
  let desc = raw

  // Remove the matched amount pattern
  desc = desc.replace(new RegExp(escapeRegex(matchedAmount), 'i'), '')

  // Remove common prefixes
  desc = desc.replace(/^(beli|bayar|buat|untuk|catat|tambah|input)\s+/i, '')

  // Remove wallet keywords
  desc = desc.replace(/\b(pakai|pake|dari|lewat|via)\s+(gopay|ovo|dana|shopeepay|bca|mandiri|bri|bni|cash|tunai|bank|ewallet)\b/gi, '')

  // Remove date keywords
  desc = desc.replace(/\b(kemarin|kemaren|yesterday|hari ini|today|tadi|barusan|lusa)\b/gi, '')

  // Remove type keywords at start
  desc = desc.replace(/^(pengeluaran|pemasukan|income|expense|transfer ke)\s*/i, '')

  // Clean up
  desc = desc.replace(/\s+/g, ' ').trim()

  // Capitalize first letter
  if (desc) {
    desc = desc.charAt(0).toUpperCase() + desc.slice(1)
  }

  return desc
}

function detectWallet(text: string): WalletType | null {
  for (const pattern of WALLET_PATTERNS) {
    for (const kw of pattern.keywords) {
      if (text.includes(kw)) return pattern.wallet
    }
  }
  return null
}

function detectDate(text: string): string {
  for (const pattern of DATE_KEYWORDS) {
    for (const kw of pattern.keywords) {
      if (text.includes(kw)) return pattern.getDate()
    }
  }
  // Default: today
  return new Date().toISOString().split('T')[0]
}

function calculateConfidence(
  amount: number,
  description: string,
  type: TransactionType,
  wallet: WalletType | null
): number {
  let score = 0.5 // base

  // Amount found = +0.2
  if (amount > 0) score += 0.2

  // Description found = +0.15
  if (description && description.length > 2) score += 0.15

  // Wallet detected = +0.1
  if (wallet) score += 0.1

  // Type explicitly detected (not default) = +0.05
  if (type !== 'expense') score += 0.05

  return Math.min(1, score)
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ── Quick examples for UI hints ──────────────────────────────────────────────

export const NLP_EXAMPLES = [
  'Makan siang 35rb',
  'Kopi Starbucks 65rb',
  'Gaji bulan ini 8jt',
  'Bayar listrik 450rb',
  'Grab ke kantor 25rb',
  'Belanja Shopee 150rb',
  'Transfer ke teman 100rb',
  'Netflix 54rb',
  'Bensin 50rb kemarin',
]
