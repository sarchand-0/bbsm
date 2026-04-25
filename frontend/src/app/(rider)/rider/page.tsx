'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Package, CheckCircle, Star, ToggleLeft, ToggleRight, Navigation } from 'lucide-react'
import { api } from '@/lib/api'

interface RiderStats {
  today_delivered: number
  total_deliveries: number
  active_order_id: string | null
  is_available: boolean
  rating: number | null
}

export default function RiderDashboard() {
  const [stats, setStats]   = useState<RiderStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    api.get<RiderStats>('/rider/stats')
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))

    // Auto-push location every 30s if available
    const watchId = navigator.geolocation?.watchPosition(
      (pos) => {
        api.post('/rider/location', { lat: pos.coords.latitude, lng: pos.coords.longitude })
          .catch(() => {})
      },
      () => {},
      { enableHighAccuracy: true }
    )
    return () => { if (watchId) navigator.geolocation?.clearWatch(watchId) }
  }, [])

  const toggleAvailability = async () => {
    if (!stats) return
    setToggling(true)
    try {
      await api.patch('/rider/availability', { is_available: !stats.is_available })
      setStats({ ...stats, is_available: !stats.is_available })
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-navy mb-6">Dashboard</h1>

      {/* Availability toggle */}
      <div className={`rounded-2xl p-5 mb-6 flex items-center justify-between ${
        stats?.is_available ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
      }`}>
        <div>
          <p className="font-bold text-navy text-sm">Availability</p>
          <p className={`text-sm mt-0.5 ${stats?.is_available ? 'text-green-600' : 'text-gray-400'}`}>
            {stats?.is_available ? 'You are online and can receive deliveries' : 'You are offline'}
          </p>
        </div>
        <button
          onClick={toggleAvailability}
          disabled={toggling}
          className="flex items-center gap-2 text-sm font-semibold transition-all disabled:opacity-50"
        >
          {stats?.is_available ? (
            <ToggleRight size={40} className="text-green-500" />
          ) : (
            <ToggleLeft size={40} className="text-gray-300" />
          )}
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Today Delivered', value: stats?.today_delivered ?? '—', icon: CheckCircle, color: 'text-green-600 bg-green-50' },
          { label: 'Total Deliveries', value: stats?.total_deliveries ?? '—', icon: Package, color: 'text-primary bg-primary-light' },
          { label: 'Rating', value: stats?.rating ? `${stats.rating.toFixed(1)}★` : '—', icon: Star, color: 'text-amber-600 bg-amber-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-card">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon size={18} />
            </div>
            <p className="text-2xl font-bold text-navy">{loading ? '—' : s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Active delivery */}
      {stats?.active_order_id && (
        <div className="bg-primary-light border border-primary/20 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-primary mb-1">Active Delivery</p>
              <p className="font-bold text-navy">Order #{stats.active_order_id.slice(-8).toUpperCase()}</p>
            </div>
            <Link
              href={`/rider/orders/${stats.active_order_id}`}
              className="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-dark transition-colors"
            >
              <Navigation size={14} /> View
            </Link>
          </div>
        </div>
      )}

      <Link href="/rider/orders">
        <div className="bg-white rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all flex items-center justify-between cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center">
              <Package size={18} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-navy text-sm">My Orders Queue</p>
              <p className="text-xs text-gray-400">View all assigned deliveries</p>
            </div>
          </div>
          <span className="text-primary text-sm font-semibold">View →</span>
        </div>
      </Link>
    </div>
  )
}
