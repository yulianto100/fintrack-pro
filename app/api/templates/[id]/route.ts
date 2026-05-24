import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions)
    const id = session?.user?.id
    if (!id || id === 'undefined' || id === 'null') return null
    return id
  } catch {
    return null
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const db = getAdminDatabase()
    await db.ref(`users/${userId}/templates/${params.id}`).remove()
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/templates/[id]]', err)
    return NextResponse.json({ success: false, error: 'Gagal menghapus pintasan' }, { status: 500 })
  }
}
