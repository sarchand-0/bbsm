'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useAuthStore } from '@/lib/auth'

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuthStore()
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    setError('')
    try {
      await register({ full_name: form.full_name, email: form.email, phone: form.phone || undefined, password: form.password })
      router.push('/')
    } catch (err: any) {
      setError(err?.message ?? 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value })

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-1">Create account</h1>
      <p className="text-sm text-gray-400 mb-8">Join BBSM and start shopping</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Full name" placeholder="Arogya Rijal" value={form.full_name} onChange={set('full_name')} required />
        <Input label="Email address" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
        <Input label="Phone (optional)" type="tel" placeholder="+977-98XXXXXXXX" value={form.phone} onChange={set('phone')} />

        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Minimum 6 characters"
            value={form.password}
            onChange={set('password')}
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

        <Input
          label="Confirm password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Repeat your password"
          value={form.confirm}
          onChange={set('confirm')}
          required
        />

        {error && (
          <div className="bg-red-light border border-red/20 text-red text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <Button type="submit" variant="primary" className="w-full" loading={loading}>
          Create Account
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
