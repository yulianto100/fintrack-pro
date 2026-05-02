'use client'

import { motion } from 'framer-motion'
import { PlusCircle } from 'lucide-react'

interface Props {
  onAddTransaction: () => void
}

export function EmptyState({ onAddTransaction }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      {/* Illustration */}
      <div className="relative mb-6">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center text-4xl"
          style={{
            background: 'radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%)',
            border:     '1px solid rgba(34,197,94,0.15)',
          }}
        >
          📋
        </div>
        <div
          className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'var(--accent)', boxShadow: '0 4px 12px rgba(34,197,94,0.35)' }}
        >
          <span className="text-black text-base font-bold">+</span>
        </div>
      </div>

      <h3 className="text-lg font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
        Belum ada transaksi
      </h3>
      <p className="text-sm mb-6 max-w-[220px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        Mulai catat keuangan kamu sekarang dan pantau pengeluaranmu
      </p>

      <motion.button
        whileTap={{ scale: 0.96 }}
        whileHover={{ scale: 1.03 }}
        onClick={onAddTransaction}
        className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold"
        style={{
          background: 'var(--accent)',
          color:      '#000',
          boxShadow:  '0 8px 24px rgba(34,197,94,0.30)',
        }}
      >
        <PlusCircle size={16} strokeWidth={2.5} />
        Tambah Transaksi
      </motion.button>
    </motion.div>
  )
}
