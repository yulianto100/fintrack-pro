'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Download, X, ZoomIn, ZoomOut } from 'lucide-react'
import { useState } from 'react'

interface Props {
  url: string
  type: 'image' | 'pdf'
  onClose: () => void
}

export function AttachmentLightbox({ url, type, onClose }: Props) {
  const [zoomed, setZoomed] = useState(false)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-[60] flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.92)' }}
        onClick={onClose}
      >
        <button
          type="button"
          aria-label="Tutup pratinjau struk"
          onClick={(event) => {
            event.stopPropagation()
            onClose()
          }}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: 'rgba(255,255,255,0.10)', color: '#fff' }}
        >
          <X size={20} />
        </button>

        <a
          href={url}
          download
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Unduh struk"
          onClick={(event) => event.stopPropagation()}
          className="absolute left-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: 'rgba(255,255,255,0.10)', color: '#fff' }}
        >
          <Download size={18} />
        </a>

        {type === 'image' ? (
          <>
            <button
              type="button"
              aria-label={zoomed ? 'Perkecil struk' : 'Perbesar struk'}
              onClick={(event) => {
                event.stopPropagation()
                setZoomed((value) => !value)
              }}
              className="absolute bottom-6 right-6 z-10 flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: 'rgba(255,255,255,0.10)', color: '#fff' }}
            >
              {zoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <motion.img
              src={url}
              alt="Struk"
              onClick={(event) => event.stopPropagation()}
              animate={{ scale: zoomed ? 2 : 1 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{
                maxWidth: '92vw',
                maxHeight: '88vh',
                objectFit: 'contain',
                cursor: zoomed ? 'zoom-out' : 'zoom-in',
              }}
            />
          </>
        ) : (
          <iframe
            src={url}
            title="Struk PDF"
            onClick={(event) => event.stopPropagation()}
            style={{ width: '92vw', height: '88vh', border: 'none', borderRadius: 12, background: '#fff' }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  )
}
