'use client'

import { EmptyHint } from '@/components/shared/EmptyHint'

interface Props {
  onAddTransaction: () => void
}

export function EmptyState({ onAddTransaction }: Props) {
  return (
    <EmptyHint
      icon="Tx"
      title="Belum ada transaksi"
      description="Mulai catat keuangan kamu sekarang dan pantau pengeluaranmu"
      primaryCta={{ label: 'Tambah Transaksi', onClick: onAddTransaction }}
      secondaryCta={{ label: 'Impor CSV', href: '/import' }}
    />
  )
}
