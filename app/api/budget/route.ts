import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import { isExpenseForSummary } from '@/lib/transaction-rules'
import type { BudgetCategory, BudgetStatus, Transaction } from '@/types'

async function getUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions)
    const id = session?.user?.id
    if (!id || id === 'undefined' || id === 'null') return null
    return id
  } catch { return null }
}

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// GET /api/budget?month=YYYY-MM — fetch budgets with spent amounts
export async function GET(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const month = new URL(request.url).searchParams.get('month') || currentMonth()

  try {
    const db          = getAdminDatabase()
    const [budgetSnap, txSnap] = await Promise.all([
      db.ref(`users/${userId}/budgets`).get(),
      db.ref(`users/${userId}/transactions`).get(),
    ])

    if (!budgetSnap.exists()) return NextResponse.json({ success: true, data: [] })

    const budgets: BudgetCategory[] = Object.values(budgetSnap.val())
    const monthBudgets = budgets.filter((b) => b.month === month)

    // Compute spent per categoryId for the month
    const spentMap: Record<string, number> = {}
    if (txSnap.exists()) {
      const txs: Transaction[] = Object.values(txSnap.val())
      txs.filter((t) => isExpenseForSummary(t) && t.date.startsWith(month)).forEach((t) => {
        spentMap[t.categoryId] = (spentMap[t.categoryId] || 0) + t.amount
      })
    }

    const statuses: BudgetStatus[] = monthBudgets.map((b) => {
      const spent   = spentMap[b.categoryId] || 0
      const percent = b.limitAmount > 0 ? (spent / b.limitAmount) * 100 : 0
      return { ...b, spent, percent, remaining: b.limitAmount - spent }
    })

    return NextResponse.json({ success: true, data: statuses })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

// POST /api/budget — create or update a budget entry
export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { categoryId, categoryName, categoryIcon, categoryColor, limitAmount, month } = body

    if (!categoryId || !limitAmount || !month)
      return NextResponse.json({ success: false, error: 'categoryId, limitAmount, month required' }, { status: 400 })

    const db = getAdminDatabase()

    // Check if budget for this category+month already exists → update it
    const existingSnap = await db.ref(`users/${userId}/budgets`).get()
    if (existingSnap.exists()) {
      const budgets: Record<string, BudgetCategory> = existingSnap.val()
      const existing = Object.entries(budgets).find(
        ([, b]) => b.categoryId === categoryId && b.month === month
      )
      if (existing) {
        await db.ref(`users/${userId}/budgets/${existing[0]}`).update({
          limitAmount, categoryName, categoryIcon, categoryColor,
          updatedAt: new Date().toISOString(),
        })
        return NextResponse.json({ success: true })
      }
    }

    const ref  = db.ref(`users/${userId}/budgets`)
    const nref = ref.push()
    const now  = new Date().toISOString()
    const budget: BudgetCategory = {
      id: nref.key!, userId, categoryId, categoryName, categoryIcon, categoryColor,
      limitAmount, month, createdAt: now, updatedAt: now,
    }
    await nref.set(budget)
    return NextResponse.json({ success: true, data: budget }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

// DELETE /api/budget?id=xxx
export async function DELETE(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })

  try {
    const db = getAdminDatabase()
    await db.ref(`users/${userId}/budgets/${id}`).remove()
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
