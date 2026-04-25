'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Calendar, Clock, Star, MapPin } from 'lucide-react'
import { api } from '@/lib/api'
import { formatPrice } from '@/lib/utils'

interface Delivery {
  delivery_id: string
  order_id: string
  customer_name: string
  delivery_address: string
  total: number
  rating: number | null
  delivered_at: string | null
}

interface Earnings {
  today: number
  this_week: number
  all_time: number
}

interface HistoryData {
  deliveries: Delivery[]
  earnings: Earnings
}

export default function RiderHistoryPage() {
  const [data, setData]     = useState<HistoryData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<HistoryData>('/rider/history')
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  const earnings = data?.earnings ?? { today: 0, this_week: 0, all_time: 0 }
  const deliveries = data?.deliveries ?? []

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-navy mb-6">Delivery History</h1>

      {/* Earnings strip */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Today's Earnings",   value: earnings.today,      icon: Clock,      color: 'text-primary' },
          { label: "This Week",          value: earnings.this_week,  icon: Calendar,   color: 'text-steel' },
          { label: "All Time",           value: earnings.all_time,   icon: TrendingUp, color: 'text-accent' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={16} className={color} />
              <p className="text-xs text-gray-400 font-medium">{label}</p>
            </div>
            <p className={`text-2xl font-bold ${color}`}>
              {loading ? '—' : formatPrice(value)}
            </p>
          </div>
        ))}
      </div>

      {/* Deliveries table */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="font-bold text-navy">Completed Deliveries</p>
          <p className="text-xs text-gray-400 mt-0.5">Last 100 deliveries</p>
        </div>

        {loading ? (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4">
                <div className="h-4 bg-gray-100 rounded w-24 animate-pulse" />
                <div className="h-4 bg-gray-100 rounded flex-1 animate-pulse" />
                <div className="h-4 bg-gray-100 rounded w-20 animate-pulse" />
              </div>
            ))}
          </div>
        ) : deliveries.length === 0 ? (
          <div className="py-16 text-center">
            <TrendingUp size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No completed deliveries yet</p>
            <p className="text-xs text-gray-300 mt-1">Complete your first delivery to see it here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {deliveries.map((d) => (
              <div key={d.delivery_id} className="px-5 py-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-navy">
                      #{d.order_id.slice(-8).toUpperCase()}
                    </p>
                    <p className="text-sm text-gray-600">{d.customer_name}</p>
                  </div>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <MapPin size={10} /> {d.delivery_address}
                  </p>
                  {d.delivered_at && (
                    <p className="text-xs text-gray-300 mt-0.5">
                      {new Date(d.delivered_at).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-navy text-sm">{formatPrice(d.total)}</p>
                  {d.rating != null ? (
                    <p className="text-xs text-accent flex items-center gap-0.5 justify-end mt-0.5">
                      <Star size={10} className="fill-accent" /> {d.rating.toFixed(1)}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-300 mt-0.5">No rating</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
