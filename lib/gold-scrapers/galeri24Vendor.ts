import * as cheerio from 'cheerio'
import { fetchHtml, isPlausibleGoldPrice, parseRupiah } from './http'
import type { VendorPriceResult, VendorSource } from './types'

export const GALERI24_PRICE_URL = 'https://galeri24.co.id/harga-emas'

type Galeri24Vendor = Extract<VendorSource, 'antam' | 'ubs' | 'galeri24'>

const SECTION_LABELS: Record<Galeri24Vendor, string> = {
  antam: 'ANTAM',
  ubs: 'UBS',
  galeri24: 'GALERI 24',
}

function parseVendorSection(
  source: Galeri24Vendor,
  text: string,
): Pick<VendorPriceResult, 'buyPrice' | 'sellPrice' | 'spread' | 'vendorUpdatedAt'> | null {
  const label = SECTION_LABELS[source]
  const marker = `Harga ${label} Berat Harga Jual Harga Buyback`
  const markerIndex = text.indexOf(marker)
  if (markerIndex < 0) return null

  const beforeMarker = text.slice(Math.max(0, markerIndex - 140), markerIndex)
  const dateMatch = beforeMarker.match(/Diperbarui\s+([^]+?)\s*$/)
  const section = text.slice(markerIndex + marker.length, markerIndex + marker.length + 1400)
  const rowRegex = /(0\.5|1|2|3|5|10|25|50|100|250|500|1000)Rp(\d{1,3}(?:\.\d{3})+)Rp(\d{1,3}(?:\.\d{3})+)/g
  const rowMatch = Array.from(section.matchAll(rowRegex)).find((row) => row[1] === '1')

  if (!rowMatch) return null

  const buyPrice = parseRupiah(rowMatch[2])
  const sellPrice = parseRupiah(rowMatch[3])
  if (!isPlausibleGoldPrice(buyPrice) || !isPlausibleGoldPrice(sellPrice)) return null

  return {
    buyPrice,
    sellPrice,
    spread: buyPrice - sellPrice,
    vendorUpdatedAt: dateMatch?.[1]?.trim(),
  }
}

export async function scrapeGaleri24Vendor(source: Galeri24Vendor): Promise<VendorPriceResult> {
  const html = await fetchHtml(GALERI24_PRICE_URL, { timeout: 8000, retries: 1 })
  const $ = cheerio.load(html)
  const text = $('body').text().replace(/\s+/g, ' ')
  const parsed = parseVendorSection(source, text)

  if (!parsed) throw new Error(`Galeri24: gagal parse tabel ${SECTION_LABELS[source]}`)

  return {
    source,
    ...parsed,
    updatedAt: new Date().toISOString(),
    isLive: true,
    sourceUrl: GALERI24_PRICE_URL,
  }
}
