'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from './Button'
import { cn } from '@/lib/utils'

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
  loading?: boolean
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading,
}: ConfirmModalProps) {
  useEffect(() => {
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [onClose])

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={cn(
            'bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4',
            'animate-fade-up'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-3">
            <span className={cn(
              'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
              variant === 'danger' ? 'bg-red-light' : 'bg-primary-light'
            )}>
              <AlertTriangle className={cn(
                'w-5 h-5',
                variant === 'danger' ? 'text-red' : 'text-primary'
              )} />
            </span>
            <div>
              <h3 className="font-semibold text-navy">{title}</h3>
              {message && <p className="text-sm text-gray-500 mt-1">{message}</p>}
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
              {cancelLabel}
            </Button>
            <Button variant={variant} size="sm" onClick={onConfirm} loading={loading}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
