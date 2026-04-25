'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useAuthStore } from '@/lib/auth'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuthStore()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const from = searchParams.get('from') ?? '/'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(form.email, form.password)
      const { user } = useAuthStore.getState()
      if (user?.role === 'admin' || user?.role === 'staff') {
        router.push('/crm')
      } else if (user?.role === 'rider') {
        router.push('/rider')
      } else {
        const safeDest = from.startsWith('/crm') || from.startsWith('/rider') ? '/' : from
        router.push(safeDest)
      }
    } catch (err: any) {
      setError(err?.message ?? 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-1">Welcome back</h1>
      <p className="text-sm text-gray-400 mb-8">Sign in to your BBSM account</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 bottom-3 text-gray-400 hover:text-navy transition-colors"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {error && (
          <div className="bg-red-light border border-red/20 text-red text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <Button type="submit" variant="primary" className="w-full" loading={loading}>
          Sign In
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-400">
          Don't have an account?{' '}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            Create one
          </Link>
        </p>
      </div>

      <div className="mt-8 p-4 bg-cream rounded-xl border border-primary/10">
        <p className="text-xs text-gray-400 font-medium mb-2">Demo credentials</p>
        <p className="text-xs text-gray-400">Admin: <span className="font-mono text-navy">admin@bbsm.np</span> / <span className="font-mono text-navy">admin123</span></p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
