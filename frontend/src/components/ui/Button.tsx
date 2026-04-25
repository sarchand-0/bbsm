'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'link'
type Size    = 'sm' | 'md' | 'lg'

const variantCls: Record<Variant, string> = {
  primary:   'bg-primary text-white hover:bg-primary-dark active:scale-[0.98] shadow-sm',
  secondary: 'bg-white border border-gray-200 text-navy hover:border-primary hover:text-primary',
  danger:    'bg-red text-white hover:bg-red-dark active:scale-[0.98] shadow-sm',
  ghost:     'bg-transparent text-navy hover:bg-gray-100',
  link:      'bg-transparent text-primary underline-offset-2 hover:underline p-0 h-auto',
}

const sizeCls: Record<Size, string> = {
  sm: 'h-8  px-3 text-xs rounded-lg',
  md: 'h-10 px-5 text-sm rounded-xl',
  lg: 'h-12 px-7 text-base rounded-xl',
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
        variantCls[variant],
        variant !== 'link' && sizeCls[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  )
)
Button.displayName = 'Button'
