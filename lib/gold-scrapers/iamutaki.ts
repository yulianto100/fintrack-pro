import * as cheerio from 'cheerio'
import { fetchHtml, fetchJson, findFirstPlausiblePrice, isPlausibleGoldPrice } from './http'
import type { VendorPriceResult, VendorSource } from './types'

const API_BASE = 'https://logam-mulia-api.iamutaki.workers.dev/api/prices'
const ANTAM_BUYBACK_URL = 'https://www.logammulia.com/id/sell/gold'

type IamutakiEndpoint = 'logammulia' | 'galeri24' | 'pegadaian' | 'treasury'

interface IamutakiPriceItem {
  source?: string
  material?: string
  materialType?: string
  weight?: number
  sellPrice?: number
  buybackPrice?: number
  currency?: string
  recordedDate?: string
  displayName?: string
  urlHomepage?: string
}

interface IamutakiResponse {
  success?: boolean
  data?: IamutakiPriceItem[]
  timestamp?: string
  cached?: boolean
}

interface SourceConfig {
  endpoint: IamutakiEndpoint
  materialType?: string
  weight?: number
  scale?: number
  homepage: string
}

const SOURCE_CONFIG: Record<VendorSource, SourceConfig> = {
  antam: {
    endpoint: 'logammulia',
    materialType: 'Emas Batangan',
    weight: 1,
    homepage: 'https://www.logammulia.com',
  },
  ubs: {
    endpoint: 'galeri24',
    materialType: 'UBS',
    weight: 1,
    homepage: 'https://galeri24.co.id',
  },
  pegadaian: {
    endpoint: 'pegadaian',
    weight: 0.01,
    scale: 100,
    homepage: 'https://sahabat.pegadaian.co.id',
  },
  galeri24: {
    endpoint: 'galeri24',
    materialType: 'GALERI 24',
    weight: 1,
    homepage: 'https://galeri24.co.id',
  },
  treasury: {
    endpoint: 'treasury',
    weight: 1,
    homepage: 'https://www.treasury.id',
  },
}

function normalizeText(value: string | undefined): string {
  return (value || '').trim().toLowerCase()
}

function sameWeight(a: number | undefined, b: number | undefined): boolean {
  if (typeof a !== 'number' || typeof b !== 'number') return false
  return Math.abs(a - b) < 0.0001
}

function findPriceItem(items: IamutakiPriceItem[], config: SourceConfig): IamutakiPriceItem | null {
  return items.find((item) => {
    if (item.material && item.material !== 'gold') return false
    if (config.materialType && normalizeText(item.materialType) !== normalizeText(config.materialType)) return false
    if (config.weight !== undefined && !sameWeight(item.weight, config.weight)) return false
    return true
  }) || null
}

async function fetchAntamBuyback(): Promise<number> {
  const html = await fetchHtml(ANTAM_BUYBACK_URL, { timeout: 30000, retries: 1 })
  const $ = cheerio.load(html)
  return findFirstPlausiblePrice($('body').text())
}

async function resolveSellPrice(source: VendorSource, buyPrice: number, item: IamutakiPriceItem): Promise<number> {
  const apiBuyback = item.buybackPrice || 0
  const scaledBuyback = apiBuyback * (SOURCE_CONFIG[source].scale ?? 1)
  if (isPlausibleGoldPrice(scaledBuyback)) return Math.round(scaledBuyback)

  if (source === 'antam') {
    try {
      const buyback = await fetchAntamBuyback()
      if (isPlausibleGoldPrice(buyback)) return buyback
    } catch {
      // Estimate below.
    }
  }

  return Math.round(buyPrice * 0.95)
}

export async function scrapeIamutakiGold(source: VendorSource): Promise<VendorPriceResult> {
  const config = SOURCE_CONFIG[source]
  const endpointUrl = `${API_BASE}/${config.endpoint}`
  const response = await fetchJson<IamutakiResponse>(endpointUrl, { timeout: 8000, retries: 2 })

  if (!response.success || !response.data) {
    throw new Error(`iamutaki/${source}: response tidak valid`)
  }

  const item = findPriceItem(response.data, config)
  if (!item) throw new Error(`iamutaki/${source}: harga 1 gram tidak ditemukan`)

  const scale = config.scale ?? 1
  const buyPrice = Math.round((item.sellPrice || 0) * scale)
  if (!isPlausibleGoldPrice(buyPrice)) {
    throw new Error(`iamutaki/${source}: harga jual tidak valid`)
  }

  const sellPrice = await resolveSellPrice(source, buyPrice, item)

  return {
    source,
    buyPrice,
    sellPrice,
    spread: buyPrice - sellPrice,
    updatedAt: new Date().toISOString(),
    vendorUpdatedAt: item.recordedDate || response.timestamp,
    isLive: true,
    sourceUrl: endpointUrl,
  }
}
