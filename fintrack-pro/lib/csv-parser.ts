/**
 * lib/csv-parser.ts
 * Utilities for parsing bank mutation CSV files.
 */

export interface CsvRow {
  [key: string]: string
}

export interface ParsedCsvResult {
  headers: string[]
  rows:    CsvRow[]
  raw:     string[][]
}

/** Parse a CSV string into headers + row objects */
export function parseCsv(content: string): ParsedCsvResult {
  // Normalise line endings
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  // Strip BOM if present
  if (lines[0]?.charCodeAt(0) === 0xFEFF) lines[0] = lines[0].slice(1)

  // Find first non-empty line as header
  const headerIdx = lines.findIndex((l) => l.trim().length > 0)
  if (headerIdx === -1) return { headers: [], rows: [], raw: [] }

  const headers = splitCsvLine(lines[headerIdx])
  const raw: string[][] = []
  const rows: CsvRow[] = []

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const cols = splitCsvLine(line)
    raw.push(cols)
    const row: CsvRow = {}
    headers.forEach((h, idx) => { row[h] = (cols[idx] || '').trim() })
    rows.push(row)
  }

  return { headers, rows, raw }
}

/** Split one CSV line respecting quoted commas */
function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQuote = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuote = !inQuote
    } else if ((ch === ',' || ch === ';') && !inQuote) {
      result.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  result.push(cur.trim())
  return result
}

/** Try to parse a date string into YYYY-MM-DD */
export function parseDate(raw: string): string | null {
  if (!raw) return null
  const clean = raw.trim().replace(/['"]/g, '')

  // Common formats: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD MMM YYYY
  const patterns: [RegExp, (m: RegExpMatchArray) => string][] = [
    [/^(\d{4})-(\d{2})-(\d{2})$/,         (m) => `${m[1]}-${m[2]}-${m[3]}`],
    [/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/, (m) => `${m[3]}-${m[2]}-${m[1]}`],
    [/^(\d{1,2}) (\w+) (\d{4})$/,           (m) => {
      const MONTHS: Record<string,string> = {
        jan:'01',feb:'02',mar:'03',apr:'04',mei:'05',may:'05',
        jun:'06',jul:'07',agu:'08',aug:'08',sep:'09',okt:'10',oct:'10',
        nov:'11',des:'12',dec:'12'
      }
      const mo = MONTHS[m[2].toLowerCase().slice(0,3)]
      return mo ? `${m[3]}-${mo}-${m[1].padStart(2,'0')}` : ''
    }],
  ]

  for (const [re, fn] of patterns) {
    const match = clean.match(re)
    if (match) {
      const result = fn(match)
      if (result && !isNaN(Date.parse(result))) return result
    }
  }

  // Fallback: try native Date.parse
  const d = new Date(clean)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  return null
}

/** Parse an amount string: handles "1.000.000", "1,000,000", "Rp 500.000", negatives */
export function parseAmount(raw: string): number {
  if (!raw) return 0
  // Remove currency prefixes, spaces, quotes
  let clean = raw.trim().replace(/['"RpIDR\s]/gi, '')
  // Remove thousands separators (dots before 3 digits at end) — Indonesian style
  // "1.000.000" → "1000000", "1,000,000" → "1000000"
  // Detect separator style by position of last separator
  const dotIdx   = clean.lastIndexOf('.')
  const commaIdx = clean.lastIndexOf(',')

  if (dotIdx > commaIdx) {
    // dot is decimal separator (European) — unlikely in IDR but handle it
    clean = clean.replace(/,/g, '').replace('.', '___').replace(/\./g, '').replace('___', '.')
  } else if (commaIdx > dotIdx) {
    // comma is decimal separator: "1.000,50" → "1000.50"
    clean = clean.replace(/\./g, '').replace(',', '.')
  } else {
    // No decimal: just remove dots and commas as thousands separators
    clean = clean.replace(/[.,]/g, '')
  }

  const num = parseFloat(clean)
  return isNaN(num) ? 0 : num
}

/** Smart keyword categorization for bank mutations */
const CATEGORY_RULES: { keywords: string[]; category: string; type: 'income' | 'expense' | 'transfer' }[] = [
  { keywords: ['gaji','salary','payroll','upah','honorarium'],       category: 'Gaji',         type: 'income'   },
  { keywords: ['bonus','thr','insentif','incentive'],                category: 'Bonus',        type: 'income'   },
  { keywords: ['transfer','trfr','tf','pemindahan'],                 category: 'Transfer',     type: 'transfer' },
  { keywords: ['tokopedia','shopee','bukalapak','lazada','tiktok shop','blibli','jd.id'], category: 'Belanja Online', type: 'expense' },
  { keywords: ['indomaret','alfamart','alfamidi','minimart'],        category: 'Belanja',      type: 'expense'  },
  { keywords: ['grab','gojek','ojek','ojol','taksi'],                category: 'Transportasi', type: 'expense'  },
  { keywords: ['bensin','pertamina','shell','spbu','bbm','pom bensin'], category: 'Bensin',    type: 'expense'  },
  { keywords: ['restoran','resto','kafe','cafe','makan','food','lunch','dinner','warteg','warung','bakso','mcd','kfc','pizza'], category: 'Makan & Minum', type: 'expense' },
  { keywords: ['listrik','pln','air','pdam','telepon','internet','wifi','indihome','first media'], category: 'Tagihan', type: 'expense' },
  { keywords: ['kesehatan','dokter','apotek','apotik','klinik','rumah sakit','rs ','puskesmas'], category: 'Kesehatan', type: 'expense' },
  { keywords: ['pendidikan','sekolah','kampus','kuliah','spp','kursus','les'],     category: 'Pendidikan', type: 'expense' },
  { keywords: ['hiburan','netflix','spotify','youtube','game','bioskop','cinema'], category: 'Hiburan',   type: 'expense' },
  { keywords: ['tagihan','cicilan','kredit','angsuran','kpr'],       category: 'Cicilan',      type: 'expense'  },
  { keywords: ['investasi','saham','emas','reksadana','deposito'],   category: 'Investasi',    type: 'expense'  },
  { keywords: ['penerimaan','kredit','cr ','credit','masuk','dp '],  category: 'Pemasukan',    type: 'income'   },
]

export interface SmartCategory {
  category: string
  type:     'income' | 'expense' | 'transfer'
  confidence: 'high' | 'medium' | 'low'
}

export function smartCategorize(description: string, amount: number, isDebit?: boolean): SmartCategory {
  const desc = description.toLowerCase()

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => desc.includes(kw))) {
      return { category: rule.category, type: rule.type, confidence: 'high' }
    }
  }

  // Fallback: use debit/credit flag or amount sign
  if (isDebit === true  || amount < 0) return { category: 'Pengeluaran', type: 'expense',  confidence: 'low' }
  if (isDebit === false || amount > 0) return { category: 'Pemasukan',   type: 'income',   confidence: 'low' }

  return { category: 'Lainnya', type: 'expense', confidence: 'low' }
}
