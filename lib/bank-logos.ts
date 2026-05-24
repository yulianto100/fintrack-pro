export interface BankLogoEntry {
  id: string
  name: string
  domain: string
  logoUrl: string
  fallbackUrl: string
  brandColor: string
  abbr: string
  type: 'bank' | 'ewallet'
}

const clearbit = (domain: string) => `https://logo.clearbit.com/${domain}?size=128`
const commonsFile = (fileName: string) =>
  `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(fileName).replace(/%20/g, '_')}`

export const BANK_LOGOS: BankLogoEntry[] = [
  {
    id: 'bca',
    name: 'BCA',
    domain: 'bca.co.id',
    logoUrl: commonsFile('Bank_Central_Asia.svg'),
    fallbackUrl: clearbit('bca.co.id'),
    brandColor: '#005ea6',
    abbr: 'BCA',
    type: 'bank',
  },
  {
    id: 'mandiri',
    name: 'Mandiri',
    domain: 'bankmandiri.co.id',
    logoUrl: commonsFile('Bank_Mandiri_logo_2016.svg'),
    fallbackUrl: clearbit('bankmandiri.co.id'),
    brandColor: '#003f80',
    abbr: 'MDR',
    type: 'bank',
  },
  {
    id: 'bri',
    name: 'BRI',
    domain: 'bri.co.id',
    logoUrl: commonsFile('BRI_2025_(with_full_name).svg'),
    fallbackUrl: clearbit('bri.co.id'),
    brandColor: '#00529b',
    abbr: 'BRI',
    type: 'bank',
  },
  {
    id: 'bni',
    name: 'BNI',
    domain: 'bni.co.id',
    logoUrl: commonsFile('Bank_Negara_Indonesia_logo_(2004).svg'),
    fallbackUrl: clearbit('bni.co.id'),
    brandColor: '#f68b1e',
    abbr: 'BNI',
    type: 'bank',
  },
  {
    id: 'cimbniaga',
    name: 'CIMB Niaga',
    domain: 'cimbniaga.co.id',
    logoUrl: commonsFile('CIMB_Niaga_logo.svg'),
    fallbackUrl: clearbit('cimbniaga.co.id'),
    brandColor: '#cc0001',
    abbr: 'CMB',
    type: 'bank',
  },
  {
    id: 'bsi',
    name: 'BSI',
    domain: 'bankbsi.co.id',
    logoUrl: commonsFile('Bank_Syariah_Indonesia.svg'),
    fallbackUrl: clearbit('bankbsi.co.id'),
    brandColor: '#00563f',
    abbr: 'BSI',
    type: 'bank',
  },
  {
    id: 'permata',
    name: 'Permata',
    domain: 'permatabank.com',
    logoUrl: commonsFile('Permata_Bank_(2024).svg'),
    fallbackUrl: clearbit('permatabank.com'),
    brandColor: '#e30613',
    abbr: 'PMT',
    type: 'bank',
  },
  {
    id: 'danamon',
    name: 'Danamon',
    domain: 'danamon.co.id',
    logoUrl: commonsFile('Danamon_(2024).svg'),
    fallbackUrl: clearbit('danamon.co.id'),
    brandColor: '#e94e1b',
    abbr: 'DNM',
    type: 'bank',
  },
  {
    id: 'ocbc',
    name: 'OCBC',
    domain: 'ocbc.id',
    logoUrl: commonsFile('Logo-ocbc.svg'),
    fallbackUrl: clearbit('ocbc.id'),
    brandColor: '#e2231a',
    abbr: 'OCB',
    type: 'bank',
  },
  {
    id: 'btn',
    name: 'BTN',
    domain: 'btn.co.id',
    logoUrl: commonsFile('BTN_2024.svg'),
    fallbackUrl: clearbit('btn.co.id'),
    brandColor: '#005ca8',
    abbr: 'BTN',
    type: 'bank',
  },
  {
    id: 'jago',
    name: 'Jago',
    domain: 'jago.com',
    logoUrl: commonsFile('Logo-jago.svg'),
    fallbackUrl: clearbit('jago.com'),
    brandColor: '#ff6a00',
    abbr: 'JGO',
    type: 'bank',
  },
  {
    id: 'jenius',
    name: 'Jenius',
    domain: 'jenius.co.id',
    logoUrl: '',
    fallbackUrl: clearbit('jenius.co.id'),
    brandColor: '#0099a9',
    abbr: 'JNS',
    type: 'bank',
  },
  {
    id: 'sinarmas',
    name: 'Sinarmas',
    domain: 'banksinarmas.com',
    logoUrl: '',
    fallbackUrl: clearbit('banksinarmas.com'),
    brandColor: '#e2231a',
    abbr: 'SIN',
    type: 'bank',
  },
  {
    id: 'panin',
    name: 'Panin',
    domain: 'panin.co.id',
    logoUrl: '',
    fallbackUrl: clearbit('panin.co.id'),
    brandColor: '#005baa',
    abbr: 'PNN',
    type: 'bank',
  },
  {
    id: 'mega',
    name: 'Mega',
    domain: 'bankmega.com',
    logoUrl: '',
    fallbackUrl: clearbit('bankmega.com'),
    brandColor: '#f4c400',
    abbr: 'MEG',
    type: 'bank',
  },
  {
    id: 'uob',
    name: 'UOB',
    domain: 'uob.co.id',
    logoUrl: commonsFile('UOB_Logo.svg'),
    fallbackUrl: clearbit('uob.co.id'),
    brandColor: '#005eb8',
    abbr: 'UOB',
    type: 'bank',
  },
  {
    id: 'hsbc',
    name: 'HSBC',
    domain: 'hsbc.co.id',
    logoUrl: commonsFile('HSBC_logo_(2018).svg'),
    fallbackUrl: clearbit('hsbc.co.id'),
    brandColor: '#db0011',
    abbr: 'HSB',
    type: 'bank',
  },
  {
    id: 'maybank',
    name: 'Maybank',
    domain: 'maybank.co.id',
    logoUrl: commonsFile('Maybank_logo.svg'),
    fallbackUrl: clearbit('maybank.co.id'),
    brandColor: '#ffc600',
    abbr: 'MYB',
    type: 'bank',
  },
  {
    id: 'standardchartered',
    name: 'Standard Chartered',
    domain: 'sc.com',
    logoUrl: '',
    fallbackUrl: clearbit('sc.com'),
    brandColor: '#0f7b3f',
    abbr: 'SC',
    type: 'bank',
  },
  {
    id: 'citibank',
    name: 'Citibank',
    domain: 'citibank.co.id',
    logoUrl: commonsFile('Citi.svg'),
    fallbackUrl: clearbit('citibank.co.id'),
    brandColor: '#004b8d',
    abbr: 'CTI',
    type: 'bank',
  },
  {
    id: 'kbbukopin',
    name: 'KB Bukopin',
    domain: 'kbbukopin.com',
    logoUrl: '',
    fallbackUrl: clearbit('kbbukopin.com'),
    brandColor: '#f58220',
    abbr: 'KBB',
    type: 'bank',
  },
  {
    id: 'btpn',
    name: 'BTPN',
    domain: 'btpn.com',
    logoUrl: commonsFile('BTPN_2014_logo.svg'),
    fallbackUrl: clearbit('btpn.com'),
    brandColor: '#f47b20',
    abbr: 'BTP',
    type: 'bank',
  },
  {
    id: 'megasyariah',
    name: 'Mega Syariah',
    domain: 'megasyariah.co.id',
    logoUrl: '',
    fallbackUrl: clearbit('megasyariah.co.id'),
    brandColor: '#00a651',
    abbr: 'MSY',
    type: 'bank',
  },
  {
    id: 'muamalat',
    name: 'Muamalat',
    domain: 'bankmuamalat.co.id',
    logoUrl: commonsFile('Bank_Muamalat_logo.svg'),
    fallbackUrl: clearbit('bankmuamalat.co.id'),
    brandColor: '#6f2c91',
    abbr: 'MML',
    type: 'bank',
  },
  {
    id: 'gopay',
    name: 'GoPay',
    domain: 'gopay.co.id',
    logoUrl: commonsFile('Gopay_logo.svg'),
    fallbackUrl: clearbit('gopay.co.id'),
    brandColor: '#00aed6',
    abbr: 'GP',
    type: 'ewallet',
  },
  {
    id: 'ovo',
    name: 'OVO',
    domain: 'ovo.id',
    logoUrl: commonsFile('Logo_ovo_purple.svg'),
    fallbackUrl: clearbit('ovo.id'),
    brandColor: '#4c3494',
    abbr: 'OVO',
    type: 'ewallet',
  },
  {
    id: 'dana',
    name: 'DANA',
    domain: 'dana.id',
    logoUrl: commonsFile('Logo_dana_blue.svg'),
    fallbackUrl: clearbit('dana.id'),
    brandColor: '#118eea',
    abbr: 'DNA',
    type: 'ewallet',
  },
  {
    id: 'shopeepay',
    name: 'ShopeePay',
    domain: 'shopee.co.id',
    logoUrl: commonsFile('Shopee_logo.svg'),
    fallbackUrl: clearbit('shopee.co.id'),
    brandColor: '#ee4d2d',
    abbr: 'SPY',
    type: 'ewallet',
  },
  {
    id: 'linkaja',
    name: 'LinkAja',
    domain: 'linkaja.id',
    logoUrl: commonsFile('LinkAja.svg'),
    fallbackUrl: clearbit('linkaja.id'),
    brandColor: '#e82529',
    abbr: 'LJA',
    type: 'ewallet',
  },
  {
    id: 'flip',
    name: 'Flip',
    domain: 'flip.id',
    logoUrl: commonsFile('Flip_logo.svg'),
    fallbackUrl: clearbit('flip.id'),
    brandColor: '#3d7cbf',
    abbr: 'FLP',
    type: 'ewallet',
  },
  {
    id: 'sakuku',
    name: 'Sakuku',
    domain: 'sakuku.bca.co.id',
    logoUrl: commonsFile('Bank_Central_Asia.svg'),
    fallbackUrl: clearbit('sakuku.bca.co.id'),
    brandColor: '#005ea6',
    abbr: 'SKK',
    type: 'ewallet',
  },
  {
    id: 'jeniuspay',
    name: 'Jenius Pay',
    domain: 'jenius.co.id',
    logoUrl: '',
    fallbackUrl: clearbit('jenius.co.id'),
    brandColor: '#0099a9',
    abbr: 'JNP',
    type: 'ewallet',
  },
  {
    id: 'tokopedia',
    name: 'Tokopedia',
    domain: 'tokopedia.com',
    logoUrl: commonsFile('Tokopedia.svg'),
    fallbackUrl: clearbit('tokopedia.com'),
    brandColor: '#03ac0e',
    abbr: 'TKP',
    type: 'ewallet',
  },
]

