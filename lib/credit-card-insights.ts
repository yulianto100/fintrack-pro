import type { CreditCard, CreditCardInsight } from '@/types'

/**
 * Generate smart insights for a credit card.
 * Rules:
 *  - used > 80% → danger
 *  - used 50–80% → warning
 *  - due date within 3 days → reminder
 *  - due date within 7 days → info
 *  - used === 0 → positive
 */
export function generateCreditCardInsights(card: CreditCard): CreditCardInsight[] {
  const insights: CreditCardInsight[] = []
  const usagePercent = card.limit > 0 ? (card.used / card.limit) * 100 : 0
  const remaining = card.limit - card.used
  const minimumPayment = Math.ceil(card.used * 0.1)

  // ── Usage warnings
  if (usagePercent >= 80) {
    insights.push({
      type: 'danger',
      icon: '🚨',
      title: 'Limit Hampir Habis',
      message: `Penggunaan sudah ${usagePercent.toFixed(0)}% dari limit. Sisa limit Rp ${remaining.toLocaleString('id-ID')}.`,
    })
  } else if (usagePercent >= 50) {
    insights.push({
      type: 'warning',
      icon: '⚠️',
      title: 'Penggunaan Tinggi',
      message: `Kamu sudah menggunakan ${usagePercent.toFixed(0)}% dari limit kartu ini.`,
    })
  } else if (card.used === 0) {
    insights.push({
      type: 'success',
      icon: '✅',
      title: 'Kartu Bersih',
      message: 'Tidak ada tagihan saat ini. Kartu kredit dalam kondisi baik.',
    })
  }

  // ── Due date reminder
  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()

  let dueThisMonth = new Date(currentYear, currentMonth, card.dueDate)
  if (dueThisMonth < today) {
    dueThisMonth = new Date(currentYear, currentMonth + 1, card.dueDate)
  }
  const daysUntilDue = Math.ceil(
    (dueThisMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (card.used > 0) {
    if (daysUntilDue <= 3) {
      insights.push({
        type: 'danger',
        icon: '🔔',
        title: daysUntilDue === 0 ? 'Jatuh Tempo Hari Ini' : `Jatuh Tempo ${daysUntilDue} Hari Lagi`,
        message: `Segera bayar tagihan Rp ${card.used.toLocaleString('id-ID')} sebelum terkena denda.`,
      })
    } else if (daysUntilDue <= 7) {
      insights.push({
        type: 'warning',
        icon: '📅',
        title: `Jatuh Tempo ${daysUntilDue} Hari Lagi`,
        message: `Tanggal ${card.dueDate} bulan ini. Minimal bayar Rp ${minimumPayment.toLocaleString('id-ID')}.`,
      })
    } else {
      insights.push({
        type: 'info',
        icon: '📅',
        title: `Jatuh Tempo Tanggal ${card.dueDate}`,
        message: `Masih ${daysUntilDue} hari lagi. Siapkan pembayaran minimum Rp ${minimumPayment.toLocaleString('id-ID')}.`,
      })
    }
  }

  // ── Billing date info
  let billingThisMonth = new Date(currentYear, currentMonth, card.billingDate)
  if (billingThisMonth < today) {
    billingThisMonth = new Date(currentYear, currentMonth + 1, card.billingDate)
  }
  const daysUntilBilling = Math.ceil(
    (billingThisMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )
  if (daysUntilBilling <= 3 && daysUntilBilling > 0) {
    insights.push({
      type: 'info',
      icon: '🗓️',
      title: `Tanggal Tagihan ${daysUntilBilling} Hari Lagi`,
      message: `Pengeluaran baru setelah tanggal ${card.billingDate} masuk ke periode berikutnya.`,
    })
  }

  return insights
}
