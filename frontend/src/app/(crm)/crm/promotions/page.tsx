'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Image as ImageIcon } from 'lucide-react'
import { Button, Input, Badge, ErrorBanner } from '@/components/ui'
import { Skeleton } from '@/components/ui'
import { api } from '@/lib/api'
import { promotionSchema, type PromotionFormValues } from '@/lib/schemas'

interface Promotion {
  id: string
  title: string
  image_url: string | null
  link_url: string | null
  starts_at: string | null
  ends_at: string | null
  active: boolean
  sort_order: number
}

export default function CRMPromotionsPage() {
  const [promos, setPromos]     = useState<Promotion[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState<Promotion | null>(null)
  const [saving, setSaving]     = useState(false)
  const [apiError, setApiError] = useState('')

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<PromotionFormValues>({
    resolver: zodResolver(promotionSchema),
    defaultValues: { title: '', image_url: '', link_url: '', starts_at: '', ends_at: '', sort_order: '0', active: true },
  })

  const activeVal = watch('active')

  const load = () => {
    setLoading(true)
    api.get<Promotion[]>('/admin/promotions').then(setPromos).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openCreate = () => {
    setEditing(null)
    reset({ title: '', image_url: '', link_url: '', starts_at: '', ends_at: '', sort_order: '0', active: true })
    setApiError('')
    setShowForm(true)
  }

  const openEdit = (p: Promotion) => {
    setEditing(p)
    reset({
      title: p.title,
      image_url: p.image_url ?? '',
      link_url: p.link_url ?? '',
      starts_at: p.starts_at ? p.starts_at.slice(0, 10) : '',
      ends_at: p.ends_at ? p.ends_at.slice(0, 10) : '',
      sort_order: String(p.sort_order),
      active: p.active,
    })
    setApiError('')
    setShowForm(true)
  }

  const onSubmit = async (values: PromotionFormValues) => {
    setSaving(true)
    setApiError('')
    try {
      const body = {
        ...values,
        sort_order: parseInt(values.sort_order),
        image_url: values.image_url || null,
        link_url: values.link_url || null,
        starts_at: values.starts_at || null,
        ends_at: values.ends_at || null,
      }
      if (editing) await api.patch(`/admin/promotions/${editing.id}`, body)
      else await api.post('/admin/promotions', body)
      setShowForm(false)
      setEditing(null)
      load()
    } catch (e: any) {
      setApiError(e?.message ?? 'Failed to save promotion')
    } finally { setSaving(false) }
  }

  const toggleActive = async (p: Promotion) => {
    await api.patch(`/admin/promotions/${p.id}`, { active: !p.active })
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this promotion?')) return
    await api.delete(`/admin/promotions/${id}`)
    load()
  }

  const now = new Date()
  const isLive = (p: Promotion) => {
    if (!p.active) return false
    if (p.starts_at && new Date(p.starts_at) > now) return false
    if (p.ends_at && new Date(p.ends_at) < now) return false
    return true
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy">Promotions</h1>
        <Button variant="primary" size="sm" onClick={openCreate}><Plus size={15} /> New Banner</Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-card mb-6">
          <h2 className="font-bold text-navy mb-4">{editing ? 'Edit Promotion' : 'New Promotion'}</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
            <Input label="Title" {...register('title')} error={errors.title?.message} className="col-span-2" />
            <Input label="Image URL" {...register('image_url')} error={errors.image_url?.message} placeholder="https://…" className="col-span-2" />
            <Input label="Link URL" {...register('link_url')} placeholder="/products or https://…" className="col-span-2" />
            <Input label="Starts At" type="date" {...register('starts_at')} error={errors.starts_at?.message} />
            <Input label="Ends At" type="date" {...register('ends_at')} error={errors.ends_at?.message} />
            <Input label="Sort Order" type="number" {...register('sort_order')} error={errors.sort_order?.message} />
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={activeVal} onChange={e => setValue('active', e.target.checked)} className="rounded" />
              <span className="font-medium text-navy">Active</span>
            </label>
            {apiError && <div className="col-span-2"><ErrorBanner message={apiError} onDismiss={() => setApiError('')} /></div>}
            <div className="col-span-2 flex gap-3">
              <Button type="submit" variant="primary" loading={saving}>{editing ? 'Save Changes' : 'Create'}</Button>
              <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setEditing(null) }}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-card overflow-hidden">
              <Skeleton className="h-40 w-full rounded-none" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : promos.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No promotions yet. Create one above.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {promos.map((p) => (
            <div key={p.id} className={`bg-white rounded-2xl shadow-card overflow-hidden border-2 ${isLive(p) ? 'border-primary' : 'border-transparent'}`}>
              <div className="relative h-40 bg-cream flex items-center justify-center">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.title} className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                ) : (
                  <ImageIcon size={40} className="text-gray-300" />
                )}
                {isLive(p) && (
                  <span className="absolute top-2 left-2 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">LIVE</span>
                )}
                <span className="absolute top-2 right-2 bg-white/90 text-navy text-[10px] font-bold px-2 py-0.5 rounded-full">#{p.sort_order}</span>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-bold text-navy text-sm leading-tight">{p.title}</p>
                  <Badge variant={p.active ? 'success' : 'default'}>{p.active ? 'Active' : 'Inactive'}</Badge>
                </div>
                {p.link_url && <p className="text-xs text-gray-400 truncate mb-1">{p.link_url}</p>}
                {(p.starts_at || p.ends_at) && (
                  <p className="text-xs text-gray-400">
                    {p.starts_at ? new Date(p.starts_at).toLocaleDateString() : '∞'} → {p.ends_at ? new Date(p.ends_at).toLocaleDateString() : '∞'}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button onClick={() => toggleActive(p)} className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${p.active ? 'text-green-700 hover:text-green-900' : 'text-gray-400 hover:text-navy'}`}>
                    {p.active ? <ToggleRight size={16} className="text-green-600" /> : <ToggleLeft size={16} />}
                    {p.active ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => openEdit(p)} className="ml-auto p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-primary-light transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red rounded-lg hover:bg-red-light transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
