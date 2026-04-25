'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Package, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui'
import { useCartStore } from '@/lib/cart'
import { formatPrice } from '@/lib/utils'

function CartItemRow({ item, loading, updateItem, removeItem }: {
  item: any
  loading: boolean
  updateItem: (id: string, qty: number) => void
  removeItem: (id: string) => void
}) {
  const [imgError, setImgError] = useState(false)
  const img = !imgError ? item.product.images?.[0] : null

  return (
    <div className="bg-white rounded-2xl p-4 flex gap-4 shadow-card">
      <div className="w-20 h-20 rounded-xl bg-cream shrink-0 overflow-hidden flex items-center justify-center">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={item.product.name} onError={() => setImgError(true)} className="w-full h-full object-cover" />
        ) : (
          <Package size={24} className="text-gray-300" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <Link href={`/products/${item.product.slug}`} className="text-sm font-semibold text-navy hover:text-primary transition-colors line-clamp-2">
          {item.product.name}
        </Link>
        <p className="text-primary font-bold mt-1">{formatPrice(item.subtotal)}</p>
        <p className="text-xs text-gray-400">{formatPrice(item.product.price)} each</p>
      </div>
      <div className="flex flex-col items-end gap-3">
        <button onClick={() => removeItem(item.item_id)} disabled={loading} className="p-1.5 text-gray-300 hover:text-red transition-colors">
          <Trash2 size={16} />
        </button>
        <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => item.quantity > 1 ? updateItem(item.item_id, item.quantity - 1) : removeItem(item.item_id)}
            disabled={loading}
            className="px-3 py-2 hover:bg-cream transition-colors disabled:opacity-50"
          >
            <Minus size={12} className="text-navy" />
          </button>
          <span className="px-3 text-sm font-bold text-navy">{item.quantity}</span>
          <button
            onClick={() => updateItem(item.item_id, item.quantity + 1)}
            disabled={loading || item.quantity >= item.product.stock_qty}
            className="px-3 py-2 hover:bg-cream transition-colors disabled:opacity-50"
          >
            <Plus size={12} className="text-navy" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CartPage() {
  const { items, total, itemCount, loading, fetchCart, updateItem, removeItem } = useCartStore()

  useEffect(() => { fetchCart() }, [])

  if (items.length === 0 && !loading) {
    return (
      <div className="max-w-7xl mx-auto px-5 py-24 flex flex-col items-center gap-6 text-center">
        <div className="w-24 h-24 rounded-full bg-cream flex items-center justify-center">
          <ShoppingBag size={40} className="text-primary/40" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-navy">Your cart is empty</h2>
          <p className="text-gray-400 mt-2">Add some products to get started</p>
        </div>
        <Link href="/products">
          <Button variant="primary">Browse Products</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-5 py-10">
      <h1 className="text-2xl font-bold text-navy mb-8">
        Shopping Cart <span className="text-gray-400 font-normal text-lg">({itemCount} items)</span>
      </h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <CartItemRow key={item.item_id} item={item} loading={loading} updateItem={updateItem} removeItem={removeItem} />
          ))}
        </div>

        {/* Summary */}
        <div className="bg-white rounded-2xl p-6 shadow-card h-fit sticky top-24">
          <h2 className="font-bold text-navy text-lg mb-4">Order Summary</h2>
          <div className="space-y-3 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal ({itemCount} items)</span>
              <span className="font-semibold text-navy">{formatPrice(total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Delivery</span>
              <span className="text-green-600 font-medium">Free</span>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4 mb-6">
            <div className="flex justify-between font-bold text-navy">
              <span>Total</span>
              <span className="text-primary text-xl">{formatPrice(total)}</span>
            </div>
          </div>
          <Link href="/checkout">
            <Button variant="primary" className="w-full">Proceed to Checkout</Button>
          </Link>
          <Link href="/products" className="block text-center text-sm text-gray-400 hover:text-navy mt-3 transition-colors">
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  )
}
