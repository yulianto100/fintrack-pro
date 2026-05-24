'use client'

import { useState } from 'react'
import { getBankLogo } from '@/lib/bank-logos'

interface Props {
  provider: string
  size?: number
  rounded?: number
  className?: string
}

function fallbackText(provider: string): string {
  const compact = provider.replace(/[^a-z0-9]/gi, '').toUpperCase()
  if (!compact) return '?'
  return compact.length <= 3 ? compact : compact.slice(0, 2)
}

export function BankLogo({ provider, size = 40, rounded = 12, className }: Props) {
  const entry = getBankLogo(provider)
  const [errored, setErrored] = useState(false)
  const canLoadRemote = Boolean(entry && (entry.logoUrl || entry.fallbackUrl))

  if (!entry || errored || !canLoadRemote) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: rounded,
          background: entry ? `${entry.brandColor}22` : 'var(--accent-dim)',
          color: entry?.brandColor ?? 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: Math.max(10, Math.floor(size * 0.28)),
          fontWeight: 800,
          letterSpacing: 0,
          flexShrink: 0,
        }}
      >
        {entry?.abbr ?? fallbackText(provider)}
      </div>
    )
  }

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: rounded,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/bank-logo/${entry.id}`}
        alt={entry.name}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setErrored(true)}
        style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }}
      />
    </div>
  )
}
