'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Package, ShoppingCart, Heart, Minus, Plus, Check } from 'lucide-react'
import { Button } from '@/components/ui'
import { Badge } from '@/components/ui'
import { Skeleton } from '@/components/ui'
import { useCartStore } from '@/lib/cart'
import { useAuthStore } from '@/lib/auth'
import { api } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import type { ProductDetailOut } from '@/types'

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [product, setProduct] = useState<ProductDetailOut | null>(null)
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [wishlisted, setWishlisted] = useState(false)
  const [activeTab, setActiveTab] = useState<'description' | 'details'>('description')
  const [selectedImage, setSelectedImage] = useState(0)
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({})

  const { addItem, openDrawer, loading: cartLoading } = useCartStore()
  const { user } = useAuthStore()

  useEffect(() => {
    api.get<ProductDetailOut>(`/products/${slug}`)
      .then(setProduct)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  const handleAddToCart = async () => {
    if (!product) return
    await addItem(product.id, qty)
    setAdded(true)
    openDrawer()
    setTimeout(() => setAdded(false), 2000)
  }

  const handleWishlist = async () => {
    if (!user || !product) return
    try {
      if (wishlisted) {
        await api.delete(`/wishlist/${product.id}`)
      } else {
        await api.post(`/wishlist/${product.id}`, {})
      }
      setWishlisted(!wishlisted)
    } catch {}
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-5 py-10 grid md:grid-cols-2 gap-12">
        <Skeleton className="aspect-square rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-1/3 rounded-lg" />
          <Skeleton className="h-10 w-3/4 rounded-lg" />
          <Skeleton className="h-8 w-1/4 rounded-lg" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-5 py-20 text-center">
        <Package size={48} className="mx-auto text-gray-200 mb-4" />
        <p className="text-navy font-semibold">Product not found</p>
        <Link href="/products" className="text-primary text-sm mt-2 inline-block hover:underline">Back to products</Link>
      </div>
    )
  }

  const inStock = product.stock_qty > 0
  const images  = product.images?.length ? product.images : [null]

  return (
    <div className="max-w-7xl mx-auto px-5 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-8">
        <Link href="/" className="hover:text-navy transition-colors">Home</Link>
        <ChevronRight size={12} />
        <Link href="/products" className="hover:text-navy transition-colors">Products</Link>
        {product.category && (
          <>
            <ChevronRight size={12} />
            <Link href={`/categories/${product.category.slug}`} className="hover:text-navy transition-colors">
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight size={12} />
        <span className="text-navy font-medium line-clamp-1">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-12">
        {/* Image gallery */}
        <div className="space-y-3">
          <div className="aspect-square rounded-2xl bg-cream overflow-hidden relative">
            {images[selectedImage] && !imgErrors[selectedImage] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={images[selectedImage]!}
                alt={product.name}
                onError={() => setImgErrors(e => ({ ...e, [selectedImage]: true }))}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package size={64} className="text-gray-200" />
              </div>
            )}
            {!inStock && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                <Badge variant="danger">Out of stock</Badge>
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-colors ${
                    i === selectedImage ? 'border-primary' : 'border-transparent'
                  }`}
                >
                  {img && !imgErrors[i] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" onError={() => setImgErrors(e => ({ ...e, [i]: true }))} className="object-cover w-full h-full" />
                  ) : (
                    <div className="w-full h-full bg-cream flex items-center justify-center">
                      <Package size={20} className="text-gray-300" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          {product.category && (
            <Link href={`/categories/${product.category.slug}`}>
              <Badge variant="primary" className="mb-3">{product.category.name}</Badge>
            </Link>
          )}
          {product.is_featured && <Badge variant="warning" className="ml-2 mb-3">Featured</Badge>}

          <h1 className="text-3xl font-bold text-navy mb-2 leading-snug">{product.name}</h1>
          {product.sku && <p className="text-xs text-gray-400 mb-4">SKU: {product.sku}</p>}

          <p className="text-4xl font-bold text-primary mb-4">{formatPrice(product.price)}</p>

          <div className="mb-6">
            {inStock ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-green-600 font-medium">
                <Check size={14} /> In stock ({product.stock_qty} available)
              </span>
            ) : (
              <span className="text-sm text-red font-medium">Out of stock</span>
            )}
          </div>

          {/* Quantity + Add to cart */}
          {inStock && (
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="px-3 py-2.5 hover:bg-cream transition-colors"
                >
                  <Minus size={14} className="text-navy" />
                </button>
                <span className="px-4 text-sm font-bold text-navy">{qty}</span>
                <button
                  onClick={() => setQty(Math.min(product.stock_qty, qty + 1))}
                  className="px-3 py-2.5 hover:bg-cream transition-colors"
                >
                  <Plus size={14} className="text-navy" />
                </button>
              </div>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleAddToCart}
                loading={cartLoading}
                disabled={added}
              >
                {added ? (
                  <><Check size={16} /> Added!</>
                ) : (
                  <><ShoppingCart size={16} /> Add to Cart</>
                )}
              </Button>
              {user && (
                <button
                  onClick={handleWishlist}
                  className={`p-3 rounded-xl border transition-colors ${
                    wishlisted ? 'border-red text-red bg-red-light' : 'border-gray-200 text-gray-400 hover:border-red hover:text-red'
                  }`}
                >
                  <Heart size={18} fill={wishlisted ? 'currentColor' : 'none'} />
                </button>
              )}
            </div>
          )}

          {/* Description tabs */}
          <div className="mt-8 border-t border-gray-100 pt-6">
            <div className="flex gap-4 mb-4">
              {(['description', 'details'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-sm font-semibold pb-2 border-b-2 transition-colors capitalize ${
                    activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-navy'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            {activeTab === 'description' ? (
              <p className="text-sm text-gray-500 leading-relaxed">
                {product.description || 'No description available.'}
              </p>
            ) : (
              <dl className="space-y-2 text-sm">
                <div className="flex gap-4">
                  <dt className="text-gray-400 w-28 shrink-0">SKU</dt>
                  <dd className="text-navy font-medium">{product.sku || '—'}</dd>
                </div>
                <div className="flex gap-4">
                  <dt className="text-gray-400 w-28 shrink-0">Category</dt>
                  <dd className="text-navy font-medium">{product.category?.name || '—'}</dd>
                </div>
                <div className="flex gap-4">
                  <dt className="text-gray-400 w-28 shrink-0">Stock</dt>
                  <dd className="text-navy font-medium">{product.stock_qty} units</dd>
                </div>
                <div className="flex gap-4">
                  <dt className="text-gray-400 w-28 shrink-0">Added</dt>
                  <dd className="text-navy font-medium">
                    {new Date(product.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
