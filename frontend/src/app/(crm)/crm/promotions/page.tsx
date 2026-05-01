'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, ExternalLink } from 'lucide-react'
import { Button, Input, Badge, ErrorBanner, Skeleton } from '@/components/ui'
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

// Returns a CSS gradient + foreground color based on title keywords
function getPromoTheme(title: string): { gradient: string; text: string; sub: string } {
  const t = title.toLowerCase()
  if (t.includes('dashain') || t.includes('tihar') || t.includes('festival') || t.includes('puja'))
    return { gradient: 'linear-gradient(135deg, #C8102E 0%, #E07830 60%, #D4A843 100%)', text: 'white', sub: 'rgba(255,255,255,0.7)' }
  if (t.includes('fresh') || t.includes('produce') || t.includes('vegetable') || t.includes('fruit') || t.includes('organic'))
    return { gradient: 'linear-gradient(135deg, #16a34a 0%, #22c55e 60%, #86efac 100%)', text: 'white', sub: 'rgba(255,255,255,0.7)' }
  if (t.includes('dairy') || t.includes('milk') || t.includes('cheese') || t.includes('butter') || t.includes('yogurt'))
    return { gradient: 'linear-gradient(135deg, #2563eb 0%, #38bdf8 60%, #e0f2fe 100%)', text: 'white', sub: 'rgba(255,255,255,0.75)' }
  if (t.includes('beverage') || t.includes('drink') || t.includes('juice') || t.includes('water'))
    return { gradient: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 50%, #a5f3fc 100%)', text: 'white', sub: 'rgba(255,255,255,0.75)' }
  if (t.includes('snack') || t.includes('chips') || t.includes('biscuit') || t.includes('chocolate'))
    return { gradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fde68a 100%)', text: 'white', sub: 'rgba(255,255,255,0.75)' }
  if (t.includes('baby') || t.includes('kid') || t.includes('child') || t.includes('infant'))
    return { gradient: 'linear-gradient(135deg, #db2777 0%, #a855f7 60%, #f0abfc 100%)', text: 'white', sub: 'rgba(255,255,255,0.75)' }
  if (t.includes('household') || t.includes('cleaning') || t.includes('home') || t.includes('kitchen'))
    return { gradient: 'linear-gradient(135deg, #0f766e 0%, #06b6d4 60%, #a7f3d0 100%)', text: 'white', sub: 'rgba(255,255,255,0.75)' }
  if (t.includes('personal') || t.includes('care') || t.includes('beauty') || t.includes('skin'))
    return { gradient: 'linear-gradient(135deg, #be185d 0%, #f43f5e 50%, #fecdd3 100%)', text: 'white', sub: 'rgba(255,255,255,0.75)' }
  if (t.includes('sale') || t.includes('deal') || t.includes('discount') || t.includes('off') || t.includes('offer'))
    return { gradient: 'linear-gradient(135deg, #E07830 0%, #C8102E 60%, #7f1d1d 100%)', text: 'white', sub: 'rgba(255,255,255,0.75)' }
  if (t.includes('week') || t.includes('dhamaka') || t.includes('mega') || t.includes('grand'))
    return { gradient: 'linear-gradient(135deg, #7c3aed 0%, #E07830 60%, #D4A843 100%)', text: 'white', sub: 'rgba(255,255,255,0.75)' }
  // default BBSM orange
  return { gradient: 'linear-gradient(135deg, #1A2D40 0%, #E07830 60%, #D4A843 100%)', text: 'white', sub: 'rgba(255,255,255,0.65)' }
}

// Emoji decoration for the banner
function getPromoEmoji(title: string): string {
  const t = title.toLowerCase()
  if (t.includes('dashain') || t.includes('tihar') || t.includes('festival')) return '🎉'
  if (t.includes('fresh') || t.includes('produce') || t.includes('vegetable')) return '🥦'
  if (t.includes('fruit')) return '🍎'
  if (t.includes('dairy') || t.includes('milk')) return '🥛'
  if (t.includes('beverage') || t.includes('drink') || t.includes('juice')) return '🥤'
  if (t.includes('snack') || t.includes('chips')) return '🍿'
  if (t.includes('chocolate') || t.includes('sweet')) return '🍫'
  if (t.includes('baby') || t.includes('kid')) return '🍼'
  if (t.includes('household') || t.includes('cleaning')) return '🧹'
  if (t.includes('personal') || t.includes('beauty') || t.includes('care')) return '✨'
  if (t.includes('sale') || t.includes('deal') || t.includes('off')) return '🏷️'
  if (t.includes('mega') || t.includes('grand') || t.includes('dhamaka')) return '🎊'
  return '🛒'
}

function PromoBanner({ promo }: { promo: Promotion }) {
  const [imgFailed, setImgFailed] = useState(false)
  const theme = getPromoTheme(promo.title)
  const emoji = getPromoEmoji(promo.title)
  const showGradient = !promo.image_url || imgFailed

  return (
    <div className="relative h-44 overflow-hidden" style={showGradient ? { background: theme.gradient } : {}}>
      {!showGradient && (
        <img
          src={promo.image_url!}
          alt={promo.title}
          className="w-full h-full object-cover"
          onError={() => setImgFailed(true)}
        />
      )}
      {showGradient && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          <span className="text-4xl mb-2 select-none">{emoji}</span>
          <p className="font-extrabold text-base leading-snug" style={{ color: theme.text }}>
            {promo.title}
          </p>
          <p className="text-xs mt-1.5 font-medium" style={{ color: theme.sub }}>
            Bhat-Bhateni Super Store
          </p>
        </div>
      )}
      {/* Overlay badge — always on top */}
      <div className="absolute inset-0 pointer-events-none">
        {isLive(promo) && (
          <span className="absolute top-2 left-2 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">LIVE</span>
        )}
        <span className="absolute top-2 right-2 bg-black/30 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">#{promo.sort_order}</span>
      </div>
    </div>
  )
}

