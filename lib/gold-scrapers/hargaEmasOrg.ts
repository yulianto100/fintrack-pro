import * as cheerio from 'cheerio'
import type { Element } from 'domhandler'
import { fetchHtml, isPlausibleGoldPrice, parseRupiah } from './http'
import type { VendorPriceResult, VendorSource } from './types'

const URL = 'https://harga-emas.org/'

type AggregatorVendor = Extract<VendorSource, 'antam' | 'ubs' | 'pegadaian' | 'galeri24'>

function cellsFromRow($: cheerio.CheerioAPI, row: Element): string[] {
  return $(row).find('th,td').map((_, cell) => $(cell).text().trim().replace(/\s+/g, ' ')).get()
}

function buildResult(
  source: AggregatorVendor,
  buyPrice: number,
  sellPrice: number,
  vendorUpdatedAt?: string,
): VendorPriceResult {
  return {
    source,
    buyPrice,
    sellPrice,
    spread: buyPrice - sellPrice,
    updatedAt: new Date().toISOString(),
    vendorUpdatedAt,
    isLive: false,
    sourceUrl: URL,
  }
}

function scrapeAntamOrPegadaian(
  $: cheerio.CheerioAPI,
  vendor: Extract<AggregatorVendor, 'antam' | 'pegadaian'>,
): VendorPriceResult | null {
  let buyPrice = 0
  let sellPrice = 0
  let vendorUpdatedAt: string | undefined
  const targetHeader = vendor === 'antam' ? 'antam' : 'pegadaian'

  $('table').each((_, table) => {
    if (buyPrice > 0) return

    const rows = $(table).find('tr').toArray()
    const header = rows.length > 0 ? cellsFromRow($, rows[0]).map((cell) => cell.toLowerCase()) : []
    const vendorIndex = header.findIndex((cell) => cell.includes(targetHeader))
    if (vendorIndex < 0) return

    for (const row of rows) {
      const cells = cellsFromRow($, row)
      if (cells[0] === '1') {
        buyPrice = parseRupiah(cells[vendorIndex] || '')
      }

      const rowText = cells.join(' ')
      if (rowText.toLowerCase().includes(`update harga lm ${targetHeader}`)) {
        vendorUpdatedAt = rowText
      }

      if (vendor === 'antam' && rowText.toLowerCase().includes('harga pembelian kembali')) {
        sellPrice = parseRupiah(rowText.replace(/^.*harga pembelian kembali:/i, ''))
      }
    }
  })

  if (!isPlausibleGoldPrice(buyPrice)) return null
  if (!isPlausibleGoldPrice(sellPrice)) sellPrice = Math.round(buyPrice * 0.95)

  return buildResult(vendor, buyPrice, sellPrice, vendorUpdatedAt)
}

function scrapeUbs($: cheerio.CheerioAPI): VendorPriceResult | null {
  let buyPrice = 0
  let sellPrice = 0

  $('table').each((_, table) => {
    if (buyPrice > 0) return

    const rows = $(table).find('tr').toArray()
    const headerText = rows.length > 0 ? cellsFromRow($, rows[0]).join(' ').toLowerCase() : ''
    if (!headerText.includes('jual') || !headerText.includes('beli')) return

    for (const row of rows) {
      const cells = cellsFromRow($, row)
      if (cells[0] !== '1') continue
      buyPrice = parseRupiah(cells[1] || '')
      sellPrice = parseRupiah(cells[2] || '')
      break
    }
  })

  if (!isPlausibleGoldPrice(buyPrice)) return null
  if (!isPlausibleGoldPrice(sellPrice)) sellPrice = Math.round(buyPrice * 0.948)

  return buildResult('ubs', buyPrice, sellPrice)
}

function scrapeGaleri24($: cheerio.CheerioAPI): VendorPriceResult | null {
  let buyPrice = 0

  $('table tr').each((_, row) => {
    const cells = cellsFromRow($, row)
    const text = cells.join(' ').toLowerCase()
    if (!text.includes('galeri') && !text.includes('g24')) return

    for (const cell of cells) {
      const price = parseRupiah(cell)
      if (isPlausibleGoldPrice(price)) {
        buyPrice = price
        break
      }
    }
  })

  if (!isPlausibleGoldPrice(buyPrice)) return null
  const sellPrice = Math.round(buyPrice * 0.95)
  return buildResult('galeri24', buyPrice, sellPrice)
}

export async function scrapeFromHargaEmasOrg(vendor: AggregatorVendor): Promise<VendorPriceResult> {
  const html = await fetchHtml(URL, { timeout: 8000, retries: 1 })
  const $ = cheerio.load(html)

  const result = vendor === 'antam' || vendor === 'pegadaian'
    ? scrapeAntamOrPegadaian($, vendor)
    : vendor === 'ubs'
      ? scrapeUbs($)
      : scrapeGaleri24($)

  if (!result) throw new Error(`harga-emas.org: tidak menemukan harga untuk ${vendor}`)
  return result
}
