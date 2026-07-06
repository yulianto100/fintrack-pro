import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parseNaturalLanguage } from '@/lib/nlp-parser'

/**
 * POST /api/ai/parse-transaction
 * Parse natural language input into a structured transaction.
 * Body: { text: string }
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { text } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ success: false, error: 'Text is required' }, { status: 400 })
    }

    const result = parseNaturalLanguage(text)

    return NextResponse.json({
      success: result.success,
      data: result.data || null,
      error: result.error || null,
      suggestions: result.suggestions || [],
    })
  } catch (err) {
    console.error('[POST /api/ai/parse-transaction]', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
