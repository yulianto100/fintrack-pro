const DEFAULT_TIMEOUT = 8000
const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

interface FetchOptions {
  timeout?: number
  retries?: number
  headers?: Record<string, string>
}

interface JsonFetchOptions extends FetchOptions {
  method?: 'GET' | 'POST'
  body?: unknown
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function withRetry<T>(fn: () => Promise<T>, retries: number): Promise<T> {
  let lastError: unknown = null

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt < retries) await wait(350 * (attempt + 1))
    }
  }

  throw toError(lastError)
}

export async function fetchHtml(url: string, opts?: FetchOptions): Promise<string> {
  const timeout = opts?.timeout ?? DEFAULT_TIMEOUT
  const retries = opts?.retries ?? 1

  return withRetry(async () => {
    const res = await fetch(url, {
      headers: {
        'User-Agent': DEFAULT_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
        ...opts?.headers,
      },
      signal: AbortSignal.timeout(timeout),
      cache: 'no-store',
    })

    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`)
    return res.text()
  }, retries)
}

export async function fetchJson<T = unknown>(url: string, opts?: JsonFetchOptions): Promise<T> {
  const timeout = opts?.timeout ?? DEFAULT_TIMEOUT
  const retries = opts?.retries ?? 1

  return withRetry(async () => {
    const res = await fetch(url, {
      method: opts?.method ?? 'GET',
      headers: {
        'User-Agent': DEFAULT_UA,
        Accept: 'application/json',
        ...(opts?.body ? { 'Content-Type': 'application/json' } : {}),
        ...opts?.headers,
      },
      body: opts?.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: AbortSignal.timeout(timeout),
      cache: 'no-store',
    })

    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`)
    return res.json() as Promise<T>
  }, retries)
}

export function parseRupiah(text: string): number {
  const raw = text.replace(/[^\d.,]/g, '')
  if (!raw) return 0

  const withoutDecimal = /[.,]\d{1,2}$/.test(raw)
    ? raw.replace(/[.,]\d{1,2}$/, '')
    : raw

  const cleaned = withoutDecimal.replace(/[^\d]/g, '')
  return parseInt(cleaned, 10) || 0
}

export function isPlausibleGoldPrice(value: number): boolean {
  return value > 500_000 && value < 10_000_000
}

export function findFirstPlausiblePrice(text: string): number {
  const matches = text.match(/(?:Rp\.?\s*)?[\d.,]+/gi) || []

  for (const match of matches) {
    const value = parseRupiah(match)
    if (isPlausibleGoldPrice(value)) return value
  }

  return 0
}
