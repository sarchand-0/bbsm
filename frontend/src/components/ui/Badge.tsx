import { cn } from '@/lib/utils'

type BadgeVariant =
  | 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'ghost'

const variants: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  primary: 'bg-primary-light text-primary-dark',
  success: 'bg-green-50  text-green-700',
  warning: 'bg-accent-light text-amber-800',
  danger:  'bg-red-light  text-red-dark',
  info:    'bg-steel-light text-steel-dark',
  ghost:   'bg-transparent border border-gray-200 text-gray-500',
}

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  dot?: boolean
}

export function Badge({ variant = 'default', dot, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn(
          'inline-block w-1.5 h-1.5 rounded-full',
          variant === 'success' ? 'bg-green-500'  : '',
          variant === 'danger'  ? 'bg-red'        : '',
          variant === 'warning' ? 'bg-amber-500'  : '',
          variant === 'primary' ? 'bg-primary'    : '',
          variant === 'info'    ? 'bg-steel'      : '',
        )} />
      )}
      {children}
    </span>
  )
}
