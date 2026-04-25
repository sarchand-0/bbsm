'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, X, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { ProductCard } from '@/components/store/ProductCard'
import { SectionHead } from '@/components/store/SectionHead'
import { ProductCardSkeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorBanner } from '@/components/ui'
import { api } from '@/lib/api'
import type { ProductListOut, CategoryOut } from '@/types'

const SORTS = [
  { value: 'newest',     label: 'Newest first' },
  { value: 'price_asc',  label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'name_asc',   label: 'Name A–Z' },
]

const PRICE_PRESETS = [
  { label: 'Under Rs 500',       min: '',    max: '500'  },
  { label: 'Rs 500 – Rs 1,000',  min: '500', max: '1000' },
  { label: 'Rs 1,000 – Rs 2,000',min: '1000',max: '2000' },
  { label: 'Rs 2,000 – Rs 5,000',min: '2000',max: '5000' },
  { label: 'Over Rs 5,000',      min: '5000',max: ''     },
]

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border-b border-gray-100 pb-4 mb-4 last:border-0 last:mb-0 last:pb-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full mb-3 text-left"
      >
        <span className="text-sm font-bold text-navy">{title}</span>
        {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>
      {open && children}
    </div>
  )
}

function ProductsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [products, setProducts] = useState<ProductListOut | null>(null)
  const [categories, setCategories] = useState<CategoryOut[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  // Local price inputs (not committed until user presses Enter or Apply)
  const [minPriceInput, setMinPriceInput] = useState(searchParams.get('min_price') ?? '')
  const [maxPriceInput, setMaxPriceInput] = useState(searchParams.get('max_price') ?? '')

  const search   = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? ''
  const sort     = searchParams.get('sort') ?? 'newest'
  const page     = Number(searchParams.get('page') ?? 1)
  const featured = searchParams.get('featured') === 'true'
  const inStock  = searchParams.get('in_stock') === 'true'
  const minPrice = searchParams.get('min_price') ?? ''
  const maxPrice = searchParams.get('max_price') ?? ''

  const setParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === null || value === '') params.delete(key)
    else params.set(key, value)
    params.delete('page')
    router.push(`/products?${params.toString()}`)
  }

  const setMultiParam = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('page')
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === '') params.delete(k)
      else params.set(k, v)
    }
    router.push(`/products?${params.toString()}`)
  }

  const applyPriceRange = () => {
    setMultiParam({ min_price: minPriceInput || null, max_price: maxPriceInput || null })
  }

  const applyPreset = (min: string, max: string) => {
    setMinPriceInput(min)
    setMaxPriceInput(max)
    setMultiParam({ min_price: min || null, max_price: max || null })
  }

  const clearAll = () => {
    setMinPriceInput('')
    setMaxPriceInput('')
    router.push('/products')
  }

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search)   params.set('search', search)
    if (category) params.set('category', category)
    if (sort)     params.set('sort', sort)
    if (featured) params.set('featured', 'true')
    if (inStock)  params.set('in_stock', 'true')
    if (minPrice) params.set('min_price', minPrice)
    if (maxPrice) params.set('max_price', maxPrice)
    params.set('page', String(page))
    params.set('per_page', '20')
    setFetchError('')
    try {
      const data = await api.get<ProductListOut>(`/products?${params.toString()}`)
      setProducts(data)
    } catch {
      setFetchError('Failed to load products. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [search, category, sort, featured, inStock, minPrice, maxPrice, page])

  useEffect(() => {
    api.get<CategoryOut[]>('/categories').then(setCategories).catch(() => {})
  }, [])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  // Sync local inputs when URL changes externally (e.g. clear all)
  useEffect(() => {
    setMinPriceInput(searchParams.get('min_price') ?? '')
    setMaxPriceInput(searchParams.get('max_price') ?? '')
  }, [searchParams])

  // Count active filters for badge
  const activeFilterCount = [
    category, minPrice, maxPrice,
    featured ? 'featured' : '',
    inStock ? 'in_stock' : '',
  ].filter(Boolean).length

  const FilterPanel = () => (
    <div className="space-y-0">
      {activeFilterCount > 0 && (
        <div className="mb-4 p-3 bg-primary-light rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-primary">{activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active</span>
            <button onClick={clearAll} className="text-xs text-red hover:underline font-medium">Clear all</button>
          </div>
          <div className="flex flex-wrap gap-1">
            {category && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-white text-navy px-2 py-0.5 rounded-full font-medium shadow-sm">
                {categories.find(c => c.slug === category)?.name ?? category}
                <button onClick={() => setParam('category', null)}><X size={10} /></button>
              </span>
            )}
            {(minPrice || maxPrice) && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-white text-navy px-2 py-0.5 rounded-full font-medium shadow-sm">
                {minPrice && maxPrice ? `Rs ${minPrice}–${maxPrice}` : minPrice ? `From Rs ${minPrice}` : `Up to Rs ${maxPrice}`}
                <button onClick={() => { setMinPriceInput(''); setMaxPriceInput(''); setMultiParam({ min_price: null, max_price: null }) }}><X size={10} /></button>
              </span>
            )}
            {featured && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-white text-navy px-2 py-0.5 rounded-full font-medium shadow-sm">
                Featured <button onClick={() => setParam('featured', null)}><X size={10} /></button>
              </span>
            )}
            {inStock && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-white text-navy px-2 py-0.5 rounded-full font-medium shadow-sm">
                In Stock <button onClick={() => setParam('in_stock', null)}><X size={10} /></button>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Sort */}
      <FilterSection title="Sort By">
        <div className="space-y-1.5">
          {SORTS.map(s => (
            <button
              key={s.value}
              onClick={() => setParam('sort', s.value)}
              className={`flex items-center gap-2.5 w-full text-left rounded-lg px-2 py-1.5 transition-colors group ${
                sort === s.value ? 'bg-primary/10' : 'hover:bg-gray-50'
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                sort === s.value ? 'border-primary bg-primary' : 'border-gray-300 group-hover:border-primary/50'
              }`}>
                {sort === s.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <span className={`text-sm transition-colors ${sort === s.value ? 'text-primary font-semibold' : 'text-gray-600 group-hover:text-navy'}`}>{s.label}</span>
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Category */}
      <FilterSection title="Department">
        <div className="space-y-1.5">
          <button
            onClick={() => setParam('category', null)}
            className={`flex items-center justify-between w-full text-sm px-2 py-1.5 rounded-lg transition-colors ${
              !category ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-navy'
            }`}
          >
            <span>All Departments</span>
            {!category && <Check size={13} />}
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setParam('category', c.slug)}
              className={`flex items-center justify-between w-full text-sm px-2 py-1.5 rounded-lg transition-colors ${
                category === c.slug ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-navy'
              }`}
            >
              <span>{c.name}</span>
              {category === c.slug && <Check size={13} />}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Price */}
      <FilterSection title="Price">
        <div className="space-y-1.5 mb-3">
          {PRICE_PRESETS.map(p => {
            const isActive = minPrice === p.min && maxPrice === p.max
            return (
              <button
                key={p.label}
                onClick={() => applyPreset(p.min, p.max)}
                className={`flex items-center justify-between w-full text-sm px-2 py-1.5 rounded-lg transition-colors ${
                  isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-navy'
                }`}
              >
                <span>{p.label}</span>
                {isActive && <Check size={13} />}
              </button>
            )
          })}
        </div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Custom Range</p>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="text-[10px] text-gray-400 font-medium block mb-0.5">Min (Rs)</label>
            <input
              type="number"
              min={0}
              value={minPriceInput}
              onChange={e => setMinPriceInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyPriceRange()}
              placeholder="0"
              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <span className="text-gray-300 mt-4">–</span>
          <div className="flex-1">
            <label className="text-[10px] text-gray-400 font-medium block mb-0.5">Max (Rs)</label>
            <input
              type="number"
              min={0}
              value={maxPriceInput}
              onChange={e => setMaxPriceInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyPriceRange()}
              placeholder="Any"
              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        <button
          onClick={applyPriceRange}
          className="mt-2 w-full text-xs font-bold text-primary border border-primary/30 rounded-lg py-1.5 hover:bg-primary/5 transition-colors"
        >
          Apply
        </button>
      </FilterSection>

      {/* Availability */}
      <FilterSection title="Availability">
        <label className="flex items-center gap-2.5 cursor-pointer group">
          <div
            onClick={() => setParam('in_stock', inStock ? null : 'true')}
            className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${inStock ? 'bg-primary' : 'bg-gray-200'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${inStock ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
          <span className={`text-sm ${inStock ? 'text-navy font-semibold' : 'text-gray-600'}`}>In Stock Only</span>
        </label>
      </FilterSection>

      {/* Featured */}
      <FilterSection title="Selection">
        <label className="flex items-center gap-2.5 cursor-pointer group">
          <div
            onClick={() => setParam('featured', featured ? null : 'true')}
            className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${featured ? 'bg-primary' : 'bg-gray-200'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${featured ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
          <span className={`text-sm ${featured ? 'text-navy font-semibold' : 'text-gray-600'}`}>Staff Picks Only</span>
        </label>
      </FilterSection>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-5 py-10">
      <SectionHead
        label={featured ? 'Staff Picks' : 'Our Range'}
        title={featured ? 'Featured Products' : 'All Products'}
      />

      {fetchError && <ErrorBanner message={fetchError} onDismiss={() => setFetchError('')} className="mt-6" />}

      {/* Search + mobile filter button */}
      <div className="mt-6 flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search products…"
            defaultValue={search}
            onKeyDown={e => {
              if (e.key === 'Enter') setParam('q', (e.target as HTMLInputElement).value)
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>
        <button
          onClick={() => setShowMobileFilters(true)}
          className="lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-navy hover:border-primary transition-colors"
        >
          <SlidersHorizontal size={15} />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>
          )}
        </button>
      </div>

      {/* Main layout: sidebar + grid */}
      <div className="mt-6 flex gap-6 items-start">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-60 shrink-0 sticky top-24 bg-white rounded-2xl shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-navy flex items-center gap-2">
              <SlidersHorizontal size={15} className="text-primary" /> Filters
            </h2>
            {activeFilterCount > 0 && (
              <button onClick={clearAll} className="text-xs text-red hover:underline">Clear all</button>
            )}
          </div>
          <FilterPanel />
        </aside>

        {/* Product grid */}
        <div className="flex-1 min-w-0">
          {/* Result count + sort (desktop) */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {loading ? 'Loading…' : products ? (
                <>
                  <span className="font-bold text-navy">{products.meta.total.toLocaleString()}</span> result{products.meta.total !== 1 ? 's' : ''}
                  {search && <> for "<span className="text-primary">{search}</span>"</>}
                </>
              ) : null}
            </p>
            <div className="hidden lg:flex items-center gap-2 text-sm text-gray-500">
              <span className="text-xs font-semibold uppercase tracking-wide">Sort:</span>
              <select
                value={sort}
                onChange={e => setParam('sort', e.target.value)}
                className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
            {loading
              ? Array.from({ length: 20 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : products?.items.map(p => <ProductCard key={p.id} product={p} />)}
          </div>

          {!loading && products?.items.length === 0 && (
            <EmptyState
              title="No products found"
              description="Try adjusting your search or filters"
              action={{ label: 'Clear filters', onClick: clearAll }}
            />
          )}

          {/* Pagination */}
          {products && products.meta.total_pages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              <button
                onClick={() => setParam('page', String(page - 1))}
                disabled={page <= 1}
                className="p-2 rounded-lg border border-gray-200 hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
              >
                <ChevronLeft size={18} />
              </button>
              {Array.from({ length: Math.min(products.meta.total_pages, 7) }, (_, i) => {
                const p2 = i + 1
                return (
                  <button
                    key={p2}
                    onClick={() => setParam('page', String(p2))}
                    className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                      p2 === page ? 'bg-primary text-white' : 'border border-gray-200 hover:border-primary hover:text-primary'
                    }`}
                  >
                    {p2}
                  </button>
                )
              })}
              {products.meta.total_pages > 7 && <span className="text-gray-400">…</span>}
              <button
                onClick={() => setParam('page', String(page + 1))}
                disabled={page >= products.meta.total_pages}
                className="p-2 rounded-lg border border-gray-200 hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMobileFilters(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-navy text-lg flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-primary" /> Filters
              </h2>
              <button onClick={() => setShowMobileFilters(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            <FilterPanel />
            <button
              onClick={() => setShowMobileFilters(false)}
              className="mt-4 w-full bg-primary text-white py-3 rounded-xl font-bold text-sm"
            >
              Show {products?.meta.total ?? 0} Results
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense>
      <ProductsContent />
    </Suspense>
  )
}
