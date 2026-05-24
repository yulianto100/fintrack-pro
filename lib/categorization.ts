/**
 * lib/categorization.ts
 * Auto-categorization engine with keyword mapping + learning system
 */

// ── Default keyword → category name mapping ──────────────────────────────────
const DEFAULT_KEYWORD_MAP: Record<string, string> = {
  // Transport
  gojek: 'Transport', grab: 'Transport', uber: 'Transport', ojol: 'Transport',
  gocar: 'Transport', goride: 'Transport', grabcar: 'Transport', grabfood: 'Transport',
  krl: 'Transport', mrt: 'Transport', transjakarta: 'Transport', busway: 'Transport',
  bensin: 'Transport', parkir: 'Transport', tol: 'Transport', spbu: 'Transport',
  pertamina: 'Transport', shell: 'Transport', indomobil: 'Transport',

  // Food & Beverage
  makan: 'Makanan', minum: 'Makanan', resto: 'Makanan', restaurant: 'Makanan',
  warteg: 'Makanan', warung: 'Makanan', nasi: 'Makanan', bakso: 'Makanan',
  kopi: 'Makanan', coffee: 'Makanan', starbucks: 'Makanan', kfc: 'Makanan',
  mcdonalds: 'Makanan', mcd: 'Makanan', burger: 'Makanan', pizza: 'Makanan',
  'j&t': 'Makanan', jco: 'Makanan', chatime: 'Makanan', boba: 'Makanan',
  indomaret: 'Belanja', alfamart: 'Belanja', superindo: 'Belanja', hypermart: 'Belanja',
  carrefour: 'Belanja', giant: 'Belanja', lottemart: 'Belanja',
  foodpanda: 'Makanan', gofood: 'Makanan', shopeefood: 'Makanan',

  // Shopping
  shopee: 'Belanja', tokopedia: 'Belanja', lazada: 'Belanja', blibli: 'Belanja',
  bukalapak: 'Belanja', tiktokshop: 'Belanja', zalora: 'Belanja', jd: 'Belanja',
  amazon: 'Belanja', ebay: 'Belanja', ikea: 'Belanja', uniqlo: 'Belanja',
  zara: 'Belanja', 'h&m': 'Belanja',

  // Entertainment
  netflix: 'Hiburan', spotify: 'Hiburan', youtube: 'Hiburan', disney: 'Hiburan',
  prime: 'Hiburan', game: 'Hiburan', cinema: 'Hiburan', bioskop: 'Hiburan',
  cgv: 'Hiburan', xxi: 'Hiburan', steam: 'Hiburan', playstation: 'Hiburan',
  vidio: 'Hiburan', viu: 'Hiburan', webtoon: 'Hiburan',

  // Health
  apotek: 'Kesehatan', obat: 'Kesehatan', dokter: 'Kesehatan', klinik: 'Kesehatan',
  rumahsakit: 'Kesehatan', rs: 'Kesehatan', bpjs: 'Kesehatan', gym: 'Kesehatan',
  fitness: 'Kesehatan', fitnes: 'Kesehatan', apotik: 'Kesehatan',

  // Bills & Utilities
  listrik: 'Tagihan', pln: 'Tagihan', pdam: 'Tagihan', air: 'Tagihan',
  internet: 'Tagihan', telkom: 'Tagihan', indihome: 'Tagihan', myrepublic: 'Tagihan',
  firstmedia: 'Tagihan', biznet: 'Tagihan', pulsa: 'Tagihan', token: 'Tagihan',
  cicilan: 'Tagihan', angsuran: 'Tagihan', kredit: 'Tagihan',

  // Education
  spp: 'Pendidikan', kursus: 'Pendidikan', les: 'Pendidikan', buku: 'Pendidikan',
  sekolah: 'Pendidikan', kampus: 'Pendidikan', universitas: 'Pendidikan',
  udemy: 'Pendidikan', coursera: 'Pendidikan', ruangguru: 'Pendidikan',

  // Income
  gaji: 'Gaji', salary: 'Gaji', upah: 'Gaji', bonus: 'Bonus',
  thr: 'Bonus', freelance: 'Freelance', honorarium: 'Freelance',
  dividen: 'Investasi', bunga: 'Investasi', return: 'Investasi',

  // Transfer
  transfer: 'Transfer', kirim: 'Transfer', tarik: 'Transfer',
  topup: 'Top Up', 'top up': 'Top Up', isi: 'Top Up',
}

const STORAGE_KEY = 'finuvo_cat_learning'

