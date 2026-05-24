'use client'

import toast from 'react-hot-toast'
import { Check, Undo2, X } from 'lucide-react'

interface UndoOptions {
  duration?: number
  undoLabel?: string
}

interface ConfirmOptions {
  duration?: number
  confirmLabel?: string
  cancelLabel?: string
}

export function toastUndo(message: string, onUndo: () => void | Promise<void>, opts?: UndoOptions) {
  const duration = opts?.duration ?? 5000
  const label = opts?.undoLabel ?? 'Batal'
  let undone = false

  const id = toast.custom(
    (t) => (
      <div
        className="finuvo-toast-undo"
        data-visible={t.visible}
        style={{
          background: 'var(--surface-2)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          boxShadow: '0 12px 32px rgba(0,0,0,0.32)',
          padding: '10px 12px 10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          minWidth: 280,
          maxWidth: 360,
          opacity: t.visible ? 1 : 0,
          transform: t.visible ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.2s, transform 0.2s',
        }}
      >
        <span style={{ flex: 1, fontSize: 13, lineHeight: 1.4 }}>{message}</span>
        <button
          type="button"
          onClick={() => {
            undone = true
            void onUndo()
            toast.dismiss(id)
          }}
          style={{
            background: 'var(--accent-dim)',
            color: 'var(--accent)',
            border: '1px solid var(--border-hover)',
            padding: '6px 12px',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
          }}
        >
          <Undo2 size={13} strokeWidth={2.5} />
          {label}
        </button>
      </div>
    ),
    { duration },
  )

  return {
    id,
    isUndone: () => undone,
    waitFor: (commitCallback: () => void | Promise<void>) => {
      return new Promise<boolean>((resolve) => {
        setTimeout(() => {
          if (undone) {
            resolve(false)
            return
          }

          Promise.resolve(commitCallback())
            .then(() => resolve(true))
            .catch((error: unknown) => {
              console.error('[toastUndo] commit failed', error)
              resolve(false)
            })
        }, duration)
      })
    },
  }
}

export function toastConfirm(message: string, onConfirm: () => void | Promise<void>, opts?: ConfirmOptions) {
  const duration = opts?.duration ?? 8000
  const confirmLabel = opts?.confirmLabel ?? 'Hapus'
  const cancelLabel = opts?.cancelLabel ?? 'Batal'

  return toast.custom(
    (t) => (
      <div
        style={{
          background: 'var(--surface-2)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          boxShadow: '0 12px 32px rgba(0,0,0,0.32)',
          padding: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          minWidth: 280,
          maxWidth: 360,
          opacity: t.visible ? 1 : 0,
          transform: t.visible ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.2s, transform 0.2s',
        }}
      >
        <span style={{ flex: 1, fontSize: 13, lineHeight: 1.4 }}>{message}</span>
        <button
          type="button"
          onClick={() => {
            toast.dismiss(t.id)
            void onConfirm()
          }}
          style={{
            padding: '6px 10px',
            borderRadius: 8,
            background: 'var(--red)',
            color: 'white',
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Check size={13} strokeWidth={2.5} />
          {confirmLabel}
        </button>
        <button
          type="button"
          onClick={() => toast.dismiss(t.id)}
          style={{
            padding: '6px 10px',
            borderRadius: 8,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <X size={13} strokeWidth={2.5} />
          {cancelLabel}
        </button>
      </div>
    ),
    { duration },
  )
}
