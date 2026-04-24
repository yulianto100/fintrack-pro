'use client'

import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { CsvImporter } from '@/components/import/CsvImporter'
import { useApiList } from '@/hooks/useApiData'
import type { ImportLog } from '@/types'
import { formatDate } from '@/lib/utils'

export default function ImportPage() {
  const router = useRouter()
  const { data: logs, refetch } = useApiList<ImportLog>('/api/import', { refreshMs: 0 })

  return (
    <div className="px-4 py-6 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>Import Mutasi Bank</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Upload file CSV dari internet banking</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <CsvImporter onDone={() => refetch()} />
      </motion.div>

      {/* Import history */}
      {logs.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="mt-6">
          <p className="text-xs font-semibold mb-3 px-1" style={{ color: 'var(--text-muted)' }}>RIWAYAT IMPORT</p>
          <div className="glass-card overflow-hidden">
            {logs.slice(0, 5).map((log, i) => (
              <div key={log.id}
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: i < logs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{log.fileName}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(log.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{log.imported} berhasil</p>
                  {log.skipped > 0 && (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{log.skipped} dilewati</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
