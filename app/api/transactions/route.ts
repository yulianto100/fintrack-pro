import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import type { Transaction, TransactionFilters } from '@/types'

function requireAuth() {
  return getServerSession(authOptions)
}

// GET /api/transactions - list with filters
export async function GET(request: Request) {
  const session = await requireAuth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') // format: "2024-07"
  const categoryId = searchParams.get('categoryId')
  const type = searchParams.get('type')
  const wallet = searchParams.get('wallet')
  const limit = parseInt(searchParams.get('limit') || '100')
  
  try {
    const db = getAdminDatabase()
    const ref = db.ref(`users/${session.user.id}/transactions`)
    const snapshot = await ref.orderByChild('date').get()
    
    if (!snapshot.exists()) {
      return NextResponse.json({ success: true, data: [] })
    }
    
    let transactions: Transaction[] = Object.values(snapshot.val())
    
    // Apply filters
    if (month) {
      transactions = transactions.filter((t) => t.date.startsWith(month))
    }
    if (categoryId) {
      transactions = transactions.filter((t) => t.categoryId === categoryId)
    }
    if (type) {
      transactions = transactions.filter((t) => t.type === type)
    }
    if (wallet) {
      transactions = transactions.filter((t) => t.wallet === wallet || t.toWallet === wallet)
    }
    
    // Sort by date descending
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    
    // Limit results
    transactions = transactions.slice(0, limit)
    
    return NextResponse.json({ success: true, data: transactions })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch transactions' }, { status: 500 })
  }
}

// POST /api/transactions - create
export async function POST(request: Request) {
  const session = await requireAuth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const body = await request.json()
    const { type, amount, categoryId, description, date, wallet, toWallet, tags } = body
    
    if (!type || !amount || !categoryId || !date || !wallet) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }
    
    const db = getAdminDatabase()
    const ref = db.ref(`users/${session.user.id}/transactions`)
    const newRef = ref.push()
    
    // Get category info
    const catSnapshot = await db.ref(`users/${session.user.id}/categories/${categoryId}`).get()
    const category = catSnapshot.val()
    
    const transaction: Transaction = {
      id: newRef.key!,
      userId: session.user.id,
      type,
      amount: parseFloat(amount),
      categoryId,
      categoryName: category?.name || '',
      categoryIcon: category?.icon || '',
      description: description || '',
      date,
      wallet,
      toWallet: toWallet || undefined,
      tags: tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    await newRef.set(transaction)
    
    return NextResponse.json({ success: true, data: transaction }, { status: 201 })
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json({ success: false, error: 'Failed to create transaction' }, { status: 500 })
  }
}

// PUT /api/transactions - bulk update (for import)
export async function PUT(request: Request) {
  const session = await requireAuth()
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const { transactions } = await request.json()
    if (!Array.isArray(transactions)) {
      return NextResponse.json({ success: false, error: 'transactions array required' }, { status: 400 })
    }
    
    const db = getAdminDatabase()
    const ref = db.ref(`users/${session.user.id}/transactions`)
    
    const batch: Record<string, Transaction> = {}
    transactions.forEach((t: Partial<Transaction>) => {
      const key = ref.push().key!
      batch[key] = {
        ...t,
        id: key,
        userId: session.user.id,
        createdAt: t.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Transaction
    })
    
    await ref.update(batch)
    
    return NextResponse.json({ success: true, data: { imported: transactions.length } })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to import transactions' }, { status: 500 })
  }
}
