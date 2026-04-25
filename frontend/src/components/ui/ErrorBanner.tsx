import { AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ErrorBannerProps {
  message: string
  onDismiss?: () => void
  className?: string
}

export function ErrorBanner({ message, onDismiss, className }: ErrorBannerProps) {
  return (
    <div className={cn('flex items-start gap-3 bg-red-light border border-red/20 text-red rounded-xl px-4 py-3', className)}>
      <AlertCircle size={16} className="shrink-0 mt-0.5" />
      <p className="text-sm flex-1">{message}</p>
      {onDismiss && (
        <button onClick={onDismiss} className="shrink-0 hover:opacity-70 transition-opacity">
          <X size={14} />
        </button>
      )}
    </div>
  )
}
