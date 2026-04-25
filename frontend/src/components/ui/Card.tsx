import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({ hover, padding = 'md', className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl shadow-card border border-gray-100',
        hover && 'transition-shadow duration-200 hover:shadow-card-hover',
        padding === 'none' && 'p-0',
        padding === 'sm'   && 'p-3',
        padding === 'md'   && 'p-5',
        padding === 'lg'   && 'p-7',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
