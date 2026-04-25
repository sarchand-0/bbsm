'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { ProductCard } from '@/components/store/ProductCard'
import { SectionHead } from '@/components/store/SectionHead'
import { CategoryChip } from '@/components/store/CategoryChip'
import { ProductCardSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui'
import { api } from '@/lib/api'
import type { ProductListOut, CategoryOut } from '@/types'

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>()
  const [products, setProducts] = useState<ProductListOut | null>(null)
  const [category, setCategory] = useState<CategoryOut | null>(null)
  const [sort, setSort] = useState('newest')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<CategoryOut>(`/categories/${slug}`).then(setCategory).catch(() => {})
  }, [slug])

  useEffect(() => {
    setLoading(true)
    api.get<ProductListOut>(`/products?category=${slug}&sort=${sort}&per_page=20`)
      .then(setProducts)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug, sort])

  return (
    <div className="max-w-7xl mx-auto px-5 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
        <Link href="/" className="hover:text-navy">Home</Link>
        <ChevronRight size={12} />
        <Link href="/products" className="hover:text-navy">Products</Link>
        <ChevronRight size={12} />
        <span className="text-navy font-medium">{category?.name ?? slug}</span>
      </nav>

      <div className="flex items-start justify-between gap-4 mb-6">
        <SectionHead label="Category" title={category?.name ?? slug} />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 shrink-0"
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="name_asc">Name A–Z</option>
        </select>
      </div>

      {/* Sub-categories */}
      {category?.children && category.children.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {category.children.map((c) => (
            <CategoryChip key={c.id} label={c.name} onClick={() => {}} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {loading
          ? Array.from({ length: 12 }).map((_, i) => <ProductCardSkeleton key={i} />)
          : products?.items.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>

      {!loading && products?.items.length === 0 && (
        <EmptyState title="No products in this category" description="Check back soon" />
      )}
    </div>
  )
}
