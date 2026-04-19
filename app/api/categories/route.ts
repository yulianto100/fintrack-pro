import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import type { Category } from '@/types'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  
  const db = getAdminDatabase()
  const snapshot = await db.ref(`users/${session.user.id}/categories`).get()
  
  if (!snapshot.exists()) return NextResponse.json({ success: true, data: [] })
  
  let categories: Category[] = Object.values(snapshot.val())
  if (type) categories = categories.filter((c) => c.type === type)
  categories.sort((a, b) => a.name.localeCompare(b.name))
  
  return NextResponse.json({ success: true, data: categories })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { name, icon, type, color } = await request.json()
  if (!name || !type) return NextResponse.json({ error: 'name and type required' }, { status: 400 })
  
  const db = getAdminDatabase()
  const ref = db.ref(`users/${session.user.id}/categories`)
  const newRef = ref.push()
  
  const category: Category = {
    id: newRef.key!,
    name, icon: icon || '📋', type, color: color || '#6b7280',
    userId: session.user.id,
    createdAt: new Date().toISOString(),
  }
  
  await newRef.set(category)
  return NextResponse.json({ success: true, data: category }, { status: 201 })
}
