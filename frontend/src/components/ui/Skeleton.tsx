import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  rounded?: 'sm' | 'md' | 'lg' | 'full'
}

export function Skeleton({ rounded = 'md', className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'skeleton',
        rounded === 'sm'   && 'rounded',
        rounded === 'md'   && 'rounded-xl',
        rounded === 'lg'   && 'rounded-2xl',
        rounded === 'full' && 'rounded-full',
        className
      )}
      {...props}
    />
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-4 space-y-3">
      <Skeleton className="h-44 w-full" rounded="lg" />
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex justify-between items-center pt-1">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-8 w-8" rounded="full" />
      </div>
    </div>
  )
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-gray-50">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}
