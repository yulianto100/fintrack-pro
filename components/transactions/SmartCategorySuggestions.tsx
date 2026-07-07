'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import type { Category } from '@/types'
import { suggestCategory, findCategoryId } from '@/lib/categorization'

interface Props {
  description: string
  type: string
  categories: Category[]
  selectedCategoryId: string
  onSelect: (categoryId: string, categoryName: string) => void
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function SmartCategorySuggestions({ description, type, categories, selectedCategoryId, onSelect }: Props) {
  const [resolved, setResolved] = useState<{ id: string; name: string } | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === type || (type === 'transfer' && c.type === 'expense')),
    [categories, type],
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const trimmed = normalize(description)
    if (trimmed.length < 2 || type === 'transfer') {
      setResolved(null)
      return
    }

    debounceRef.current = setTimeout(() => {
      const name = suggestCategory(trimmed)
      if (!name) {
        setResolved(null)
        return
      }
      const targetType: 'income' | 'expense' = type === 'transfer' ? 'expense' : (type === 'income' ? 'income' : 'expense')
      const id = findCategoryId(name, filteredCategories, targetType)
      if (!id || id === selectedCategoryId) {
        setResolved(null)
        return
      }
      const match = filteredCategories.find((c) => c.id === id)
      setResolved(match ? { id: match.id, name: match.name } : null)
    }, 180)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [description, type, filteredCategories, selectedCategoryId])

  if (!resolved) return null

  return (
    <button
      type="button"
      onClick={() => onSelect(resolved.id, resolved.name)}
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-opacity hover:opacity-85 active:opacity-75"
      style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.22)', color: 'var(--accent)' }}
    >
      <Sparkles size={12} strokeWidth={2.2} />
      {`Pakai ${resolved.name}`}
    </button>
  )
}
