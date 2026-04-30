'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Target, PiggyBank } from 'lucide-react'

interface Props {
  activeTab: 'goals' | 'budget'
  onAddGoal: () => void
  onAddBudget: () => void
}

/**
 * GoalsFAB — floating action button with expandable quick-action menu.
 * Context-aware: single-tap immediately opens the active tab's add form.
 */
export function GoalsFAB({ activeTab, onAddGoal, onAddBudget }: Props) {
  const [open, setOpen] = useState(false)

  const handleGoal = () => {
    setOpen(false)
    onAddGoal()
  }
  const handleBudget = () => {
    setOpen(false)
    onAddBudget()
  }

  // Single-tap: directly opens active tab's action
  const handlePrimaryTap = () => {
    if (!open) {
      if (activeTab === 'goals') { onAddGoal(); return }
      if (activeTab === 'budget') { onAddBudget(); return }
    }
    setOpen(false)
  }

  return (
    <>
      {/* Backdrop when open */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-20"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* FAB group */}
      <div
        className="fixed z-30 flex flex-col items-end gap-2"
        style={{
          bottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px) + 16px)',
          right: '1.25rem',
        }}
      >
        {/* Speed-dial options */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-end gap-2 mb-1"
            >
              {/* Add Goal */}
              <button
                onClick={handleGoal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold shadow-2xl transition-transform active:scale-[0.96]"
                style={{ background: 'var(--accent)', color: '#fff', boxShadow: '0 4px 24px rgba(34,197,94,0.35)' }}
              >
                <Target size={15} />
                <span>Add Goal</span>
              </button>

              {/* Add Budget */}
              <button
                onClick={handleBudget}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold shadow-xl transition-transform active:scale-[0.96]"
                style={{
                  background: 'var(--surface-modal)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                }}
              >
                <PiggyBank size={15} />
                <span>Add Budget</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main FAB button */}
        <motion.button
          onClick={() => setOpen((o) => !o)}
          whileTap={{ scale: 0.93 }}
          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl"
          style={{
            background: 'var(--accent)',
            boxShadow: '0 4px 28px rgba(34,197,94,0.40)',
          }}
        >
          <motion.div
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ duration: 0.2 }}
          >
            {open ? <X size={22} color="#fff" strokeWidth={2.5} /> : <Plus size={22} color="#fff" strokeWidth={2.5} />}
          </motion.div>
        </motion.button>
      </div>
    </>
  )
}
