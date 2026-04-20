import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAdminDatabase } from '@/lib/firebase-admin'
import * as XLSX from 'xlsx'

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
  const month  = searchParams.get('month')
  const format = searchParams.get('format') || 'xlsx'

  try {
    const db = getAdminDatabase()

    const [txSnap, catSnap, goldSnap, stockSnap, depositSnap] = await Promise.all([
      db.ref(`users/${userId}/transactions`).get(),
      db.ref(`users/${userId}/categories`).get(),
      db.ref(`users/${userId}/portfolio/gold`).get(),
      db.ref(`users/${userId}/portfolio/stocks`).get(),
      db.ref(`users/${userId}/portfolio/deposits`).get(),
    ])

    let transactions = txSnap.exists() ? Object.values(txSnap.val()) as Record<string, unknown>[] : []
    const categories = catSnap.exists()   ? Object.values(catSnap.val())   : []
    const gold       = goldSnap.exists()  ? Object.values(goldSnap.val())  : []
    const stocks     = stockSnap.exists() ? Object.values(stockSnap.val()) : []
    const deposits   = depositSnap.exists()? Object.values(depositSnap.val()): []

    if (month) transactions = transactions.filter((t) => (t.date as string)?.startsWith(month))

    if (format === 'json') {
      return NextResponse.json({ success: true, data: { transactions, categories, portfolio: { gold, stocks, deposits }, exportedAt: new Date().toISOString() } })
    }

    const wb = XLSX.utils.book_new()

    const txSheet = XLSX.utils.json_to_sheet(transactions.map((t) => ({
      Tanggal: t.date, Tipe: t.type, Kategori: t.categoryName,
      Deskripsi: t.description, Jumlah: t.amount, Wallet: t.wallet, 'Ke Wallet': t.toWallet || '-',
    })))
    txSheet['!cols'] = [{ wch:12 },{ wch:10 },{ wch:15 },{ wch:30 },{ wch:15 },{ wch:10 },{ wch:10 }]
    XLSX.utils.book_append_sheet(wb, txSheet, 'Transaksi')

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((gold as Record<string,unknown>[]).map((g) => ({
      Sumber: g.source, Gram: g.grams, 'Harga Beli/gram': g.buyPrice || '-', 'Tanggal Beli': g.buyDate || '-', Catatan: g.notes || '-',
    }))), 'Emas')

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((stocks as Record<string,unknown>[]).map((s) => ({
      'Kode Saham': s.symbol, 'Jumlah Lot': s.lots, 'Harga Beli Avg': s.avgPrice,
      'Modal (Rp)': (s.lots as number) * 100 * (s.avgPrice as number), 'Tanggal Beli': s.buyDate || '-',
    }))), 'Saham')

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((deposits as Record<string,unknown>[]).map((d) => ({
      Bank: d.bankName, 'Nominal (Rp)': d.nominal, 'Bunga (%)': d.interestRate,
      'Tenor (Bulan)': d.tenorMonths, 'Tanggal Mulai': d.startDate, 'Jatuh Tempo': d.maturityDate,
      'Nilai Akhir (Rp)': d.finalValue, 'Total Bunga (Rp)': d.totalInterest, Status: d.status,
    }))), 'Deposito')

    const buffer   = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const filename = `fintrack-${month || 'all'}-${new Date().toISOString().split('T')[0]}.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
      },
    })
  } catch (err) {
    console.error('[GET /api/export]', err)
    return NextResponse.json({ success: false, error: 'Export failed' }, { status: 500 })
  }
}
