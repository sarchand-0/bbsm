'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Package, CheckCircle, Truck, Box, Clock } from 'lucide-react'
import { Badge } from '@/components/ui'
import { Skeleton } from '@/components/ui'
import { api } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import type { OrderOut, OrderStatus } from '@/types'

const TIMELINE: { status: OrderStatus; label: string; icon: React.ReactNode }[] = [
  { status: 'pending',   label: 'Order Placed',    icon: <Clock size={16} /> },
  { status: 'confirmed', label: 'Confirmed',        icon: <CheckCircle size={16} /> },
  { status: 'packed',    label: 'Packed',           icon: <Box size={16} /> },
  { status: 'shipped',   label: 'Shipped',          icon: <Truck size={16} /> },
  { status: 'delivered', label: 'Delivered',        icon: <CheckCircle size={16} /> },
]

const STATUS_COLORS: Record<string, 'default' | 'warning' | 'info' | 'success' | 'danger'> = {
  pending: 'warning', confirmed: 'info', packed: 'warning',
  shipped: 'info', delivered: 'success', cancelled: 'danger',
}

const TIMELINE_ORDER = ['pending', 'confirmed', 'packed', 'shipped', 'delivered']

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<OrderOut | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<OrderOut>(`/orders/${id}`)
      .then(setOrder)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-10 space-y-4">
        <Skeleton className="h-8 w-1/3 rounded-lg" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-20 text-center">
        <Package size={48} className="mx-auto text-gray-200 mb-4" />
        <p className="text-navy font-semibold">Order not found</p>
        <Link href="/account" className="text-primary text-sm mt-2 inline-block hover:underline">Back to account</Link>
      </div>
    )
  }

  const currentStep = order.status === 'cancelled' ? -1 : TIMELINE_ORDER.indexOf(order.status)

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
        <Link href="/account" className="hover:text-navy">Account</Link>
        <ChevronRight size={12} />
        <Link href="/account" className="hover:text-navy">Orders</Link>
        <ChevronRight size={12} />
        <span className="text-navy font-medium">#{id.slice(-8).toUpperCase()}</span>
      </nav>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-navy">Order Details</h1>
        <Badge variant={STATUS_COLORS[order.status] ?? 'default'} className="text-sm px-3 py-1">
          {order.status}
        </Badge>
      </div>

      {/* Status timeline */}
      {order.status !== 'cancelled' && (
        <div className="bg-white rounded-2xl p-6 shadow-card mb-6">
          <h2 className="font-bold text-navy text-sm mb-5">Order Status</h2>
          <div className="relative">
            <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-100" />
            <div
              className="absolute top-5 left-5 h-0.5 bg-primary transition-all duration-500"
              style={{ width: `${(currentStep / (TIMELINE.length - 1)) * 100}%` }}
            />
            <div className="flex justify-between relative">
              {TIMELINE.map((step, i) => {
                const done    = i <= currentStep
                const current = i === currentStep
                return (
                  <div key={step.status} className="flex flex-col items-center gap-2 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                      done
                        ? 'bg-primary border-primary text-white'
                        : 'bg-white border-gray-200 text-gray-300'
                    } ${current ? 'ring-4 ring-primary/20' : ''}`}>
                      {step.icon}
                    </div>
                    <p className={`text-xs font-medium text-center ${done ? 'text-navy' : 'text-gray-300'}`}>
                      {step.label}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="bg-white rounded-2xl p-6 shadow-card mb-6">
        <h2 className="font-bold text-navy text-sm mb-4">Items Ordered</h2>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cream flex items-center justify-center shrink-0">
                <Package size={16} className="text-gray-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-navy line-clamp-1">{item.product_name}</p>
                <p className="text-xs text-gray-400">{formatPrice(item.unit_price)} × {item.quantity}</p>
              </div>
              <p className="text-sm font-bold text-navy shrink-0">{formatPrice(item.subtotal)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-2xl p-6 shadow-card">
        <h2 className="font-bold text-navy text-sm mb-4">Order Summary</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span className="text-navy font-medium">{formatPrice(order.subtotal)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Discount</span>
              <span className="text-green-600 font-medium">−{formatPrice(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">Delivery</span>
            <span className="text-green-600 font-medium">Free</span>
          </div>
          <div className="flex justify-between font-bold pt-2 border-t border-gray-100 mt-2">
            <span className="text-navy">Total</span>
            <span className="text-primary text-lg">{formatPrice(order.total)}</span>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Placed on {new Date(order.placed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}
