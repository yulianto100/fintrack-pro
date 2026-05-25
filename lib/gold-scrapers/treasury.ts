import * as cheerio from 'cheerio'
import { fetchHtml, fetchJson, isPlausibleGoldPrice, parseRupiah } from './http'
import type { VendorPriceResult } from './types'

const SITE_URL = 'https://www.treasury.id/'
const API_URL = 'https://api-treasury-web.dev.rollingglory.com/api/v1/external/wp/gold/price'

interface TreasuryPricePoint {
  buy_price?: number | string
  sell_price?: number | string
  datetime?: string
}

interface TreasuryApiResponse {
  data?: {
    attributes?: {
      prices?: TreasuryPricePoint[]
    }
  }
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function formatApiDate(date: Date): string {
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  ].join(' ')
}

function toNumber(value: number | string | undefined): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return parseRupiah(value)
  return 0
}

async function scrapeApi(): Promise<VendorPriceResult> {
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000)
  const data = await fetchJson<TreasuryApiResponse>(API_URL, {
    method: 'POST',
    timeout: 12000,
    retries: 3,
    headers: {
      Origin: SITE_URL,
      Referer: SITE_URL,
    },
    body: {
      start_date: formatApiDate(startDate),
      end_date: formatApiDate(endDate),
    },
  })

  const prices = data.data?.attributes?.prices ?? []
  const latest = [...prices].reverse().find((item) => {
    const buyPrice = toNumber(item.buy_price)
    const sellPrice = toNumber(item.sell_price)
    return isPlausibleGoldPrice(buyPrice) && isPlausibleGoldPrice(sellPrice)
  })

  if (!latest) throw new Error('Treasury: response API tidak berisi harga valid')

  const buyPrice = toNumber(latest.buy_price)
  const sellPrice = toNumber(latest.sell_price)

  return {
    source: 'treasury',
    buyPrice,
    sellPrice,
    spread: buyPrice - sellPrice,
    updatedAt: new Date().toISOString(),
    vendorUpdatedAt: latest.datetime,
    isLive: true,
    sourceUrl: API_URL,
  }
}

async function scrapeHtml(): Promise<VendorPriceResult> {
  const html = await fetchHtml(SITE_URL, { timeout: 8000, retries: 1 })
  const $ = cheerio.load(html)
  let buyPrice = 0
  let sellPrice = 0

  $('*').each((_, el) => {
    const text = $(el).text().trim().replace(/\s+/g, ' ')
    if (text.length > 120) return

    const lower = text.toLowerCase()
    const price = parseRupiah(text)
    if (!isPlausibleGoldPrice(price)) return

    if (lower.includes('harga beli') && buyPrice === 0) buyPrice = price
    if (lower.includes('harga jual') && sellPrice === 0) sellPrice = price
  })

  if (!isPlausibleGoldPrice(buyPrice) || !isPlausibleGoldPrice(sellPrice)) {
    throw new Error('Treasury: gagal parse harga dari homepage')
  }

  return {
    source: 'treasury',
    buyPrice,
    sellPrice,
    spread: buyPrice - sellPrice,
    updatedAt: new Date().toISOString(),
    isLive: true,
    sourceUrl: SITE_URL,
  }
}

export async function scrapeTreasury(): Promise<VendorPriceResult> {
  try {
    return await scrapeApi()
  } catch {
    return scrapeHtml()
  }
}
