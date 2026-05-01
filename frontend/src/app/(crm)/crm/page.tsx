'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ShoppingBag, Users, TrendingUp, AlertTriangle,
  Package, Clock, ArrowUpRight, ChevronRight, Zap,
} from 'lucide-react'
import { Badge, ErrorBanner } from '@/components/ui'
import { useAuthStore } from '@/lib/auth'
import { api } from '@/lib/api'
import { formatPrice } from '@/lib/utils'

interface DashboardStats {
  today_orders: number
  today_revenue: number
  new_users_7d: number
  low_stock_count: number
}

interface RevenuePoint { date: string; revenue: number; orders: number }

interface RecentOrder {
  id: string; status: string; total: number
  customer_name: string; customer_email: string
  item_count: number; placed_at: string
}

interface LowStockItem {
  id: string; name: string; slug: string; stock_qty: number; sku: string | null
}

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'ghost'

const STATUS_COLOR: Record<string, BadgeVariant> = {
  pending: 'warning', confirmed: 'info', packed: 'warning',
  shipped: 'info', delivered: 'success', cancelled: 'danger',
}

function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const [hovered, setHovered] = useState<RevenuePoint | null>(null)
  const maxRev = Math.max(...data.map(r => r.revenue), 1)
  const totalRevenue = data.reduce((s, r) => s + r.revenue, 0)
  const totalOrders = data.reduce((s, r) => s + r.orders, 0)

  return (
    <div className="bg-[#13151F] border border-white/[0.06] rounded-2xl p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="font-bold text-white text-sm">Revenue — Last 7 Days</h2>
          <p className="text-xs text-white/30 mt-0.5">{totalOrders} orders · {formatPrice(totalRevenue)} total</p>
        </div>
        {hovered && (
          <div className="text-right">
            <p className="text-sm font-bold text-white">{formatPrice(hovered.revenue)}</p>
            <p className="text-[10px] text-white/30">{hovered.orders} orders · {new Date(hovered.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
          </div>
        )}
      </div>

      {/* Grid lines */}
      <div className="relative">
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="border-t border-white/[0.04] w-full" />
          ))}
        </div>
        <div className="flex items-end gap-2 h-36 relative">
          {data.map((r) => {
            const pct = Math.max((r.revenue / maxRev) * 128, 4)
            const isHov = hovered?.date === r.date
            return (
              <div
                key={r.date}
                className="flex-1 flex flex-col items-center gap-1.5 cursor-pointer group"
                onMouseEnter={() => setHovered(r)}
                onMouseLeave={() => setHovered(null)}
              >
                <div className="w-full flex flex-col items-center justify-end h-32">
                  <div
                    className={`w-full rounded-t-lg transition-all duration-150 ${isHov ? 'bg-primary opacity-100' : 'bg-steel opacity-60 group-hover:opacity-80'}`}
                    style={{ height: `${pct}px` }}
                  />
                </div>
                <span className={`text-[9px] transition-colors ${isHov ? 'text-white/60' : 'text-white/20'}`}>
                  {new Date(r.date).toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function CRMDashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [revenue, setRevenue] = useState<RevenuePoint[]>([])
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [lowStock, setLowStock] = useState<LowStockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.get<DashboardStats>('/admin/dashboard/stats'),
      api.get<RevenuePoint[]>('/admin/dashboard/revenue?days=7'),
      api.get<RecentOrder[]>('/admin/dashboard/recent-orders?limit=6'),
      api.get<LowStockItem[]>('/admin/dashboard/low-stock?limit=6'),
    ]).then(([s, r, ro, ls]) => {
      setStats(s); setRevenue(r); setRecentOrders(ro); setLowStock(ls)
    })
      .catch(() => setError('Failed to load dashboard data'))
      .finally(() => setLoading(false))
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const KPI_CARDS = [
    {
      label: "Today's Orders", value: stats?.today_orders ?? '—',
      icon: ShoppingBag, gradient: 'from-blue-500/20 to-blue-600/5',
      iconBg: 'bg-blue-500/10', iconColor: 'text-blue-400',
      dot: 'bg-blue-500',
    },
    {
      label: "Today's Revenue", value: stats ? formatPrice(stats.today_revenue) : '—',
      icon: TrendingUp, gradient: 'from-emerald-500/20 to-emerald-600/5',
      iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-400',
      dot: 'bg-emerald-500',
    },
    {
      label: 'New Users (7d)', value: stats?.new_users_7d ?? '—',
      icon: Users, gradient: 'from-violet-500/20 to-violet-600/5',
      iconBg: 'bg-violet-500/10', iconColor: 'text-violet-400',
      dot: 'bg-violet-500',
    },
    {
      label: 'Low Stock Items', value: stats?.low_stock_count ?? '—',
      icon: AlertTriangle, gradient: 'from-orange-500/20 to-orange-600/5',
      iconBg: 'bg-orange-500/10', iconColor: 'text-orange-400',
      dot: 'bg-orange-500',
      alert: (stats?.low_stock_count ?? 0) > 0,
    },
  ]

  return (
    <div className="p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/20 mb-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-2xl font-bold text-white">
            {greeting}, {user?.full_name.split(' ')[0]}
          </h1>
          <p className="text-sm text-white/30 mt-1">
            {user?.role === 'admin' ? 'Full admin access — all systems visible.' : 'Staff access — operations & catalog.'}
          </p>
        </div>
        <Link
          href="/crm/orders"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-dark transition-colors"
        >
          <Zap size={14} /> Manage Orders
        </Link>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CARDS.map((card) => (
          <div
            key={card.label}
            className={`relative bg-gradient-to-br ${card.gradient} bg-[#13151F] border border-white/[0.06] rounded-2xl p-5 overflow-hidden`}
          >
            <div className={`absolute top-0 left-0 right-0 h-0.5 ${card.dot}`} />
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${card.iconBg}`}>
              <card.icon size={17} className={card.iconColor} />
            </div>
            <p className="text-2xl font-bold text-white tabular-nums">
              {loading ? <span className="text-white/20">—</span> : card.value}
            </p>
            <p className="text-xs text-white/30 mt-1">{card.label}</p>
            {card.alert && !loading && (
              <span className="absolute top-3 right-3 w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
            )}
          </div>
        ))}
      </div>

      {/* Chart + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Revenue chart — 3 cols */}
        <div className="lg:col-span-3">
          {revenue.length > 0 ? (
            <RevenueChart data={revenue} />
          ) : (
            <div className="bg-[#13151F] border border-white/[0.06] rounded-2xl p-6 h-full flex items-center justify-center">
              <p className="text-white/20 text-sm">No revenue data yet</p>
            </div>
          )}
        </div>

        {/* Recent Orders — 2 cols */}
        <div className="lg:col-span-2 bg-[#13151F] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white text-sm">Recent Orders</h2>
            <Link href="/crm/orders" className="text-[10px] text-steel hover:text-white transition-colors flex items-center gap-1">
              View all <ArrowUpRight size={10} />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-8 w-8 bg-white/[0.05] rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-white/[0.05] rounded w-3/4" />
                    <div className="h-2 bg-white/[0.03] rounded w-1/2" />
                  </div>
                  <div className="h-3 bg-white/[0.05] rounded w-12" />
                </div>
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <p className="text-white/20 text-sm text-center py-8">No orders yet</p>
          ) : (
            <div className="space-y-1">
              {recentOrders.map((o) => (
                <Link
                  key={o.id}
                  href="/crm/orders"
                  className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-white/[0.03] transition-colors group"
                >
                  <div className="w-8 h-8 bg-white/[0.04] rounded-lg flex items-center justify-center shrink-0">
                    <Package size={13} className="text-white/30" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{o.customer_name}</p>
                    <p className="text-[10px] text-white/25">{o.item_count} items</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-white/70">{formatPrice(o.total)}</p>
                    <Badge variant={STATUS_COLOR[o.status] ?? 'default'} className="text-[9px] px-1.5 py-0">
                      {o.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Low Stock + Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Low Stock Alerts */}
        <div className="bg-[#13151F] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-orange-400" />
              <h2 className="font-bold text-white text-sm">Low Stock Alerts</h2>
            </div>
            <Link href="/crm/products" className="text-[10px] text-steel hover:text-white transition-colors flex items-center gap-1">
              Manage <ArrowUpRight size={10} />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-white/[0.03] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : lowStock.length === 0 ? (
            <p className="text-white/20 text-sm text-center py-6">All products well-stocked</p>
          ) : (
            <div className="space-y-2">
              {lowStock.map((p) => (
                <Link
                  key={p.id}
                  href="/crm/products"
                  className="flex items-center justify-between px-3 py-2.5 bg-orange-500/5 hover:bg-orange-500/10 border border-orange-500/10 rounded-xl transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white/80 truncate">{p.name}</p>
                    {p.sku && <p className="text-[10px] text-white/25">SKU: {p.sku}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-bold tabular-nums ${p.stock_qty === 0 ? 'text-red-400' : 'text-orange-400'}`}>
                      {p.stock_qty === 0 ? 'OUT' : `${p.stock_qty} left`}
                    </span>
                    <ChevronRight size={12} className="text-white/20 group-hover:text-white/40 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-[#13151F] border border-white/[0.06] rounded-2xl p-5">
          <h2 className="font-bold text-white text-sm mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/crm/products', label: 'Add Product',    icon: Package,      desc: 'Create or update listings' },
              { href: '/crm/orders',   label: 'View Orders',    icon: ShoppingBag,  desc: 'Review & advance status' },
              { href: '/crm/customers',label: 'Customers',      icon: Users,        desc: 'Manage user accounts' },
              { href: '/crm/reports',  label: 'Sales Report',   icon: TrendingUp,   desc: 'Revenue & top products' },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="group flex flex-col gap-2 p-4 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-steel/20 rounded-xl transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-steel/10 flex items-center justify-center">
                    <l.icon size={14} className="text-steel" />
                  </div>
                  <ArrowUpRight size={12} className="text-white/10 group-hover:text-steel transition-colors" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white/80">{l.label}</p>
                  <p className="text-[10px] text-white/25 leading-tight mt-0.5">{l.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Active status pill row */}
      <div className="bg-[#13151F] border border-white/[0.06] rounded-2xl px-6 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={13} className="text-white/30" />
          <p className="text-xs text-white/30 font-semibold uppercase tracking-widest">Order Pipeline</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {['pending', 'confirmed', 'packed', 'shipped', 'delivered'].map((s, i, arr) => {
            const count = recentOrders.filter(o => o.status === s).length
            return (
              <div key={s} className="flex items-center gap-3">
                <Link
                  href={`/crm/orders`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                >
                  <Badge variant={STATUS_COLOR[s] ?? 'default'} className="text-[9px]">{s}</Badge>
                  <span className="text-xs text-white/40 tabular-nums">{count}</span>
                </Link>
                {i < arr.length - 1 && <ChevronRight size={10} className="text-white/10 shrink-0" />}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
