import { scrapeGaleri24Vendor } from './galeri24Vendor'
import { scrapeFromHargaEmasOrg } from './hargaEmasOrg'
import type { VendorPriceResult } from './types'

export async function scrapeGaleri24(): Promise<VendorPriceResult> {
  try {
    return await scrapeGaleri24Vendor('galeri24')
  } catch {
    // Fallback below.
  }

  return scrapeFromHargaEmasOrg('galeri24')
}
