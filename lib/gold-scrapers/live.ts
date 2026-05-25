import { scrapeAntam } from './antam'
import { scrapeGaleri24 } from './galeri24'
import { scrapeIamutakiGold } from './iamutaki'
import { scrapePegadaian } from './pegadaian'
import { scrapeTreasury } from './treasury'
import { scrapeUbs } from './ubs'
import type { VendorPriceResult, VendorScraper, VendorSource } from './types'

export const GOLD_VENDOR_SOURCES: VendorSource[] = ['antam', 'ubs', 'pegadaian', 'galeri24', 'treasury']

const FALLBACK_SCRAPERS: Record<VendorSource, VendorScraper> = {
  antam: scrapeAntam,
  ubs: scrapeUbs,
  pegadaian: scrapePegadaian,
  galeri24: scrapeGaleri24,
  treasury: scrapeTreasury,
}

export async function scrapeGoldVendor(source: VendorSource): Promise<VendorPriceResult> {
  try {
    return await scrapeIamutakiGold(source)
  } catch (error) {
    console.warn(`[gold/${source}] iamutaki failed:`, error instanceof Error ? error.message : error)
    return FALLBACK_SCRAPERS[source]()
  }
}
