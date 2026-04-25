'use client'

import { useEffect, useState } from 'react'
import { ShoppingBag, Users, TrendingUp, AlertTriangle, Truck, Star, Clock, ArrowUpRight } from 'lucide-react'
import { ErrorBanner } from '@/components/ui'
import { useAuthStore } from '@/lib/auth'
import { api } from '@/lib/api'
import { formatPrice } from '@/lib/utils'

interface DashboardStats {
  today_orders: number
  today_revenue: number
  new_users_7d: number
  low_stock_count: number
}

interface RevenuePoint { date: string; revenue: number }

export default function CRMDashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [revenue, setRevenue] = useState<RevenuePoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.get<DashboardStats>('/admin/dashboard/stats'),
      api.get<RevenuePoint[]>('/admin/dashboard/revenue?days=7'),
    ]).then(([s, r]) => { setStats(s); setRevenue(r) })
      .catch(() => setError('Failed to load dashboard data'))
      .finally(() => setLoading(false))
  }, [])

  const KPI_CARDS = [
    { label: "Today's Orders",   value: stats?.today_orders ?? '—',                       icon: ShoppingBag, color: 'bg-blue-50 text-blue-600' },
    { label: "Today's Revenue",  value: stats ? formatPrice(stats.today_revenue) : '—',   icon: TrendingUp,  color: 'bg-green-50 text-green-600' },
    { label: 'New Users (7d)',   value: stats?.new_users_7d ?? '—',                       icon: Users,       color: 'bg-purple-50 text-purple-600' },
    { label: 'Low Stock Items',  value: stats?.low_stock_count ?? '—',                    icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
  ]

  const maxRev = Math.max(...revenue.map(r => r.revenue), 1)

  return (
    <div className="p-6 max-w-6xl">
      {/* Welcome header */}
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/20 mb-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <h1 className="text-2xl font-bold text-white">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},{' '}
          {user?.full_name.split(' ')[0]}
        </h1>
        <p className="text-sm text-white/30 mt-1">
          {user?.role === 'admin' ? 'Full admin access — all systems visible.' : 'Staff access — operations & catalog.'}
        </p>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError('')} className="mb-6" />}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {KPI_CARDS.map((card) => (
          <div key={card.label} className="bg-[#13151F] border border-white/[0.06] rounded-2xl p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
              <card.icon size={18} />
            </div>
            <p className="text-2xl font-bold text-white">{loading ? '—' : card.value}</p>
            <p className="text-xs text-white/30 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      {revenue.length > 0 && (
        <div className="bg-[#13151F] border border-white/[0.06] rounded-2xl p-6 mb-6">
          <h2 className="font-bold text-white text-sm mb-6">Revenue — Last 7 Days</h2>
          <div className="flex items-end gap-2 h-40">
            {revenue.map((r) => (
              <div key={r.date} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-steel rounded-t-lg transition-all hover:bg-steel-dark opacity-80 hover:opacity-100"
                  style={{ height: `${Math.max((r.revenue / maxRev) * 140, 4)}px` }}
                  title={formatPrice(r.revenue)}
                />
                <span className="text-[10px] text-white/25">
                  {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: '/crm/deliveries', label: 'Live Deliveries', icon: Truck,  desc: 'Track active riders on map' },
          { href: '/crm/riders',     label: 'Manage Riders',   icon: Star,   desc: 'View & assign delivery riders' },
          { href: '/crm/orders',     label: 'Recent Orders',   icon: Clock,  desc: 'Review and update order status' },
        ].map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="group bg-[#13151F] border border-white/[0.06] hover:border-steel/30 rounded-2xl p-5 transition-all block"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-steel/10 flex items-center justify-center">
                <l.icon size={18} className="text-steel" />
              </div>
              <ArrowUpRight size={14} className="text-white/15 group-hover:text-steel transition-colors mt-1" />
            </div>
            <p className="font-bold text-white text-sm">{l.label}</p>
            <p className="text-xs text-white/30 mt-0.5">{l.desc}</p>
          </a>
        ))}
      </div>
    </div>
  )
}