const normalizeLogoQuery = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')

const ALIAS_TO_ID: Record<string, string> = {
  bankcentralasia: 'bca',
  centralasia: 'bca',
  klikbca: 'bca',
  bankmandiri: 'mandiri',
  mandirionline: 'mandiri',
  livinmandiri: 'mandiri',
  bankrakyatindonesia: 'bri',
  bankbri: 'bri',
  banknegaraindonesia: 'bni',
  bankbni: 'bni',
  cimb: 'cimbniaga',
  cimbniaga: 'cimbniaga',
  bankcimbniaga: 'cimbniaga',
  bankbsi: 'bsi',
  bsimobile: 'bsi',
  banksyariahindonesia: 'bsi',
  permatabank: 'permata',
  bankpermata: 'permata',
  bankdanamon: 'danamon',
  ocbcnisp: 'ocbc',
  bankocbc: 'ocbc',
  bankbtn: 'btn',
  banktabungannegara: 'btn',
  bankjago: 'jago',
  jeniusbtpn: 'jenius',
  banksinarmas: 'sinarmas',
  bankpanin: 'panin',
  paninbank: 'panin',
  bankmega: 'mega',
  uobindonesia: 'uob',
  maybankindonesia: 'maybank',
  standardcharteredbank: 'standardchartered',
  standardcharteredindonesia: 'standardchartered',
  scb: 'standardchartered',
  citi: 'citibank',
  kb: 'kbbukopin',
  bukopin: 'kbbukopin',
  kbbukopin: 'kbbukopin',
  bankbukopin: 'kbbukopin',
  bankbtpn: 'btpn',
  bankmegasyariah: 'megasyariah',
  megasyariah: 'megasyariah',
  bankmuamalat: 'muamalat',
  gopaylater: 'gopay',
  shopee: 'shopeepay',
  spay: 'shopeepay',
  linkaja: 'linkaja',
  sakukubca: 'sakuku',
  jeniuspay: 'jeniuspay',
  tokped: 'tokopedia',
}

const LOGO_BY_ID = new Map(BANK_LOGOS.map((entry) => [entry.id, entry]))

export function getBankLogo(query: string): BankLogoEntry | null {
  const normalized = normalizeLogoQuery(query)
  if (!normalized) return null

  const direct = LOGO_BY_ID.get(normalized)
  if (direct) return direct

  const alias = ALIAS_TO_ID[normalized]
  if (alias) return LOGO_BY_ID.get(alias) ?? null

  for (const entry of BANK_LOGOS) {
    const candidates = [
      entry.id,
      normalizeLogoQuery(entry.name),
      normalizeLogoQuery(entry.domain),
    ]
    if (candidates.some((candidate) => candidate.length >= 3 && (normalized.includes(candidate) || candidate.includes(normalized)))) {
      return entry
    }
  }

  return null
}

export function getBankLogoUrl(query: string): string | null {
  const entry = getBankLogo(query)
  return entry?.logoUrl || entry?.fallbackUrl || null
}
