import * as cheerio from 'cheerio'
import { fetchHtml, isPlausibleGoldPrice, parseRupiah } from './http'
import { scrapeFromHargaEmasOrg } from './hargaEmasOrg'
import type { VendorPriceResult } from './types'

const URL = 'https://galeri24.co.id/harga-emas'

function parseGaleri24Section(text: string): { buyPrice: number; sellPrice: number; vendorUpdatedAt?: string } {
  const marker = 'Harga GALERI 24 Berat Harga Jual Harga Buyback'
  const markerIndex = text.indexOf(marker)
  if (markerIndex < 0) return { buyPrice: 0, sellPrice: 0 }

  const beforeMarker = text.slice(Math.max(0, markerIndex - 120), markerIndex)
  const dateMatch = beforeMarker.match(/Diperbarui\s+([^]+?)\s*$/)
  const section = text.slice(markerIndex + marker.length, markerIndex + marker.length + 1200)
  const rowRegex = /(0\.5|1|2|5|10|25|50|100|250|500|1000)Rp(\d{1,3}(?:\.\d{3})+)Rp(\d{1,3}(?:\.\d{3})+)/g
  const rows = Array.from(section.matchAll(rowRegex))
  const rowMatch = rows.find((row) => row[1] === '1')

  if (!rowMatch) {
    const spacedRowMatch = section.match(/(?:^|\s)1\s+Rp\s*([\d.]+)\s+Rp\s*([\d.]+)/)
    if (!spacedRowMatch) return { buyPrice: 0, sellPrice: 0 }

    return {
      buyPrice: parseRupiah(spacedRowMatch[1]),
      sellPrice: parseRupiah(spacedRowMatch[2]),
      vendorUpdatedAt: dateMatch?.[1]?.trim(),
    }
  }

  return {
    buyPrice: parseRupiah(rowMatch[2]),
    sellPrice: parseRupiah(rowMatch[3]),
    vendorUpdatedAt: dateMatch?.[1]?.trim(),
  }
}

export async function scrapeGaleri24(): Promise<VendorPriceResult> {
  try {
    const html = await fetchHtml(URL, { timeout: 8000, retries: 1 })
    const $ = cheerio.load(html)
    const text = $('body').text().replace(/\s+/g, ' ')
    const { buyPrice, sellPrice, vendorUpdatedAt } = parseGaleri24Section(text)

    if (isPlausibleGoldPrice(buyPrice) && isPlausibleGoldPrice(sellPrice)) {
      return {
        source: 'galeri24',
        buyPrice,
        sellPrice,
        spread: buyPrice - sellPrice,
        updatedAt: new Date().toISOString(),
        vendorUpdatedAt,
        isLive: true,
        sourceUrl: URL,
      }
    }
  } catch {
    // Fallback below.
  }

  return scrapeFromHargaEmasOrg('galeri24')
}
