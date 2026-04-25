'use client'

import { cn } from '@/lib/utils'

interface CategoryChipProps {
  label: string
  active?: boolean
  onClick?: () => void
}

export function CategoryChip({ label, active, onClick }: CategoryChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all',
        active
          ? 'bg-primary text-white shadow-card'
          : 'bg-white border border-gray-200 text-navy hover:border-primary hover:text-primary'
      )}
    >
      {label}
    </button>
  )
}
