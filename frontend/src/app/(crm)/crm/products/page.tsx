'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Search, Pencil, Archive, X, Upload, Link, Globe, Loader2 } from 'lucide-react'
import { Button, Input, Textarea, Badge, ErrorBanner } from '@/components/ui'
import { Skeleton } from '@/components/ui'
import { api } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import { productSchema, type ProductFormValues } from '@/lib/schemas'
import type { ProductOut, CategoryOut } from '@/types'

interface AdminProduct extends ProductOut { description: string | null; created_at: string }

export default function CRMProductsPage() {
  const [products, setProducts]     = useState<AdminProduct[]>([])
  const [categories, setCategories] = useState<CategoryOut[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [showForm, setShowForm]     = useState(false)
  const [editing, setEditing]       = useState<AdminProduct | null>(null)
  const [saving, setSaving]         = useState(false)
  const [apiError, setApiError]     = useState('')

  // image state — managed separately from react-hook-form
  const [images, setImages]       = useState<string[]>([])
  const [urlInput, setUrlInput]   = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // web lookup
  const [showLookup, setShowLookup]     = useState(false)
  const [lookupQuery, setLookupQuery]   = useState('')
  const [lookupResults, setLookupResults] = useState<any[]>([])
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError]   = useState('')

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: '', price: '', stock_qty: '', sku: '', category_id: '', description: '', is_featured: false },
  })

  const load = () => {
    setLoading(true)
    const q = new URLSearchParams()
    if (search) q.set('search', search)
    q.set('per_page', '50')
    api.get<{ items: AdminProduct[] }>(`/admin/products?${q.toString()}`)
      .then(d => setProducts(d.items ?? []))
      .finally(() => setLoading(false))
  }
  useEffect(load, [search])
  useEffect(() => { api.get<CategoryOut[]>('/categories').then(setCategories) }, [])

  const openCreate = () => {
    setEditing(null)
    reset({ name: '', price: '', stock_qty: '', sku: '', category_id: '', description: '', is_featured: false })
    setImages([])
    setUrlInput('')
    setApiError('')
    setShowForm(true)
  }

  const openEdit = (p: AdminProduct) => {
    setEditing(p)
    reset({
      name: p.name,
      price: String(p.price),
      stock_qty: String(p.stock_qty),
      category_id: p.category_id ?? '',
      description: p.description ?? '',
      sku: p.sku ?? '',
      is_featured: p.is_featured,
    })
    setImages(p.images || [])
    setUrlInput('')
    setApiError('')
    setShowForm(true)
  }

  const runLookup = async () => {
    if (!lookupQuery.trim()) return
    setLookupLoading(true)
    setLookupError('')
    setLookupResults([])
    try {
      const res = await api.get<{ results: any[] }>(`/admin/products/web-lookup?q=${encodeURIComponent(lookupQuery)}`)
      setLookupResults(res.results)
      if (res.results.length === 0) setLookupError('No results found. Try a different search term.')
    } catch (e: any) {
      setLookupError(e?.message ?? 'Lookup failed')
    } finally {
      setLookupLoading(false)
    }
  }

  const useLookupResult = (result: any) => {
    setValue('name', result.name)
    if (result.image_url && !images.includes(result.image_url)) {
      setImages(prev => [result.image_url, ...prev])
    }
    setShowLookup(false)
    setLookupResults([])
    setLookupQuery('')
  }

  const addUrl = () => {
    const url = urlInput.trim()
    if (url && !images.includes(url)) setImages(prev => [...prev, url])
    setUrlInput('')
  }

  const removeImage = (url: string) => setImages(prev => prev.filter(u => u !== url))

  const uploadFile = async (file: File) => {
    if (!editing) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api.upload<{ images: string[] }>(`/admin/products/${editing.id}/images/upload`, form)
      setImages(res.images)
    } catch (e: any) {
      setApiError(e?.message ?? 'Image upload failed')
    } finally {
      setUploading(false)
    }
  }

  const onSubmit = async (values: ProductFormValues) => {
    setSaving(true)
    setApiError('')
    try {
      const body = {
        ...values,
        price: parseFloat(values.price),
        stock_qty: parseInt(values.stock_qty),
        category_id: values.category_id || null,
        images,
      }
      if (editing) await api.patch(`/admin/products/${editing.id}`, body)
      else await api.post('/admin/products', body)
      setShowForm(false)
      setEditing(null)
      load()
    } catch (e: any) {
      setApiError(e?.message ?? 'Failed to save product')
    } finally { setSaving(false) }
  }

  const archive = async (id: string) => {
    if (!confirm('Archive this product?')) return
    await api.delete(`/admin/products/${id}`)
    load()
  }

  const isFeatured = watch('is_featured')

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy">Products</h1>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowLookup(!showLookup)}>
            <Globe size={15} /> Search Web
          </Button>
          <Button variant="primary" size="sm" onClick={openCreate}>
            <Plus size={15} /> Add Product
          </Button>
        </div>
      </div>

      {/* Web product lookup panel */}
      {showLookup && (
        <div className="bg-white rounded-2xl p-5 shadow-card mb-4 border border-steel/20">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-navy text-sm flex items-center gap-2"><Globe size={15} className="text-steel" /> Search Web for Product</p>
            <button onClick={() => { setShowLookup(false); setLookupResults([]); setLookupError('') }} className="text-gray-300 hover:text-gray-600"><X size={14} /></button>
          </div>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="e.g. Basmati Rice, Baby Diapers, Neem Soap…"
              value={lookupQuery}
              onChange={e => setLookupQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') runLookup() }}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <Button variant="primary" size="sm" onClick={runLookup} loading={lookupLoading} disabled={!lookupQuery.trim()}>
              Search
            </Button>
          </div>
          <p className="text-xs text-gray-400 mb-3">Results come from Open Food Facts. Click "Use this" to pre-fill the product form.</p>
          {lookupError && <p className="text-xs text-red mb-2">{lookupError}</p>}
          {lookupLoading && (
            <div className="flex items-center gap-2 text-xs text-gray-400 py-4 justify-center">
              <Loader2 size={14} className="animate-spin" /> Searching…
            </div>
          )}
          {lookupResults.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {lookupResults.map((r, i) => (
                <div key={i} className="border border-gray-100 rounded-xl overflow-hidden hover:shadow-card transition-shadow">
                  <div className="w-full h-24 bg-cream">
                    <img src={r.image_url} alt={r.name} className="w-full h-full object-contain p-1"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-semibold text-navy line-clamp-2">{r.name}</p>
                    {r.brand && <p className="text-[10px] text-gray-400 mt-0.5">{r.brand}</p>}
                    {r.quantity && <p className="text-[10px] text-gray-300">{r.quantity}</p>}
                    <button
                      onClick={() => { useLookupResult(r); if (!showForm) openCreate() }}
                      className="mt-2 w-full text-[10px] font-bold text-white bg-primary hover:bg-primary-dark rounded-lg py-1 transition-colors"
                    >
                      Use this
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-card mb-6">
          <h2 className="font-bold text-navy mb-4">{editing ? 'Edit Product' : 'New Product'}</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
            <Input label="Product Name" {...register('name')} error={errors.name?.message} className="col-span-2" />
            <Input label="Price (Rs.)" type="number" step="0.01" {...register('price')} error={errors.price?.message} />
            <Input label="Stock Qty" type="number" {...register('stock_qty')} error={errors.stock_qty?.message} />
            <Input label="SKU" {...register('sku')} error={errors.sku?.message} />
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Category</label>
              <select {...register('category_id')} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">No category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <Textarea label="Description" {...register('description')} className="col-span-2" rows={3} />

            {/* ── Image management ── */}
            <div className="col-span-2">
              <p className="text-xs font-semibold text-gray-600 mb-2">Images</p>

              {/* Thumbnail grid */}
              {images.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {images.map((url, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden bg-cream border border-gray-100 group shrink-0">
                      <img src={url} alt="" className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      <button
                        type="button"
                        onClick={() => removeImage(url)}
                        className="absolute top-0.5 right-0.5 w-4 h-4 bg-red rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={8} className="text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* URL input */}
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <Link size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="url"
                    placeholder="Paste image URL…"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addUrl() } }}
                    className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={addUrl} disabled={!urlInput.trim()}>
                  Add URL
                </Button>
              </div>

              {/* File upload (edit mode only — needs existing product ID) */}
              {editing && (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) uploadFile(f)
                      e.target.value = ''
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-dark transition-colors disabled:opacity-50"
                  >
                    <Upload size={12} />
                    {uploading ? 'Uploading…' : 'Upload from device'}
                  </button>
                </>
              )}
              {!editing && (
                <p className="text-xs text-gray-400">Save the product first to enable file upload.</p>
              )}
            </div>

            <label className="col-span-2 flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={isFeatured} onChange={e => setValue('is_featured', e.target.checked)} className="rounded" />
              <span className="font-medium text-navy">Featured product</span>
            </label>
            {apiError && <div className="col-span-2"><ErrorBanner message={apiError} onDismiss={() => setApiError('')} /></div>}
            <div className="col-span-2 flex gap-3">
              <Button type="submit" variant="primary" loading={saving}>{editing ? 'Save Changes' : 'Create Product'}</Button>
              <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setEditing(null) }}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>

      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-gray-100">
            {['Product', 'SKU', 'Price', 'Stock', 'Status', 'Featured', 'Actions'].map(h => (
              <th key={h} className="text-left text-xs font-bold uppercase tracking-wide text-gray-400 px-5 py-4">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                <td key={j} className="px-5 py-4"><Skeleton className="h-4 rounded" /></td>
              ))}</tr>
            )) : products.map(p => (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-cream overflow-hidden shrink-0">
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      ) : null}
                    </div>
                    <div>
                      <p className="font-semibold text-navy text-sm">{p.name}</p>
                      {p.category && <p className="text-xs text-gray-400">{p.category.name}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 font-mono text-xs text-gray-400">{p.sku ?? '—'}</td>
                <td className="px-5 py-3 font-bold text-navy text-sm">{formatPrice(p.price)}</td>
                <td className="px-5 py-3">
                  <span className={`text-sm font-semibold ${p.stock_qty < 10 ? 'text-red' : 'text-navy'}`}>{p.stock_qty}</span>
                </td>
                <td className="px-5 py-3">
                  <Badge variant={p.status === 'active' ? 'success' : p.status === 'draft' ? 'warning' : 'danger'}>{p.status}</Badge>
                </td>
                <td className="px-5 py-3">
                  {p.is_featured && <Badge variant="info">Featured</Badge>}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-primary rounded-lg hover:bg-primary-light transition-colors"><Pencil size={13} /></button>
                    {p.status !== 'archived' && <button onClick={() => archive(p.id)} className="p-1.5 text-gray-400 hover:text-red rounded-lg hover:bg-red-light transition-colors"><Archive size={13} /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && products.length === 0 && <p className="text-center py-12 text-gray-400 text-sm">No products found</p>}
      </div>
    </div>
  )
}
