'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, Copy, Check } from 'lucide-react'
import { Button, Input, Badge, ErrorBanner } from '@/components/ui'
import { Skeleton } from '@/components/ui'
import { api } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import { discountSchema, type DiscountFormValues } from '@/lib/schemas'

interface DiscountCode {
  id: string
  code: string
  type: 'percent' | 'fixed'
  value: number
  usage_limit: number | null
  used_count: number
  starts_at: string | null
  expires_at: string | null
  active: boolean
}

export default function CRMDiscountsPage() {
  const [codes, setCodes]       = useState<DiscountCode[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [copied, setCopied]     = useState<string | null>(null)
  const [apiError, setApiError] = useState('')

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<DiscountFormValues>({
    resolver: zodResolver(discountSchema),
    defaultValues: { code: '', type: 'percent', value: '', usage_limit: '', starts_at: '', expires_at: '', active: true },
  })

  const typeVal = watch('type')
  const activeVal = watch('active')
  const codeVal = watch('code')

  const load = () => {
    setLoading(true)
    api.get<DiscountCode[]>('/admin/discounts').then(setCodes).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const onSubmit = async (values: DiscountFormValues) => {
    setSaving(true)
    setApiError('')
    try {
      await api.post('/admin/discounts', {
        code: values.code.toUpperCase().trim(),
        type: values.type,
        value: parseFloat(values.value),
        usage_limit: values.usage_limit ? parseInt(values.usage_limit) : null,
        starts_at: values.starts_at || null,
        expires_at: values.expires_at || null,
        active: values.active,
      })
      setShowForm(false)
      reset()
      load()
    } catch (e: any) {
      setApiError(e?.message ?? 'Failed to create discount code')
    } finally { setSaving(false) }
  }

  const handleToggle = async (c: DiscountCode) => {
    await api.patch(`/admin/discounts/${c.id}`, { active: !c.active })
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this discount code?')) return
    await api.delete(`/admin/discounts/${id}`)
    load()
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    setValue('code', code, { shouldValidate: true })
  }

  const now = new Date()
  const getStatus = (c: DiscountCode): 'success' | 'warning' | 'danger' | 'default' => {
    if (!c.active) return 'default'
    if (c.expires_at && new Date(c.expires_at) < now) return 'danger'
    if (c.usage_limit && c.used_count >= c.usage_limit) return 'danger'
    if (c.starts_at && new Date(c.starts_at) > now) return 'warning'
    return 'success'
  }
  const getStatusLabel = (c: DiscountCode) => {
    if (!c.active) return 'Inactive'
    if (c.expires_at && new Date(c.expires_at) < now) return 'Expired'
    if (c.usage_limit && c.used_count >= c.usage_limit) return 'Exhausted'
    if (c.starts_at && new Date(c.starts_at) > now) return 'Scheduled'
    return 'Active'
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy">Discount Codes</h1>
        <Button variant="primary" size="sm" onClick={() => { setShowForm(!showForm); setApiError('') }}><Plus size={15} /> New Code</Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-card mb-6">
          <h2 className="font-bold text-navy mb-4">Create Discount Code</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Code</label>
              <div className="flex gap-2">
                <input
                  {...register('code')}
                  onChange={e => setValue('code', e.target.value.toUpperCase(), { shouldValidate: true })}
                  value={codeVal}
                  placeholder="SAVE20"
                  className={`flex-1 border rounded-xl px-3 py-2.5 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary/30 ${errors.code ? 'border-red' : 'border-gray-200'}`}
                />
                <button type="button" onClick={generateCode} className="px-3 py-2.5 text-xs font-bold text-primary border border-primary rounded-xl hover:bg-primary-light transition-colors">
                  Generate
                </button>
              </div>
              {errors.code && <p className="text-xs text-red mt-1">{errors.code.message}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Type</label>
              <select {...register('type')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Fixed Amount (Rs.)</option>
              </select>
            </div>
            <Input label={typeVal === 'percent' ? 'Discount %' : 'Discount Amount (Rs.)'} type="number" step="0.01" {...register('value')} error={errors.value?.message} />
            <Input label="Usage Limit (blank = unlimited)" type="number" {...register('usage_limit')} />
            <Input label="Starts At" type="date" {...register('starts_at')} />
            <Input label="Expires At" type="date" {...register('expires_at')} />
            <label className="col-span-2 flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={activeVal} onChange={e => setValue('active', e.target.checked)} className="rounded" />
              <span className="font-medium text-navy">Active immediately</span>
            </label>
            {apiError && <div className="col-span-2"><ErrorBanner message={apiError} onDismiss={() => setApiError('')} /></div>}
            <div className="col-span-2 flex gap-3">
              <Button type="submit" variant="primary" loading={saving}>Create Code</Button>
              <Button type="button" variant="ghost" onClick={() => { setShowForm(false); reset() }}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-gray-100">
            {['Code', 'Type', 'Value', 'Used', 'Validity', 'Status', 'Actions'].map(h => (
              <th key={h} className="text-left text-xs font-bold uppercase tracking-wide text-gray-400 px-5 py-4">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                <td key={j} className="px-5 py-4"><Skeleton className="h-4 rounded" /></td>
              ))}</tr>
            )) : codes.map(c => (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-navy text-sm tracking-wider">{c.code}</span>
                    <button onClick={() => copyCode(c.code)} className="text-gray-300 hover:text-primary transition-colors">
                      {copied === c.code ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                    </button>
                  </div>
                </td>
                <td className="px-5 py-4"><Badge variant={c.type === 'percent' ? 'info' : 'warning'}>{c.type}</Badge></td>
                <td className="px-5 py-4 font-bold text-navy text-sm">
                  {c.type === 'percent' ? `${c.value}%` : formatPrice(c.value)}
                </td>
                <td className="px-5 py-4 text-sm text-gray-600">
                  {c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ''}
                  {c.usage_limit && (
                    <div className="w-16 h-1 bg-gray-100 rounded-full mt-1">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (c.used_count / c.usage_limit) * 100)}%` }} />
                    </div>
                  )}
                </td>
                <td className="px-5 py-4 text-xs text-gray-400">
                  {c.starts_at ? new Date(c.starts_at).toLocaleDateString() : '—'} → {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : '∞'}
                </td>
                <td className="px-5 py-4"><Badge variant={getStatus(c)}>{getStatusLabel(c)}</Badge></td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleToggle(c)} className={`text-xs font-medium transition-colors ${c.active ? 'text-red hover:text-red-dark' : 'text-green-700 hover:text-green-900'}`}>
                      {c.active ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 text-gray-400 hover:text-red rounded-lg hover:bg-red-light transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && codes.length === 0 && <p className="text-center py-12 text-gray-400 text-sm">No discount codes yet</p>}
      </div>
    </div>
  )
}
