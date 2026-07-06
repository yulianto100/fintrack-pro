import { fetchHtml, isPlausibleGoldPrice, parseRupiah } from './http'
import * as cheerio from 'cheerio'
import { scrapeGaleri24Vendor } from './galeri24Vendor'
import { scrapeFromHargaEmasOrg } from './hargaEmasOrg'
import type { VendorPriceResult } from './types'

const URL = 'https://www.logammulia.com/id/harga-emas-hari-ini'

export async function scrapeUbs(): Promise<VendorPriceResult> {
  try {
    const html = await fetchHtml(URL, { timeout: 30000, retries: 1 })
    const $ = cheerio.load(html)
    let buyPrice = 0

    $('tr, .price-row, .row').each((_, row) => {
      if (buyPrice > 0) return

      const text = $(row).text().replace(/\s+/g, ' ')
      if (!text.toLowerCase().includes('ubs')) return

      const matches = text.match(/[\d.,]+/g) || []
      for (const match of matches) {
        const price = parseRupiah(match)
        if (isPlausibleGoldPrice(price)) {
          buyPrice = price
          break
        }
      }
    })

    if (isPlausibleGoldPrice(buyPrice)) {
      const sellPrice = Math.round(buyPrice * 0.948)
      return {
        source: 'ubs',
        buyPrice,
        sellPrice,
        spread: buyPrice - sellPrice,
        updatedAt: new Date().toISOString(),
        isLive: true,
        sourceUrl: URL,
      }
    }
  } catch {
    // Fallback below.
  }

  try {
    return await scrapeGaleri24Vendor('ubs')
  } catch {
    // Fallback to aggregator.
  }

  return scrapeFromHargaEmasOrg('ubs')
}
