'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, X } from 'lucide-react'
import { Button, Input, Badge, ErrorBanner } from '@/components/ui'
import { Skeleton } from '@/components/ui'
import { api } from '@/lib/api'
import { categorySchema, type CategoryFormValues } from '@/lib/schemas'
import type { CategoryOut } from '@/types'

const LUCIDE_ICONS = [
  'ShoppingBasket', 'Leaf', 'Milk', 'Coffee', 'Cookie', 'Home', 'Heart', 'Baby',
  'Apple', 'Fish', 'Beef', 'Egg', 'Sandwich', 'Pizza', 'IceCream', 'Candy',
  'Wine', 'Beer', 'Droplets', 'Soap', 'Shirt', 'Package', 'Tag', 'Star',
]

export default function CRMCategoriesPage() {
  const [categories, setCategories] = useState<CategoryOut[]>([])
  const [loading, setLoading]       = useState(true)
  const [showModal, setShowModal]   = useState(false)
  const [editing, setEditing]       = useState<CategoryOut | null>(null)
  const [saving, setSaving]         = useState(false)
  const [apiError, setApiError]     = useState('')
  const [loadError, setLoadError]   = useState('')
  const [deleteError, setDeleteError] = useState('')

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', slug: '', icon: 'Package', color_hex: '#E07830', sort_order: '0' },
  })

  const nameVal = watch('name')

  // Auto-generate slug from name
  useEffect(() => {
    if (!editing) {
      setValue('slug', nameVal.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
    }
  }, [nameVal, editing])

  const load = () => {
    setLoading(true)
    setLoadError('')
    api.get<CategoryOut[]>('/admin/categories')
      .then(data => setCategories(data.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))))
      .catch(() => setLoadError('Failed to load categories'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openCreate = () => {
    setEditing(null)
    reset({ name: '', slug: '', icon: 'Package', color_hex: '#E07830', sort_order: String(categories.length + 1) })
    setApiError('')
    setShowModal(true)
  }

  const openEdit = (c: CategoryOut) => {
    setEditing(c)
    reset({
      name: c.name,
      slug: c.slug,
      icon: c.icon ?? 'Package',
      color_hex: c.color_hex ?? '#E07830',
      sort_order: String(c.sort_order ?? 0),
    })
    setApiError('')
    setShowModal(true)
  }

  const onSubmit = async (values: CategoryFormValues) => {
    setSaving(true)
    setApiError('')
    try {
      const body = { ...values, sort_order: parseInt(values.sort_order) }
      if (editing) await api.patch(`/admin/categories/${editing.id}`, body)
      else await api.post('/admin/categories', body)
      setShowModal(false)
      setEditing(null)
      load()
    } catch (e: any) {
      setApiError(e?.message ?? 'Failed to save category')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category? Products in it will lose their category.')) return
    setDeleteError('')
    try {
      await api.delete(`/admin/categories/${id}`)
      load()
    } catch (e: any) {
      setDeleteError(e?.message ?? 'Failed to delete category')
    }
  }

  const move = async (id: string, direction: 'up' | 'down') => {
    const idx = categories.findIndex(c => c.id === id)
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === categories.length - 1) return

    const reordered = [...categories]
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    ;[reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]]

    const ordered = reordered.map((c, i) => ({ ...c, sort_order: i + 1 }))
    setCategories(ordered)

    try {
      await api.patch('/admin/categories/reorder', { ids: ordered.map((c: CategoryOut) => c.id) })
    } catch {
      load()
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Categories</h1>
          <p className="text-sm text-gray-400 mt-0.5">Use the arrows to reorder — order reflects on the storefront</p>
        </div>
        <Button variant="primary" size="sm" onClick={openCreate}><Plus size={15} /> New Category</Button>
      </div>

      {loadError && <ErrorBanner message={loadError} onDismiss={() => setLoadError('')} className="mb-4" />}
      {deleteError && <ErrorBanner message={deleteError} onDismiss={() => setDeleteError('')} className="mb-4" />}

      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-gray-100">
            {['Order', 'Category', 'Slug', 'Icon', 'Color', 'Actions'].map(h => (
              <th key={h} className="text-left text-xs font-bold uppercase tracking-wide text-gray-400 px-5 py-4">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading ? Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                <td key={j} className="px-5 py-4"><Skeleton className="h-4 rounded" /></td>
              ))}</tr>
            )) : categories.map((c, idx) => (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-5 py-3">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => move(c.id, 'up')} disabled={idx === 0} className="p-0.5 text-gray-300 hover:text-navy disabled:opacity-20 transition-colors">
                      <ChevronUp size={14} />
                    </button>
                    <span className="text-xs font-bold text-gray-400 text-center">{c.sort_order}</span>
                    <button onClick={() => move(c.id, 'down')} disabled={idx === categories.length - 1} className="p-0.5 text-gray-300 hover:text-navy disabled:opacity-20 transition-colors">
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: c.color_hex ?? '#E07830' }}>
                      {c.name[0]}
                    </div>
                    <span className="font-semibold text-navy text-sm">{c.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3 font-mono text-xs text-gray-400">{c.slug}</td>
                <td className="px-5 py-3 text-xs text-gray-600">{c.icon ?? '—'}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md border border-gray-200" style={{ backgroundColor: c.color_hex ?? '#ccc' }} />
                    <span className="font-mono text-xs text-gray-400">{c.color_hex}</span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-primary-light transition-colors"><Pencil size={13} /></button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 text-gray-400 hover:text-red rounded-lg hover:bg-red-light transition-colors"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && categories.length === 0 && !loadError && (
          <p className="text-center py-12 text-gray-400 text-sm">No categories yet</p>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-card-hover w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-navy">{editing ? 'Edit Category' : 'New Category'}</h2>
              <button onClick={() => { setShowModal(false); setEditing(null) }} className="text-gray-300 hover:text-gray-600 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input label="Name" {...register('name')} error={errors.name?.message} />
              <Input label="Slug" {...register('slug')} error={errors.slug?.message} hint="URL-friendly identifier e.g. fresh-produce" />
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">Icon (Lucide name)</label>
                <select {...register('icon')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  {LUCIDE_ICONS.map(icon => <option key={icon} value={icon}>{icon}</option>)}
                </select>
                {errors.icon && <p className="text-xs text-red mt-1">{errors.icon.message}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">Color</label>
                <div className="flex gap-3 items-center">
                  <input type="color" {...register('color_hex')} className="h-10 w-14 rounded-lg border border-gray-200 cursor-pointer p-1" />
                  <Input {...register('color_hex')} error={errors.color_hex?.message} placeholder="#E07830" className="flex-1" />
                </div>
              </div>
              <Input label="Sort Order" type="number" {...register('sort_order')} error={errors.sort_order?.message} />
              {apiError && <ErrorBanner message={apiError} onDismiss={() => setApiError('')} />}
              <div className="flex gap-3 pt-2">
                <Button type="submit" variant="primary" loading={saving} className="flex-1">{editing ? 'Save Changes' : 'Create Category'}</Button>
                <Button type="button" variant="ghost" onClick={() => { setShowModal(false); setEditing(null) }}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
