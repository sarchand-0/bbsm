'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ShieldOff } from 'lucide-react'
import { useAuthStore } from '@/lib/auth'

function homeFor(role?: string) {
  if (role === 'admin' || role === 'staff') return '/crm'
  if (role === 'rider') return '/rider'
  return '/'
}

export default function UnauthorizedPage() {
  const { user } = useAuthStore()
  const params   = useSearchParams()
  const from     = params.get('from') ?? ''

  return (
    <div className="min-h-screen bg-appbg flex items-center justify-center px-5">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-red-light flex items-center justify-center mx-auto mb-6">
          <ShieldOff size={36} className="text-red" />
        </div>
        <h1 className="text-2xl font-bold text-navy mb-2">Access Denied</h1>
        <p className="text-gray-500 mb-2">
          You don't have permission to view{' '}
          <span className="font-mono text-sm bg-gray-100 px-2 py-0.5 rounded">{from || 'this page'}</span>.
        </p>
        {user && (
          <p className="text-sm text-gray-400 mb-8">
            You're signed in as <strong className="text-navy">{user.full_name}</strong> ({user.role}).
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={homeFor(user?.role)}
            className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors"
          >
            Go to my home
          </Link>
          {!user && (
            <Link
              href="/login"
              className="px-6 py-3 border border-gray-200 text-navy font-semibold rounded-xl hover:bg-cream transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
