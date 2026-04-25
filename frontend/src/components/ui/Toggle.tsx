'use client'

import { cn } from '@/lib/utils'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  size?: 'sm' | 'md'
}

export function Toggle({ checked, onChange, label, disabled, size = 'md' }: ToggleProps) {
  return (
    <label className={cn('inline-flex items-center gap-2.5 cursor-pointer select-none', disabled && 'opacity-50 cursor-not-allowed')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          size === 'md' ? 'w-11 h-6' : 'w-8 h-[18px]',
          checked ? 'bg-primary' : 'bg-gray-200'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block rounded-full bg-white shadow-sm transform transition-transform duration-200',
            size === 'md' ? 'w-5 h-5' : 'w-[14px] h-[14px]',
            checked
              ? size === 'md' ? 'translate-x-5' : 'translate-x-[14px]'
              : 'translate-x-0'
          )}
        />
      </button>
      {label && <span className="text-sm font-medium text-navy">{label}</span>}
    </label>
  )
}
