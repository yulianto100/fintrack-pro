import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import { isExpenseForSummary } from '@/lib/transaction-rules'
import type { BudgetCategory, Category, Transaction } from '@/types'

export const runtime = 'nodejs'

interface ProfileData {
  name?: string
  email?: string
}

async function getUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions)
    return session?.user?.id || null
  } catch {
    return null
  }
}

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

function fmtRp(n: number): string {
  if (!Number.isFinite(n)) return 'Rp 0'
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(Math.round(n))
  return `${sign}Rp ${abs.toLocaleString('id-ID')}`
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]?.slice(0, 3) || ''}`
}

function safeText(value: string): string {
  return value
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function clipped(value: string, max: number): string {
  const safe = safeText(value)
  if (safe.length <= max) return safe
  return `${safe.slice(0, Math.max(0, max - 1))}.`
}

export async function GET(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const month = url.searchParams.get('month') || new Date().toISOString().slice(0, 7)
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ success: false, error: 'month format YYYY-MM' }, { status: 400 })
  }
  const [year, monthNum] = month.split('-').map(Number)
  if (monthNum < 1 || monthNum > 12) {
    return NextResponse.json({ success: false, error: 'month tidak valid' }, { status: 400 })
  }

  try {
    const db = getAdminDatabase()
    const [txSnap, catSnap, budgetSnap, profileSnap] = await Promise.all([
      db.ref(`users/${userId}/transactions`).get(),
      db.ref(`users/${userId}/categories`).get(),
      db.ref(`users/${userId}/budgets`).get(),
      db.ref(`users/${userId}/profile`).get(),
    ])

    const allTx: Transaction[] = txSnap.exists()
      ? Object.values(txSnap.val() as Record<string, Transaction>)
      : []
    const txs = allTx.filter((t) => t.date?.startsWith(month))
    const categories: Category[] = catSnap.exists()
      ? Object.values(catSnap.val() as Record<string, Category>)
      : []
    const budgets: BudgetCategory[] = budgetSnap.exists()
      ? Object.values(budgetSnap.val() as Record<string, BudgetCategory>).filter((b) => b.month === month)
      : []
    const profile: ProfileData = profileSnap.exists() ? profileSnap.val() as ProfileData : {}

    const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = txs.filter(isExpenseForSummary).reduce((s, t) => s + t.amount, 0)
    const net = income - expense

    const byCat = new Map<string, number>()
    for (const t of txs) {
      if (!isExpenseForSummary(t)) continue
      byCat.set(t.categoryId, (byCat.get(t.categoryId) || 0) + t.amount)
    }
    const topCats = Array.from(byCat.entries())
      .map(([id, amount]) => {
        const cat = categories.find((c) => c.id === id)
        return { id, name: cat?.name || 'Lainnya', amount }
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8)

    const monthLabel = `${MONTHS_ID[monthNum - 1]} ${year}`
    const userName = profile.name || profile.email || 'Pengguna'

    const pdf = await PDFDocument.create()
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)
    const accent = rgb(0.13, 0.77, 0.37)
    const dim = rgb(0.4, 0.45, 0.5)
    const text = rgb(0.10, 0.13, 0.18)
    const red = rgb(0.97, 0.45, 0.43)
    const amber = rgb(0.96, 0.62, 0.04)
    const line = rgb(0.85, 0.88, 0.88)

    let p = pdf.addPage([595, 842])
    let y = 760
    p.drawText('FINUVO', { x: 48, y, size: 12, font: fontBold, color: accent })
    y -= 8
    p.drawText('Laporan Keuangan Bulanan', { x: 48, y: y - 12, size: 10, font, color: dim })

    y -= 60
    p.drawText(safeText(monthLabel), { x: 48, y, size: 32, font: fontBold, color: text })
    y -= 24
    p.drawText(clipped(userName, 60), { x: 48, y, size: 12, font, color: dim })

    y -= 80
    const cardW = 160
    const cardH = 90
    const gap = 12
    const cards = [
      { label: 'Pemasukan', value: fmtRp(income), color: accent },
      { label: 'Pengeluaran', value: fmtRp(expense), color: red },
      { label: net >= 0 ? 'Surplus' : 'Defisit', value: fmtRp(net), color: net >= 0 ? accent : red },
    ]
    let cx = 48
    for (const c of cards) {
      p.drawRectangle({ x: cx, y: y - cardH, width: cardW, height: cardH, color: rgb(0.97, 0.98, 0.98) })
      p.drawText(c.label, { x: cx + 14, y: y - 24, size: 9, font, color: dim })
      p.drawText(c.value, { x: cx + 14, y: y - 56, size: 14, font: fontBold, color: c.color })
      cx += cardW + gap
    }

    y -= cardH + 40
    p.drawText(`Total ${txs.length} transaksi tercatat di bulan ini.`, { x: 48, y, size: 10, font, color: dim })

    p.drawText(
      `Dihasilkan ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      { x: 48, y: 32, size: 8, font, color: dim },
    )

    p = pdf.addPage([595, 842])
    y = 800
    p.drawText('Top Kategori Pengeluaran', { x: 48, y, size: 16, font: fontBold, color: text })

    const maxCatAmount = topCats[0]?.amount || 1
    y -= 24
    if (topCats.length === 0) {
      p.drawText('Belum ada pengeluaran di bulan ini.', { x: 48, y, size: 10, font, color: dim })
      y -= 30
    }
    for (const c of topCats) {
      const ratio = c.amount / maxCatAmount
      p.drawText(clipped(c.name, 42), { x: 48, y, size: 10, font, color: text })
      p.drawText(fmtRp(c.amount), { x: 380, y, size: 10, font: fontBold, color: red })
      p.drawRectangle({ x: 48, y: y - 6, width: 400, height: 4, color: rgb(0.92, 0.94, 0.94) })
      p.drawRectangle({ x: 48, y: y - 6, width: Math.max(2, 400 * ratio), height: 4, color: red })
      y -= 22
      if (y < 200) break
    }

    if (budgets.length > 0) {
      y -= 20
      p.drawText('Status Budget', { x: 48, y, size: 14, font: fontBold, color: text })
      y -= 22
      for (const b of budgets.slice(0, 8)) {
        const spent = byCat.get(b.categoryId) || 0
        const pct = b.limitAmount > 0 ? Math.min(100, (spent / b.limitAmount) * 100) : 0
        const cat = categories.find((c) => c.id === b.categoryId)
        p.drawText(clipped(cat?.name || b.categoryName || 'Kategori', 38), { x: 48, y, size: 9, font, color: text })
        p.drawText(`${fmtRp(spent)} / ${fmtRp(b.limitAmount)}`, { x: 360, y, size: 9, font, color: dim })
        p.drawRectangle({ x: 48, y: y - 5, width: 400, height: 3, color: rgb(0.92, 0.94, 0.94) })
        p.drawRectangle({
          x: 48,
          y: y - 5,
          width: 400 * (pct / 100),
          height: 3,
          color: pct >= 100 ? red : pct >= 80 ? amber : accent,
        })
        y -= 18
        if (y < 80) break
      }
    }

    const headers = ['Tgl', 'Keterangan', 'Kategori', 'Jenis', 'Nominal']
    const colX = [48, 90, 280, 380, 460]
    const sortedTx = [...txs].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

    let tableY = 0
    function newTablePage() {
      p = pdf.addPage([595, 842])
      tableY = 800
      p.drawText('Daftar Transaksi', { x: 48, y: tableY, size: 14, font: fontBold, color: text })
      tableY -= 20
      headers.forEach((h, i) => p.drawText(h, { x: colX[i], y: tableY, size: 9, font: fontBold, color: dim }))
      tableY -= 8
      p.drawLine({ start: { x: 48, y: tableY }, end: { x: 540, y: tableY }, thickness: 0.5, color: line })
      tableY -= 12
    }
    newTablePage()

    if (sortedTx.length === 0) {
      p.drawText('Belum ada transaksi untuk bulan ini.', { x: 48, y: tableY, size: 9, font, color: dim })
    }

    for (const t of sortedTx) {
      if (tableY < 60) newTablePage()
      const desc = clipped(t.description || t.categoryName || '-', 40)
      const cat = clipped(t.categoryName || '-', 18)
      const typeLabel = t.type === 'income' ? 'Masuk' : t.type === 'transfer' ? 'Transfer' : 'Keluar'
      const amountColor = t.type === 'income' ? accent : isExpenseForSummary(t) ? red : dim
      const sign = t.type === 'income' ? '+' : isExpenseForSummary(t) ? '-' : ''
      p.drawText(fmtDate(t.date || ''), { x: colX[0], y: tableY, size: 8, font, color: text })
      p.drawText(desc, { x: colX[1], y: tableY, size: 8, font, color: text })
      p.drawText(cat, { x: colX[2], y: tableY, size: 8, font, color: dim })
      p.drawText(typeLabel, { x: colX[3], y: tableY, size: 8, font, color: dim })
      p.drawText(`${sign}${fmtRp(t.amount).replace('Rp ', '')}`, { x: colX[4], y: tableY, size: 8, font: fontBold, color: amountColor })
      tableY -= 13
    }

    const bytes = await pdf.save()
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="finuvo-${month}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[GET /api/export/pdf]', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
