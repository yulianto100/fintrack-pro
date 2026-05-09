'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { dashboardColors, dashboardTypography } from './dashboardTokens'

interface Props {
  title: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
}

export function DashboardSectionHeader({ title, actionLabel, actionHref, onAction }: Props) {
  const actionClass = `inline-flex items-center gap-1 transition-opacity hover:opacity-75 ${dashboardTypography.sectionAction}`

  return (
    <div className="flex items-center justify-between px-1">
      <h2 className={dashboardTypography.sectionTitle} style={{ color: dashboardColors.text }}>
        {title}
      </h2>
      {actionLabel && actionHref && (
        <Link href={actionHref} className={actionClass} style={{ color: dashboardColors.accent }}>
          {actionLabel}
          <ArrowRight size={13} strokeWidth={2.2} />
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <button type="button" onClick={onAction} className={actionClass} style={{ color: dashboardColors.accent }}>
          {actionLabel}
          <ArrowRight size={13} strokeWidth={2.2} />
        </button>
      )}
    </div>
  )
}
