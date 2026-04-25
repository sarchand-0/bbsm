'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Package, Star, ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/lib/cart'
import { formatPrice } from '@/lib/utils'
import type { ProductOut } from '@/types'

export function ProductCard({ product }: { product: ProductOut }) {
  const { addItem, openDrawer } = useCartStore()
  const [imgError, setImgError] = useState(false)
  const img = !imgError ? product.images?.[0] : null

  async function handleAdd(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    await addItem(product.id)
    openDrawer()
  }

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover hover:-translate-y-1.5 transition-all duration-200 block"
    >
      {/* Image */}
      <div className="h-44 bg-cream flex items-center justify-center relative overflow-hidden">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={product.name}
            onError={() => setImgError(true)}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <Package size={40} className="text-gray-200" />
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-navy/0 group-hover:bg-navy/18 transition-colors duration-300 flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0 bg-white text-navy text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-lg">
            View details
          </span>
        </div>

        {product.is_featured && (
          <span className="absolute top-3 left-3 bg-primary text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded flex items-center gap-1">
            <Star size={8} fill="currentColor" /> Featured
          </span>
        )}

        {product.stock_qty === 0 && (
          <span className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="bg-gray-100 text-gray-500 text-xs font-bold px-3 py-1.5 rounded-full">Out of stock</span>
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4 border-t border-black/[0.05]">
        {product.category && (
          <p className="text-[9px] font-bold text-primary/80 uppercase tracking-widest mb-1.5">
            {product.category.name}
          </p>
        )}
        <p className="font-semibold text-navy text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
          {product.name}
        </p>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/[0.05]">
          <span className="text-base font-bold text-primary">{formatPrice(product.price)}</span>
          {product.stock_qty > 0 && (
            <button
              onClick={handleAdd}
              className="w-8 h-8 rounded-xl bg-primary-light text-primary hover:bg-primary hover:text-white transition-colors flex items-center justify-center"
              aria-label="Add to cart"
            >
              <ShoppingCart size={14} />
            </button>
          )}
        </div>
      </div>
    </Link>
  )
}
