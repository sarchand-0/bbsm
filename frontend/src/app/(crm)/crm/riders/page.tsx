'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Star, Bike, Circle, CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react'
import { Button, Input, Badge, ErrorBanner } from '@/components/ui'
import { Skeleton } from '@/components/ui'
import { api } from '@/lib/api'
import { riderSchema, type RiderFormValues } from '@/lib/schemas'
import type { RiderOut } from '@/types'

type Tab = 'all' | 'pending' | 'approved' | 'rejected'

const VSTATUS: Record<string, { label: string; variant: any; icon: any }> = {
  pending:  { label: 'Pending',  variant: 'warning', icon: Clock },
  approved: { label: 'Approved', variant: 'success', icon: CheckCircle },
  rejected: { label: 'Rejected', variant: 'danger',  icon: XCircle },
}

export default function RidersPage() {
  const [riders, setRiders]     = useState<RiderOut[]>([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<Tab>('all')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [apiError, setApiError] = useState('')
  const [verifying, setVerifying] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<RiderFormValues>({
    resolver: zodResolver(riderSchema),
    defaultValues: { full_name: '', email: '', phone: '', password: '', vehicle_type: 'motorcycle', license_plate: '' },
  })

  const load = () => {
    setLoading(true)
    api.get<RiderOut[]>('/admin/riders').then(setRiders).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const onSubmit = async (values: RiderFormValues) => {
    setSaving(true); setApiError('')
    try {
      await api.post('/admin/riders', values)
      setShowForm(false); reset(); load()
    } catch (err: any) {
      setApiError(err?.message ?? 'Failed to create rider')
    } finally { setSaving(false) }
  }

  const quickVerify = async (id: string, action: 'approve' | 'reject') => {
    setVerifying(id)
    try {
      await api.patch(`/admin/riders/${id}/verify`, { action })
      load()
    } finally { setVerifying(null) }
  }

  const pendingCount   = riders.filter(r => (r as any).verification_status === 'pending').length
  const filteredRiders = tab === 'all' ? riders : riders.filter(r => (r as any).verification_status === tab)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Riders</h1>
          {pendingCount > 0 && (
            <p className="text-xs text-amber-600 font-medium mt-0.5">
              {pendingCount} rider{pendingCount > 1 ? 's' : ''} awaiting verification
            </p>
          )}
        </div>
        <Button variant="primary" size="sm" onClick={() => { setShowForm(!showForm); setApiError('') }}>
          <Plus size={15} /> Add Rider
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit">
        {(['all', 'pending', 'approved', 'rejected'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors capitalize flex items-center gap-1.5 ${
              tab === t ? 'bg-white text-navy shadow-sm' : 'text-gray-400 hover:text-navy'
            }`}
          >
            {t}
            {t === 'pending' && pendingCount > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-card mb-6">
          <h2 className="font-bold text-navy mb-4">New Rider</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
            <Input label="Full Name"  {...register('full_name')}    error={errors.full_name?.message} />
            <Input label="Email"  type="email" {...register('email')} error={errors.email?.message} />
            <Input label="Phone"  {...register('phone')}            error={errors.phone?.message} />
            <Input label="Password" type="password" {...register('password')} error={errors.password?.message} />
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Vehicle Type</label>
              <select {...register('vehicle_type')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {['motorcycle','bicycle','car','van'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <Input label="License Plate" {...register('license_plate')} error={errors.license_plate?.message} />
            {apiError && <div className="col-span-2"><ErrorBanner message={apiError} onDismiss={() => setApiError('')} /></div>}
            <div className="col-span-2 flex gap-3">
              <Button type="submit" variant="primary" loading={saving}>Create Rider</Button>
              <Button type="button" variant="ghost" onClick={() => { setShowForm(false); reset() }}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {['Rider', 'Vehicle', 'Verification', 'Online Status', 'Rating', 'Deliveries', 'Actions'].map(h => (
                <th key={h} className="text-left text-xs font-bold uppercase tracking-wide text-gray-400 px-5 py-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                  <td key={j} className="px-5 py-4"><Skeleton className="h-5 rounded" /></td>
                ))}</tr>
              ))
            ) : filteredRiders.map((r) => {
              const vs = (r as any).verification_status ?? 'pending'
              const { label, variant, icon: VIcon } = VSTATUS[vs] ?? VSTATUS.pending
              return (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center text-sm font-bold text-primary">
                        {r.name[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-navy text-sm">{r.name}</p>
                        <p className="text-xs text-gray-400">{r.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <Bike size={14} className="text-gray-400" />
                      <span className="capitalize">{r.vehicle_type}</span>
                      {r.license_plate && <span className="text-gray-400 text-xs">· {r.license_plate}</span>}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <VIcon size={13} className={vs === 'approved' ? 'text-green-500' : vs === 'rejected' ? 'text-red' : 'text-amber-500'} />
                      <Badge variant={variant} className="text-[10px]">{label}</Badge>
                    </div>
                    {vs === 'pending' && (
                      <div className="flex gap-1 mt-1.5">
                        <button
                          onClick={() => quickVerify(r.id, 'approve')}
                          disabled={verifying === r.id}
                          className="text-[10px] font-bold text-green-700 bg-green-50 hover:bg-green-100 px-2 py-0.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => quickVerify(r.id, 'reject')}
                          disabled={verifying === r.id}
                          className="text-[10px] font-bold text-red bg-red-light hover:bg-red/20 px-2 py-0.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          ✕ Reject
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <Circle size={8} className={r.is_available && r.is_active ? 'text-green-500 fill-green-500' : 'text-gray-300 fill-gray-300'} />
                      <span className="text-xs font-medium text-gray-600">
                        {!r.is_active ? 'Inactive' : r.is_available ? 'Available' : 'Busy'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {r.rating ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Star size={12} className="text-amber-400 fill-amber-400" />
                        <span className="font-medium text-navy">{r.rating.toFixed(1)}</span>
                      </div>
                    ) : <span className="text-xs text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-navy">{r.total_deliveries}</td>
                  <td className="px-5 py-4">
                    <Link href={`/crm/riders/${r.id}`} className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                      View <ExternalLink size={10} />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!loading && filteredRiders.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            {tab === 'all' ? 'No riders yet.' : `No ${tab} riders.`}
          </div>
        )}
      </div>
    </div>
  )
}
