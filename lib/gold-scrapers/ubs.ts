import * as cheerio from 'cheerio'
import { fetchHtml, isPlausibleGoldPrice, parseRupiah } from './http'
import { scrapeFromHargaEmasOrg } from './hargaEmasOrg'
import type { VendorPriceResult } from './types'

const URL = 'https://www.logammulia.com/id/harga-emas-hari-ini'
const GALERI24_URL = 'https://galeri24.co.id/harga-emas'

function parseGaleri24Ubs(html: string): VendorPriceResult | null {
  const $ = cheerio.load(html)
  const text = $('body').text().replace(/\s+/g, ' ')
  const marker = 'Harga UBS Berat Harga Jual Harga Buyback'
  const markerIndex = text.indexOf(marker)
  if (markerIndex < 0) return null

  const beforeMarker = text.slice(Math.max(0, markerIndex - 120), markerIndex)
  const dateMatch = beforeMarker.match(/Diperbarui\s+([^]+?)\s*$/)
  const section = text.slice(markerIndex + marker.length, markerIndex + marker.length + 1200)
  const rowRegex = /(0\.5|1|2|5|10|25|50|100|250|500|1000)Rp(\d{1,3}(?:\.\d{3})+)Rp(\d{1,3}(?:\.\d{3})+)/g
  const rowMatch = Array.from(section.matchAll(rowRegex)).find((row) => row[1] === '1')

  if (!rowMatch) return null

  const buyPrice = parseRupiah(rowMatch[2])
  const sellPrice = parseRupiah(rowMatch[3])
  if (!isPlausibleGoldPrice(buyPrice) || !isPlausibleGoldPrice(sellPrice)) return null

  return {
    source: 'ubs',
    buyPrice,
    sellPrice,
    spread: buyPrice - sellPrice,
    updatedAt: new Date().toISOString(),
    vendorUpdatedAt: dateMatch?.[1]?.trim(),
    isLive: true,
    sourceUrl: GALERI24_URL,
  }
}

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
    const html = await fetchHtml(GALERI24_URL, { timeout: 8000, retries: 1 })
    const galeriResult = parseGaleri24Ubs(html)
    if (galeriResult) return galeriResult
  } catch {
    // Fallback to aggregator.
  }

  return scrapeFromHargaEmasOrg('ubs')
}
