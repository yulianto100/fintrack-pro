'use client'

import type { CSSProperties } from 'react'

interface BaseProps {
  className?: string
  style?: CSSProperties
}

const baseStyle: CSSProperties = {
  background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.04) 100%)',
  backgroundSize: '200% 100%',
  animation: 'finuvo-shimmer 1.4s linear infinite',
}

export function SkeletonCard({ className, style }: BaseProps) {
  return (
    <div
      className={`rounded-2xl ${className || ''}`}
      style={{ height: 80, ...baseStyle, ...style }}
    />
  )
}

export function SkeletonRow({ className, style }: BaseProps) {
  return (
    <div
      className={`rounded-xl ${className || ''}`}
      style={{ height: 64, ...baseStyle, ...style }}
    />
  )
}

export function SkeletonHero({ className, style }: BaseProps) {
  return (
    <div
      className={`rounded-3xl ${className || ''}`}
      style={{ height: 160, ...baseStyle, ...style }}
    />
  )
}

export function SkeletonText({ width = '60%', className, style }: BaseProps & { width?: string | number }) {
  return (
    <div
      className={`rounded ${className || ''}`}
      style={{ height: 12, width, ...baseStyle, ...style }}
    />
  )
}

export function SkeletonCircle({ size = 40, className, style }: BaseProps & { size?: number }) {
  return (
    <div
      className={`rounded-full ${className || ''}`}
      style={{ width: size, height: size, ...baseStyle, ...style }}
    />
  )
}