// ── Load learned mappings from localStorage ───────────────────────────────────
function loadLearned(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

// ── Save learned mapping ───────────────────────────────────────────────────────
export function learnCategoryMapping(keyword: string, categoryName: string): void {
  if (typeof window === 'undefined') return
  try {
    const learned = loadLearned()
    learned[keyword.toLowerCase().trim()] = categoryName
    localStorage.setItem(STORAGE_KEY, JSON.stringify(learned))
  } catch {
    // silent fail
  }
}

// ── Remove a learned mapping ───────────────────────────────────────────────────
export function removeCategoryMapping(keyword: string): void {
  if (typeof window === 'undefined') return
  try {
    const learned = loadLearned()
    delete learned[keyword.toLowerCase().trim()]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(learned))
  } catch {
    // silent fail
  }
}

// ── Get all learned mappings ───────────────────────────────────────────────────
export function getLearntMappings(): Record<string, string> {
  return loadLearned()
}

/**
 * Fuzzy match score between two strings (0-1).
 * Uses character overlap + substring matching.
 */
function fuzzyScore(input: string, keyword: string): number {
  if (input === keyword) return 1
  if (input.includes(keyword)) return 0.9
  if (keyword.includes(input)) return 0.7

  // Character-level similarity (Dice coefficient)
  const bigrams = (s: string): Set<string> => {
    const set = new Set<string>()
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2))
    return set
  }

  const aBigrams = bigrams(input)
  const bBigrams = bigrams(keyword)
  let intersection = 0
  for (const bg of aBigrams) {
    if (bBigrams.has(bg)) intersection++
  }

  return (2 * intersection) / (aBigrams.size + bBigrams.size)
}

/**
 * Suggest a category name based on description/keywords.
 * Uses exact match first, then fuzzy matching as fallback.
 * Returns null if no match found.
 */
export function suggestCategory(description: string): string | null {
  if (!description || description.length < 2) return null

  const lower = description.toLowerCase().trim()
  const words = lower.split(/\s+/)

  // 1. Check learned mappings first (higher priority) — exact substring
  const learned = loadLearned()
  for (const [keyword, catName] of Object.entries(learned)) {
    if (lower.includes(keyword)) return catName
  }

  // 2. Check default keyword map — exact substring
  for (const [keyword, catName] of Object.entries(DEFAULT_KEYWORD_MAP)) {
    if (lower.includes(keyword)) return catName
  }

  // 3. Multi-word matching: check each word individually
  for (const word of words) {
    if (word.length < 3) continue
    // Learned
    for (const [keyword, catName] of Object.entries(learned)) {
      if (word === keyword) return catName
    }
    // Default
    for (const [keyword, catName] of Object.entries(DEFAULT_KEYWORD_MAP)) {
      if (word === keyword) return catName
    }
  }

  // 4. Fuzzy matching as last resort (threshold: 0.75)
  let bestMatch: { catName: string; score: number } | null = null

  for (const word of words) {
    if (word.length < 4) continue // Skip short words for fuzzy

    for (const [keyword, catName] of Object.entries(DEFAULT_KEYWORD_MAP)) {
      if (keyword.length < 3) continue
      const score = fuzzyScore(word, keyword)
      if (score >= 0.75 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { catName, score }
      }
    }

    for (const [keyword, catName] of Object.entries(learned)) {
      if (keyword.length < 3) continue
      const score = fuzzyScore(word, keyword)
      if (score >= 0.75 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { catName, score }
      }
    }
  }

  return bestMatch?.catName || null
}

/**
 * Given a category name suggestion and a list of categories,
 * find the best matching category ID.
 */
export function findCategoryId(
  suggestedName: string,
  categories: { id: string; name: string; type: string }[],
  transactionType: 'income' | 'expense'
): string | null {
  if (!suggestedName) return null

  const lowerSuggested = suggestedName.toLowerCase()
  const filtered = categories.filter((c) => c.type === transactionType)

  // Exact match
  const exact = filtered.find((c) => c.name.toLowerCase() === lowerSuggested)
  if (exact) return exact.id

  // Partial match
  const partial = filtered.find(
    (c) =>
      c.name.toLowerCase().includes(lowerSuggested) ||
      lowerSuggested.includes(c.name.toLowerCase())
  )
  if (partial) return partial.id

  return null
}

/**
 * Auto-categorize a transaction description and return the best matching category ID.
 * Returns null if no category found.
 */
export function autoCategorize(
  description: string,
  categories: { id: string; name: string; type: string }[],
  transactionType: 'income' | 'expense'
): string | null {
  const suggested = suggestCategory(description)
  if (!suggested) return null
  return findCategoryId(suggested, categories, transactionType)
}
