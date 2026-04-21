import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const maxDuration = 30

async function getUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions)
    const id = session?.user?.id
    if (!id || id === 'undefined') return null
    return id
  } catch { return null }
}

export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { image, mimeType = 'image/jpeg' } = body
    const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, '')

    if (!image || typeof image !== 'string') {
      return NextResponse.json({ success: false, error: 'Data gambar tidak valid' }, { status: 400 })
    }

    // Validate base64 (basic check)
    if (!cleanBase64 || cleanBase64.length < 10000) {
      return NextResponse.json({ success: false, error: 'Gambar terlalu kecil atau tidak valid' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Layanan AI belum dikonfigurasi' }, { status: 503 })
    }

    // Use supported MIME type for Anthropic API
    const supportedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const safeMime = 'image/jpeg'

const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.ANTHROPIC_API_KEY!,
    "anthropic-version": "2023-06-01"
  },
  body: JSON.stringify({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1500,
    messages: [...]
  })
})

// 👇 TARO DI SINI
const text = await response.text()
console.log("RAW RESPONSE:", text)

// 👇 ERROR HANDLER
if (!response.ok) {
  return NextResponse.json({
    success: false,
    error: text
  }, { status: response.status })
}

// 👇 baru parse JSON
const data = JSON.parse(text)

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown')
      console.error('[Receipt API] Anthropic error:', response.status, errText)
      return NextResponse.json({
        success: false,
        error: `Layanan AI error (${response.status}). Coba lagi.`,
      }, { status: 502 })
    }

    const aiData = await response.json()
    const textContent = aiData.content
      ?.find((c: { type: string }) => c.type === 'text')
      ?.text as string || ''

    if (!textContent) {
      return NextResponse.json({ success: false, error: 'AI tidak menghasilkan respons' }, { status: 500 })
    }

    // Robust JSON extraction — handles various formatting quirks
    let parsed: Record<string, unknown>
    try {
      // Remove any markdown fences if present
      let jsonStr = textContent
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim()

      // Find JSON object start/end
      const start = jsonStr.indexOf('{')
      const end   = jsonStr.lastIndexOf('}')
      if (start !== -1 && end !== -1) {
        jsonStr = jsonStr.substring(start, end + 1)
      }

      parsed = JSON.parse(jsonStr)
    } catch (parseErr) {
      console.error('[Receipt API] JSON parse error:', parseErr, 'Raw:', textContent)
      return NextResponse.json({
        success: false,
        error: 'AI tidak bisa membaca struk ini. Coba foto yang lebih jelas.',
      }, { status: 422 })
    }

    if (parsed.error) {
      return NextResponse.json({ success: false, error: parsed.error as string }, { status: 422 })
    }

    // Normalize amount — handle various number formats
    let amount = 0
    const rawAmount = parsed.amount
    if (typeof rawAmount === 'number') {
      amount = Math.round(rawAmount)
    } else if (typeof rawAmount === 'string') {
      // Remove thousand separators (dots in ID format or commas in US format)
      const cleaned = (rawAmount as string)
        .replace(/\./g, '')
        .replace(/,/g, '')
        .replace(/[^0-9]/g, '')
      amount = parseInt(cleaned) || 0
    }

    const today = new Date().toISOString().split('T')[0]

    return NextResponse.json({
      success: true,
      data: {
        amount,
        date:        (parsed.date as string)        || today,
        merchant:    (parsed.merchant as string)    || 'Merchant',
        items:       (parsed.items as string)       || '',
        category:    (parsed.category as string)    || 'Belanja',
        wallet:      'bank' as const,
        confidence:  typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
        description: `${parsed.merchant || 'Merchant'}${parsed.items ? ' - ' + (parsed.items as string).slice(0, 60) : ''}`,
      },
    })
  } catch (err) {
    console.error('[Receipt API] Unexpected error:', err)
    return NextResponse.json({ success: false, error: `Error: ${String(err)}` }, { status: 500 })
  }
}
