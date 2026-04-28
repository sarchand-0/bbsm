'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { User, Package, MapPin, Heart, ChevronRight, LogOut } from 'lucide-react'
import { Badge, ErrorBanner } from '@/components/ui'
import { Skeleton } from '@/components/ui'
import { EmptyState } from '@/components/ui'
import { useAuthStore } from '@/lib/auth'
import { api } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import type { OrderSummaryOut, AddressOut, ProductOut } from '@/types'

const STATUS_COLORS: Record<string, 'default' | 'warning' | 'info' | 'success' | 'danger'> = {
  pending: 'warning', confirmed: 'info', packed: 'warning',
  shipped: 'info', delivered: 'success', cancelled: 'danger',
}

type Tab = 'orders' | 'addresses' | 'wishlist' | 'profile'

export default function AccountPage() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [tab, setTab] = useState<Tab>('orders')
  const [orders, setOrders] = useState<OrderSummaryOut[]>([])
  const [addresses, setAddresses] = useState<AddressOut[]>([])
  const [wishlist, setWishlist] = useState<ProductOut[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!user) { router.push('/login?from=/account'); return }
    setLoading(true)
    setLoadError('')
    Promise.all([
      api.get<OrderSummaryOut[]>('/orders'),
      api.get<AddressOut[]>('/account/addresses').catch(() => [] as AddressOut[]),
      api.get<ProductOut[]>('/wishlist').catch(() => [] as ProductOut[]),
    ]).then(([o, a, w]) => {
      setOrders(o)
      setAddresses(a)
      setWishlist(w)
    }).catch((err) => {
      setLoadError(err?.message ?? 'Failed to load your account data. Please try again.')
    }).finally(() => setLoading(false))
  }, [user])

  if (!user) return null

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'orders',    label: 'Orders',    icon: <Package size={16} /> },
    { id: 'addresses', label: 'Addresses', icon: <MapPin size={16} /> },
    { id: 'wishlist',  label: 'Wishlist',  icon: <Heart size={16} /> },
    { id: 'profile',   label: 'Profile',   icon: <User size={16} /> },
  ]

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      {loadError && <ErrorBanner message={loadError} onDismiss={() => setLoadError('')} className="mb-6" />}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-navy">My Account</h1>
          <p className="text-sm text-gray-400 mt-1">Welcome back, {user.full_name.split(' ')[0]}</p>
        </div>
        <button
          onClick={() => logout()}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-red transition-colors px-3 py-2 rounded-lg hover:bg-red-light"
        >
          <LogOut size={15} /> Sign out
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-cream rounded-xl p-1 mb-8">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === t.id ? 'bg-white shadow-sm text-navy' : 'text-gray-400 hover:text-navy'
            }`}
          >
            {t.icon} <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Orders */}
      {tab === 'orders' && (
        loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
        ) : orders.length === 0 ? (
          <EmptyState title="No orders yet" description="Your orders will appear here after you make a purchase" action={{ label: 'Shop now', href: '/products' }} />
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link key={order.id} href={`/account/orders/${order.id}`}>
                <div className="bg-white rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
                    <Package size={18} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy">Order #{order.id.slice(-8).toUpperCase()}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(order.placed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      {' · '}{order.item_count} items
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant={STATUS_COLORS[order.status] ?? 'default'}>{order.status}</Badge>
                    <p className="font-bold text-navy">{formatPrice(order.total)}</p>
                    <ChevronRight size={16} className="text-gray-300" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )
      )}

      {/* Addresses */}
      {tab === 'addresses' && (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <div key={addr.id} className="bg-white rounded-2xl p-5 shadow-card flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
                <MapPin size={18} className="text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-navy text-sm">{addr.label}</p>
                  {addr.is_default && <Badge variant="success">Default</Badge>}
                </div>
                <p className="text-sm text-gray-400 mt-1">{addr.full_address}, {addr.city}</p>
                {addr.phone && <p className="text-xs text-gray-400">{addr.phone}</p>}
              </div>
            </div>
          ))}
          {addresses.length === 0 && (
            <EmptyState title="No saved addresses" description="Add a delivery address during checkout" />
          )}
        </div>
      )}

      {/* Wishlist */}
      {tab === 'wishlist' && (
        wishlist.length === 0 ? (
          <EmptyState title="Your wishlist is empty" description="Save items you love" action={{ label: 'Browse products', href: '/products' }} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {wishlist.map((p) => (
              <Link key={p.id} href={`/products/${p.slug}`} className="bg-white rounded-2xl p-4 shadow-card hover:shadow-card-hover transition-all text-center">
                <p className="text-sm font-semibold text-navy line-clamp-2">{p.name}</p>
                <p className="text-primary font-bold mt-2">{formatPrice(p.price)}</p>
              </Link>
            ))}
          </div>
        )
      )}

      {/* Profile */}
      {tab === 'profile' && (
        <div className="bg-white rounded-2xl p-6 shadow-card max-w-md">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center">
              <User size={28} className="text-primary" />
            </div>
            <div>
              <p className="font-bold text-navy text-lg">{user.full_name}</p>
              <p className="text-sm text-gray-400">{user.email}</p>
            </div>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex gap-4">
              <dt className="text-gray-400 w-24 shrink-0">Full name</dt>
              <dd className="font-medium text-navy">{user.full_name}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="text-gray-400 w-24 shrink-0">Email</dt>
              <dd className="font-medium text-navy">{user.email}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="text-gray-400 w-24 shrink-0">Phone</dt>
              <dd className="font-medium text-navy">{user.phone ?? '—'}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="text-gray-400 w-24 shrink-0">Role</dt>
              <dd><Badge variant="ghost">{user.role}</Badge></dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  )
}
