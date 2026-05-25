import * as cheerio from 'cheerio'
import { fetchHtml, fetchJson, isPlausibleGoldPrice, parseRupiah } from './http'
import { scrapeFromHargaEmasOrg } from './hargaEmasOrg'
import type { VendorPriceResult } from './types'

const URL = 'https://sahabat.pegadaian.co.id/harga-emas'
const API_URL = 'https://sahabat.pegadaian.co.id/api/price'

interface PegadaianApiResponse {
  data?: {
    harga_jual?: number
    harga_beli?: number
    hargaJual?: number
    hargaBeli?: number
  }
}

function parseHtmlPrice(html: string): { buyPrice: number; sellPrice: number } {
  const $ = cheerio.load(html)
  let buyPrice = 0
  let sellPrice = 0

  $('*').each((_, el) => {
    const text = $(el).text().trim().replace(/\s+/g, ' ')
    if (text.length > 180) return

    const lower = text.toLowerCase()
    const price = parseRupiah(text)
    if (!isPlausibleGoldPrice(price)) return

    if (lower.includes('harga jual') && buyPrice === 0) buyPrice = price
    if ((lower.includes('harga beli') || lower.includes('buyback')) && sellPrice === 0) sellPrice = price
  })

  return { buyPrice, sellPrice }
}

export async function scrapePegadaian(): Promise<VendorPriceResult> {
  try {
    const data = await fetchJson<PegadaianApiResponse>(API_URL, { timeout: 5000, retries: 0 })
    const buyPrice = data.data?.harga_jual ?? data.data?.hargaJual ?? 0
    const sellPrice = data.data?.harga_beli ?? data.data?.hargaBeli ?? 0

    if (isPlausibleGoldPrice(buyPrice) && isPlausibleGoldPrice(sellPrice)) {
      return {
        source: 'pegadaian',
        buyPrice,
        sellPrice,
        spread: buyPrice - sellPrice,
        updatedAt: new Date().toISOString(),
        isLive: true,
        sourceUrl: API_URL,
      }
    }
  } catch {
    // Fallback to HTML.
  }

  try {
    const html = await fetchHtml(URL, { timeout: 8000, retries: 0 })
    const { buyPrice, sellPrice: parsedSellPrice } = parseHtmlPrice(html)

    if (isPlausibleGoldPrice(buyPrice)) {
      const sellPrice = isPlausibleGoldPrice(parsedSellPrice)
        ? parsedSellPrice
        : Math.round(buyPrice * 0.95)

      return {
        source: 'pegadaian',
        buyPrice,
        sellPrice,
        spread: buyPrice - sellPrice,
        updatedAt: new Date().toISOString(),
        isLive: true,
        sourceUrl: URL,
      }
    }
  } catch {
    // Fallback to aggregator.
  }

  return scrapeFromHargaEmasOrg('pegadaian')
}
