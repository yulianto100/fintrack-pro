export type VendorSource = 'antam' | 'ubs' | 'pegadaian' | 'galeri24' | 'treasury'

export interface VendorPriceResult {
  source: VendorSource
  buyPrice: number
  sellPrice: number
  spread: number
  updatedAt: string
  vendorUpdatedAt?: string
  isLive: boolean
  sourceUrl: string
}

export type VendorScraper = () => Promise<VendorPriceResult>
