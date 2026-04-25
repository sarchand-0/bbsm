import Link from 'next/link'
import { Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

interface EmptyStateProps {
  icon?: React.ReactNode
  title?: string
  description?: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  className?: string
}

export function EmptyState({
  icon,
  title = 'Nothing here yet',
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center gap-4', className)}>
      <div className="w-20 h-20 rounded-full bg-cream flex items-center justify-center">
        {icon ?? <Package className="w-9 h-9 text-primary/60" />}
      </div>
      <div className="space-y-1">
        <p className="font-semibold text-navy">{title}</p>
        {description && <p className="text-sm text-gray-400 max-w-xs">{description}</p>}
      </div>
      {action && (
        action.href ? (
          <Link href={action.href}>
            <Button variant="primary" size="sm">{action.label}</Button>
          </Link>
        ) : (
          <Button variant="primary" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        )
      )}
    </div>
  )
}
