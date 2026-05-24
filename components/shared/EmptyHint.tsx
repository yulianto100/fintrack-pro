'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'

type CTA = { label: string; onClick?: () => void; href?: string }

interface Props {
  icon: ReactNode | string
  title: string
  description?: string
  primaryCta?: CTA
  secondaryCta?: CTA
  variant?: 'default' | 'filtered'
  className?: string
}

export function EmptyHint({
  icon,
  title,
  description,
  primaryCta,
  secondaryCta,
  variant = 'default',
  className,
}: Props) {
  const isFiltered = variant === 'filtered'
  const accentColor = isFiltered ? 'var(--warning)' : 'var(--accent)'
  const glow = isFiltered ? 'var(--gold-dim)' : 'var(--accent-dim)'
  const borderColor = isFiltered ? 'rgba(245,158,11,0.20)' : 'var(--border)'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className || ''}`}
    >
      <div className="relative mb-5">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-3xl"
          style={{
            background: `radial-gradient(circle, ${glow} 0%, transparent 70%)`,
            border: `1px solid ${borderColor}`,
          }}
        >
          {icon}
        </div>
        <div
          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
          style={{
            background: accentColor,
            boxShadow: isFiltered ? '0 4px 12px var(--gold-dim)' : '0 4px 12px var(--accent-glow)',
          }}
        >
          <span className="text-[12px] font-bold" style={{ color: '#000' }}>
            {isFiltered ? '!' : '+'}
          </span>
        </div>
      </div>

      <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h3>
      {description && (
        <p className="text-xs mb-5 max-w-[260px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {description}
        </p>
      )}

      {(primaryCta || secondaryCta) && (
        <div className="flex flex-col sm:flex-row gap-2 mt-1">
          {primaryCta && <CtaButton cta={primaryCta} primary />}
          {secondaryCta && <CtaButton cta={secondaryCta} />}
        </div>
      )}
    </motion.div>
  )
}

function CtaButton({ cta, primary }: { cta: CTA; primary?: boolean }) {
  const cls = 'px-4 py-2.5 rounded-2xl text-xs font-semibold transition-transform active:scale-95'
  const style: CSSProperties = primary
    ? { background: 'var(--accent)', color: '#000', boxShadow: '0 8px 22px var(--accent-glow)' }
    : { background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)' }

  if (cta.href) {
    return (
      <Link href={cta.href} className={cls} style={style}>
        {cta.label}
      </Link>
    )
  }

  return (
    <button type="button" onClick={cta.onClick} className={cls} style={style}>
      {cta.label}
    </button>
  )
}
