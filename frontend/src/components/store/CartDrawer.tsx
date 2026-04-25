'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X, Package, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { useCartStore } from '@/lib/cart'
import { formatPrice } from '@/lib/utils'
import { Button } from '@/components/ui'

function CartThumb({ src, alt }: { src: string | null | undefined; alt: string }) {
  const [err, setErr] = useState(false)
  return (
    <div className="w-16 h-16 rounded-xl bg-cream flex items-center justify-center shrink-0 overflow-hidden">
      {src && !err ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} onError={() => setErr(true)} className="w-full h-full object-cover" />
      ) : (
        <Package size={20} className="text-gray-300" />
      )}
    </div>
  )
}

export function CartDrawer() {
  const { items, total, drawerOpen, closeDrawer, updateItem, removeItem, loading } = useCartStore()

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-navy/40 backdrop-blur-sm transition-opacity duration-300 ${
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeDrawer}
      />

      {/* Panel */}
      <div className={`fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-white shadow-2xl flex flex-col transition-transform duration-300 ${
        drawerOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-navy" />
            <h2 className="font-bold text-navy text-base">Cart</h2>
            {items.length > 0 && (
              <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {items.length}
              </span>
            )}
          </div>
          <button onClick={closeDrawer} className="p-1.5 rounded-lg text-gray-400 hover:text-navy hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full pb-12 gap-4">
              <div className="w-20 h-20 bg-cream rounded-full flex items-center justify-center">
                <Package size={32} className="text-primary/40" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-navy">Your cart is empty</p>
                <p className="text-sm text-gray-400 mt-1">Add products to get started</p>
              </div>
              <Button variant="primary" size="sm" onClick={closeDrawer}>
                <Link href="/products">Browse products</Link>
              </Button>
            </div>
          ) : (
            items.map((item) => {
              const img = item.product.images?.[0]
              return (
                <div key={item.item_id} className="flex gap-3 items-start">
                  <CartThumb src={img} alt={item.product.name} />

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy line-clamp-2 leading-snug">{item.product.name}</p>
                    <p className="text-primary font-bold text-sm mt-0.5">{formatPrice(item.subtotal)}</p>

                    {/* Qty controls */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => item.quantity > 1 ? updateItem(item.item_id, item.quantity - 1) : removeItem(item.item_id)}
                        disabled={loading}
                        className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-navy hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-sm font-bold text-navy w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateItem(item.item_id, item.quantity + 1)}
                        disabled={loading || item.quantity >= item.product.stock_qty}
                        className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-navy hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeItem(item.item_id)}
                    disabled={loading}
                    className="p-1.5 text-gray-300 hover:text-red transition-colors mt-0.5"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Subtotal</span>
              <span className="font-bold text-navy">{formatPrice(total)}</span>
            </div>
            <Link href="/checkout" onClick={closeDrawer}>
              <Button variant="primary" className="w-full">
                Proceed to Checkout
              </Button>
            </Link>
            <Link href="/cart" onClick={closeDrawer}>
              <Button variant="ghost" className="w-full text-sm">
                View full cart
              </Button>
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
