import type { Transaction } from '@/types'

type TransactionLike = Pick<Transaction, 'type'> &
  Partial<Pick<Transaction, 'paymentMethod' | 'tags' | 'categoryId'>>

export function isCreditCardPurchase(tx: TransactionLike): boolean {
  return tx.type === 'credit_expense' || (tx.type === 'expense' && tx.paymentMethod === 'credit_card')
}

export function isCreditCardPayment(tx: TransactionLike): boolean {
  return tx.type === 'transfer' && (
    tx.categoryId === 'credit_card_payment' ||
    tx.tags?.includes('credit_card_payment') === true
  )
}

export function isExpenseForSummary(tx: TransactionLike): boolean {
  if (tx.type === 'credit_expense') return true
  if (tx.type !== 'expense') return false

  return tx.tags?.includes('credit_card_payment') !== true
}

export function isExpenseForWalletBalance(tx: TransactionLike): boolean {
  return tx.type === 'expense' &&
    tx.paymentMethod !== 'credit_card' &&
    tx.tags?.includes('credit_card_payment') !== true
}

export function getTransactionMethodLabel(tx: TransactionLike): string | null {
  if (isCreditCardPayment(tx)) return 'Bayar Kartu Kredit'
  if (isCreditCardPurchase(tx)) return 'Kartu Kredit'
  return null
}
