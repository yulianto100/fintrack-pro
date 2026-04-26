import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import type { Category } from '@/types'

async function getUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions)
    const id = session?.user?.id
    if (!id || id === 'undefined' || id === 'null') return null
    return id
  } catch { return null }
}

export async function GET(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  try {
    const db   = getAdminDatabase()
    const snap = await db.ref(`users/${userId}/categories`).get()
    if (!snap.exists()) return NextResponse.json({ success: true, data: [] })

    let cats: Category[] = Object.values(snap.val())
    if (type) cats = cats.filter((c) => c.type === type)
    cats.sort((a, b) => a.name.localeCompare(b.name))
    return NextResponse.json({ success: true, data: cats })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { name, icon, type, color } = await request.json()
    if (!name || !type) return NextResponse.json({ success: false, error: 'name dan type wajib diisi' }, { status: 400 })

    const db     = getAdminDatabase()
    const ref    = db.ref(`users/${userId}/categories`)
    const newRef = ref.push()
    const cat: Category = {
      id: newRef.key!, name, icon: icon || '📋', type, color: color || '#22C55E',
      userId, createdAt: new Date().toISOString(),
    }
    await newRef.set(cat)
    return NextResponse.json({ success: true, data: cat }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
