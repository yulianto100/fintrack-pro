import * as cheerio from 'cheerio'
import type { Element } from 'domhandler'
import { fetchHtml, findFirstPlausiblePrice, isPlausibleGoldPrice, parseRupiah } from './http'
import { scrapeFromHargaEmasOrg } from './hargaEmasOrg'
import type { VendorPriceResult } from './types'

const PRICE_URL = 'https://www.logammulia.com/id/harga-emas-hari-ini'
const BUYBACK_URL = 'https://www.logammulia.com/id/sell/gold'

function rowCells($: cheerio.CheerioAPI, row: Element): string[] {
  return $(row).find('td,th').map((_, cell) => $(cell).text().trim().replace(/\s+/g, ' ')).get()
}

function parseBuyPrice(html: string): number {
  const $ = cheerio.load(html)
  let buyPrice = 0
  let inBaseSection = false

  $('table tr').each((_, row) => {
    if (buyPrice > 0) return

    const cells = rowCells($, row)
    if (cells.length === 1) {
      const label = cells[0].toLowerCase()
      inBaseSection = label === 'emas batangan'
      return
    }

    if (!inBaseSection || cells.length < 2) return
    if (/^1\s*gr(?:am)?$/i.test(cells[0])) {
      const price = parseRupiah(cells[1])
      if (isPlausibleGoldPrice(price)) buyPrice = price
    }
  })

  return buyPrice
}

async function scrapeBuyback(): Promise<number> {
  const html = await fetchHtml(BUYBACK_URL, { timeout: 30000, retries: 1 })
  const $ = cheerio.load(html)
  const text = $('body').text()
  return findFirstPlausiblePrice(text)
}

export async function scrapeAntam(): Promise<VendorPriceResult> {
  try {
    const html = await fetchHtml(PRICE_URL, { timeout: 30000, retries: 2 })
    const buyPrice = parseBuyPrice(html)
    if (!isPlausibleGoldPrice(buyPrice)) {
      throw new Error('Antam: gagal parse harga jual 1 gram dari logammulia.com')
    }

    let sellPrice = 0
    try {
      sellPrice = await scrapeBuyback()
    } catch {
      sellPrice = Math.round(buyPrice * 0.95)
    }

    if (!isPlausibleGoldPrice(sellPrice)) sellPrice = Math.round(buyPrice * 0.95)

    return {
      source: 'antam',
      buyPrice,
      sellPrice,
      spread: buyPrice - sellPrice,
      updatedAt: new Date().toISOString(),
      isLive: true,
      sourceUrl: PRICE_URL,
    }
  } catch {
    return scrapeFromHargaEmasOrg('antam')
  }
}