function isLive(p: Promotion): boolean {
  if (!p.active) return false
  const now = new Date()
  if (p.starts_at && new Date(p.starts_at) > now) return false
  if (p.ends_at && new Date(p.ends_at) < now) return false
  return true
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
    reset({ title: '', image_url: '', link_url: '', starts_at: '', ends_at: '', sort_order: String(promos.length), active: true })
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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Promotions</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage banners shown on the storefront homepage</p>
        </div>
        <Button variant="primary" size="sm" onClick={openCreate}><Plus size={15} /> New Banner</Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-card mb-6 border border-gray-100">
          <h2 className="font-bold text-navy mb-4">{editing ? 'Edit Promotion' : 'New Promotion'}</h2>
          <p className="text-xs text-gray-400 mb-4">
            Leave Image URL blank to auto-generate a themed gradient banner from the title.
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
            <Input label="Title *" {...register('title')} error={errors.title?.message} className="col-span-2"
              placeholder="e.g. Dashain Dhamaka Sale, Fresh Produce Week" />
            <Input label="Image URL (optional)" {...register('image_url')} error={errors.image_url?.message}
              placeholder="https://… or leave blank for auto banner" className="col-span-2" />
            <Input label="Link URL" {...register('link_url')} placeholder="/products or /products?category=groceries" className="col-span-2" />
            <Input label="Starts At" type="date" {...register('starts_at')} error={errors.starts_at?.message} />
            <Input label="Ends At" type="date" {...register('ends_at')} error={errors.ends_at?.message} />
            <Input label="Sort Order" type="number" {...register('sort_order')} error={errors.sort_order?.message} />
            <label className="flex items-center gap-2 text-sm cursor-pointer self-end pb-2.5">
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
              <Skeleton className="h-44 w-full rounded-none" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : promos.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">🎨</div>
          <p className="font-semibold text-gray-500 mb-1">No promotions yet</p>
          <p className="text-sm">Create a banner to feature on the homepage.</p>
          <Button variant="primary" size="sm" onClick={openCreate} className="mt-4"><Plus size={14} /> New Banner</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {promos.map((p) => (
            <div key={p.id} className={`bg-white rounded-2xl shadow-card overflow-hidden border-2 transition-all ${isLive(p) ? 'border-primary shadow-glow/20' : 'border-transparent'}`}>
              <PromoBanner promo={p} />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-bold text-navy text-sm leading-tight">{p.title}</p>
                  <Badge variant={isLive(p) ? 'success' : p.active ? 'info' : 'default'}>
                    {isLive(p) ? 'Live' : p.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {p.link_url && (
                  <p className="text-xs text-gray-400 truncate mb-1 flex items-center gap-1">
                    <ExternalLink size={10} /> {p.link_url}
                  </p>
                )}
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
