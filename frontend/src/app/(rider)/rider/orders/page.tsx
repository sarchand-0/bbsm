'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Package, MapPin, Clock, ChevronRight } from 'lucide-react'
import { Skeleton } from '@/components/ui'
import { EmptyState } from '@/components/ui'
import { api } from '@/lib/api'
import { formatPrice } from '@/lib/utils'

interface RiderOrder {
  id: string
  status: string
  customer_name: string
  delivery_address: string
  delivery_city: string
  total: number
  assigned_at: string | null
  estimated_delivery_at: string | null
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  confirmed:        { label: 'Assigned',        color: 'bg-blue-100 text-blue-700' },
  packed:           { label: 'Ready for Pickup', color: 'bg-purple-100 text-purple-700' },
  shipped:          { label: 'Picked Up',        color: 'bg-orange-100 text-orange-700' },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-primary-light text-primary' },
  delivered:        { label: 'Delivered',        color: 'bg-green-100 text-green-700' },
}

export default function RiderOrdersPage() {
  const [orders, setOrders] = useState<RiderOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<RiderOrder[]>('/rider/orders')
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-navy mb-6">My Orders</h1>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState title="No deliveries assigned" description="Check back soon — orders will appear here when assigned" />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const s = STATUS_LABELS[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-600' }
            return (
              <Link key={order.id} href={`/rider/orders/${order.id}`}>
                <div className="bg-white rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
                        <Package size={18} className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-navy text-sm">#{order.id.slice(-8).toUpperCase()}</p>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{order.customer_name}</p>
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                          <MapPin size={11} />
                          <span className="truncate">{order.delivery_address}</span>
                        </div>
                        {order.estimated_delivery_at && (
                          <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
                            <Clock size={11} />
                            <span>
                              ETA {new Date(order.estimated_delivery_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <p className="font-bold text-navy text-sm">{formatPrice(order.total)}</p>
                      <ChevronRight size={16} className="text-gray-300" />
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
