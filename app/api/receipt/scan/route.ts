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
    const { image, mimeType = 'image/jpeg' } = await request.json()
    if (!image) return NextResponse.json({ success: false, error: 'Image data required' }, { status: 400 })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ success: false, error: 'AI service not configured' }, { status: 503 })

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: image } },
            {
              type: 'text',
              text: `Kamu adalah sistem OCR untuk aplikasi keuangan Indonesia. Analisis struk/bukti pembayaran ini.

Kembalikan HANYA JSON valid:
{
  "amount": <total dalam integer rupiah>,
  "date": "<YYYY-MM-DD, hari ini jika tidak ada>",
  "merchant": "<nama toko>",
  "items": "<ringkasan item max 60 karakter>",
  "category": "<Makan & Minum|Transport|Belanja|Tagihan|Kesehatan|Hiburan|Pendidikan|Lainnya>",
  "wallet": "bank",
  "confidence": <0.0-1.0>
}

Aturan kategori: Indomaret/Alfamart→Belanja, Restoran/cafe→Makan & Minum, Grab/Gojek/bensin→Transport, Listrik/air/internet→Tagihan, Apotek/klinik→Kesehatan, Bioskop/game→Hiburan, Kursus/buku→Pendidikan.

Jika bukan struk: {"error": "Bukan struk yang valid"}

Hanya JSON, tanpa teks lain.`,
            },
          ],
        }],
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ success: false, error: 'AI processing failed' }, { status: 502 })
    }

    const aiData = await response.json()
    const text = aiData.content?.find((c: { type: string }) => c.type === 'text')?.text || ''

    let parsed: Record<string, unknown>
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ success: false, error: 'Gagal membaca struk' }, { status: 422 })
    }

    if (parsed.error) return NextResponse.json({ success: false, error: parsed.error as string }, { status: 422 })

    const today = new Date().toISOString().split('T')[0]
    return NextResponse.json({
      success: true,
      data: {
        amount:      typeof parsed.amount === 'number' ? parsed.amount : parseInt(String(parsed.amount || '0')),
        date:        (parsed.date as string) || today,
        merchant:    (parsed.merchant as string) || 'Merchant',
        items:       (parsed.items as string) || '',
        category:    (parsed.category as string) || 'Lainnya',
        wallet:      'bank' as const,
        confidence:  typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
        description: `${parsed.merchant || ''}${parsed.items ? ' - ' + parsed.items : ''}`.slice(0, 100),
      },
    })
  } catch (err) {
    console.error('[Receipt API]', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
