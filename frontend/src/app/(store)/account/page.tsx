'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  User, Package, MapPin, Heart, ChevronRight, LogOut,
  Plus, Trash2, Star, CheckCircle,
} from 'lucide-react'
import { Badge, ErrorBanner } from '@/components/ui'
import { Skeleton } from '@/components/ui'
import { EmptyState } from '@/components/ui'
import { useAuthStore } from '@/lib/auth'
import { api } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import type { OrderSummaryOut, AddressOut, WishlistItemOut } from '@/types'

const STATUS_COLORS: Record<string, 'default' | 'warning' | 'info' | 'success' | 'danger'> = {
  pending: 'warning', confirmed: 'info', packed: 'warning',
  shipped: 'info', delivered: 'success', cancelled: 'danger',
}

type Tab = 'orders' | 'addresses' | 'wishlist' | 'profile'

interface AddressFormState {
  label: string; full_address: string; city: string
  postal_code: string; phone: string; is_default: boolean
}

const EMPTY_ADDR: AddressFormState = {
  label: 'Home', full_address: '', city: '', postal_code: '', phone: '', is_default: false,
}

export default function AccountPage() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [tab, setTab] = useState<Tab>('orders')

  const [orders, setOrders]       = useState<OrderSummaryOut[]>([])
  const [ordersError, setOrdersError] = useState('')
  const [ordersLoading, setOrdersLoading] = useState(true)

  const [addresses, setAddresses] = useState<AddressOut[]>([])
  const [addrLoading, setAddrLoading] = useState(true)
  const [showAddrForm, setShowAddrForm] = useState(false)
  const [addrForm, setAddrForm]   = useState<AddressFormState>(EMPTY_ADDR)
  const [addrSaving, setAddrSaving] = useState(false)
  const [addrError, setAddrError] = useState('')

  const [wishlist, setWishlist]   = useState<WishlistItemOut[]>([])
  const [wishlistLoading, setWishlistLoading] = useState(true)

  useEffect(() => {
    if (!user) { router.push('/login?from=/account'); return }
    loadOrders()
    loadAddresses()
    loadWishlist()
  }, [user])

  const loadOrders = () => {
    setOrdersLoading(true)
    setOrdersError('')
    api.get<OrderSummaryOut[]>('/orders')
      .then(setOrders)
      .catch(() => setOrdersError('Could not load orders. Please try again.'))
      .finally(() => setOrdersLoading(false))
  }

  const loadAddresses = () => {
    setAddrLoading(true)
    api.get<AddressOut[]>('/account/addresses')
      .then(setAddresses)
      .catch(() => setAddresses([]))
      .finally(() => setAddrLoading(false))
  }

  const loadWishlist = () => {
    setWishlistLoading(true)
    api.get<WishlistItemOut[]>('/wishlist')
      .then(setWishlist)
      .catch(() => setWishlist([]))
      .finally(() => setWishlistLoading(false))
  }

  const removeFromWishlist = async (productId: string) => {
    await api.delete(`/wishlist/${productId}`).catch(() => {})
    setWishlist(w => w.filter(i => i.product_id !== productId))
  }

  const saveAddress = async () => {
    if (!addrForm.full_address.trim() || !addrForm.city.trim()) {
      setAddrError('Full address and city are required.')
      return
    }
    setAddrSaving(true)
    setAddrError('')
    try {
      await api.post('/account/addresses', {
        label: addrForm.label || 'Home',
        full_address: addrForm.full_address,
        city: addrForm.city,
        postal_code: addrForm.postal_code || null,
        phone: addrForm.phone || null,
        is_default: addrForm.is_default,
      })
      setShowAddrForm(false)
      setAddrForm(EMPTY_ADDR)
      loadAddresses()
    } catch {
      setAddrError('Failed to save address. Please try again.')
    } finally { setAddrSaving(false) }
  }

  const deleteAddress = async (id: string) => {
    await api.delete(`/account/addresses/${id}`).catch(() => {})
    setAddresses(a => a.filter(x => x.id !== id))
  }

  if (!user) return null

  const TABS: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'orders',    label: 'Orders',    icon: <Package size={16} />, badge: orders.length || undefined },
    { id: 'addresses', label: 'Addresses', icon: <MapPin size={16} /> },
    { id: 'wishlist',  label: 'Wishlist',  icon: <Heart size={16} />, badge: wishlist.length || undefined },
    { id: 'profile',   label: 'Profile',   icon: <User size={16} /> },
  ]

  const activeOrders  = orders.filter(o => !['delivered', 'cancelled'].includes(o.status))
  const pastOrders    = orders.filter(o => ['delivered', 'cancelled'].includes(o.status))

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary-light flex items-center justify-center shrink-0">
            <User size={24} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy">{user.full_name}</h1>
            <p className="text-sm text-gray-400">{user.email}</p>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-red transition-colors px-3 py-2 rounded-lg hover:bg-red-light"
        >
          <LogOut size={15} /> Sign out
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-cream rounded-xl p-1 mb-8 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap relative ${
              tab === t.id ? 'bg-white shadow-sm text-navy' : 'text-gray-400 hover:text-navy'
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
            {t.badge ? (
              <span className="ml-0.5 bg-primary text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {t.badge > 9 ? '9+' : t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ── ORDERS ── */}
      {tab === 'orders' && (
        <div>
          {ordersError && (
            <ErrorBanner message={ordersError} onDismiss={() => setOrdersError('')} className="mb-4" />
          )}
          {ordersLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
            </div>
          ) : orders.length === 0 ? (
            <EmptyState
              title="No orders yet"
              description="Your orders will appear here after you make a purchase"
              action={{ label: 'Shop now', href: '/products' }}
            />
          ) : (
            <div className="space-y-6">
              {/* Active orders */}
              {activeOrders.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Active Orders</p>
                  <div className="space-y-3">
                    {activeOrders.map((order) => (
                      <Link key={order.id} href={`/account/orders/${order.id}`}>
                        <div className="bg-white rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all flex items-center gap-4 border-l-4 border-primary">
                          <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
                            <Package size={18} className="text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-navy">Order #{order.id.slice(-8).toUpperCase()}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(order.placed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                              {' · '}{order.item_count} item{order.item_count !== 1 ? 's' : ''}
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
                </div>
              )}

              {/* Past orders */}
              {pastOrders.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Past Orders</p>
                  <div className="space-y-3">
                    {pastOrders.map((order) => (
                      <Link key={order.id} href={`/account/orders/${order.id}`}>
                        <div className="bg-white rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-cream flex items-center justify-center shrink-0">
                            {order.status === 'delivered'
                              ? <CheckCircle size={18} className="text-green-500" />
                              : <Package size={18} className="text-gray-300" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-navy">Order #{order.id.slice(-8).toUpperCase()}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(order.placed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                              {' · '}{order.item_count} item{order.item_count !== 1 ? 's' : ''}
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
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── ADDRESSES ── */}
      {tab === 'addresses' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">{addresses.length} saved address{addresses.length !== 1 ? 'es' : ''}</p>
            <button
              onClick={() => { setShowAddrForm(!showAddrForm); setAddrError('') }}
              className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
            >
              <Plus size={15} /> Add Address
            </button>
          </div>

          {/* Add address form */}
          {showAddrForm && (
            <div className="bg-white rounded-2xl p-5 shadow-card mb-4 border border-gray-100">
              <h3 className="font-bold text-navy text-sm mb-4">New Delivery Address</h3>
              {addrError && <ErrorBanner message={addrError} onDismiss={() => setAddrError('')} className="mb-3" />}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Label</label>
                  <select
                    value={addrForm.label}
                    onChange={e => setAddrForm(f => ({ ...f, label: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {['Home', 'Office', 'Other'].map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Phone (optional)</label>
                  <input
                    type="tel"
                    placeholder="98XXXXXXXX"
                    value={addrForm.phone}
                    onChange={e => setAddrForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Full Address *</label>
                  <input
                    type="text"
                    placeholder="Street, Area, Landmark"
                    value={addrForm.full_address}
                    onChange={e => setAddrForm(f => ({ ...f, full_address: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">City *</label>
                  <input
                    type="text"
                    placeholder="Kathmandu"
                    value={addrForm.city}
                    onChange={e => setAddrForm(f => ({ ...f, city: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Postal Code</label>
                  <input
                    type="text"
                    placeholder="44600"
                    value={addrForm.postal_code}
                    onChange={e => setAddrForm(f => ({ ...f, postal_code: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <label className="col-span-2 flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addrForm.is_default}
                    onChange={e => setAddrForm(f => ({ ...f, is_default: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="font-medium text-navy">Set as default address</span>
                </label>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={saveAddress}
                  disabled={addrSaving}
                  className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {addrSaving ? 'Saving…' : 'Save Address'}
                </button>
                <button
                  onClick={() => { setShowAddrForm(false); setAddrForm(EMPTY_ADDR); setAddrError('') }}
                  className="px-5 py-2.5 text-gray-500 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {addrLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
            </div>
          ) : addresses.length === 0 ? (
            <EmptyState
              title="No saved addresses"
              description="Add a delivery address to speed up checkout"
              action={{ label: 'Add Address', onClick: () => setShowAddrForm(true) }}
            />
          ) : (
            <div className="space-y-3">
              {addresses.map((addr) => (
                <div key={addr.id} className={`bg-white rounded-2xl p-5 shadow-card flex items-start gap-4 ${addr.is_default ? 'border border-primary/20' : ''}`}>
                  <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
                    <MapPin size={18} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-navy text-sm">{addr.label}</p>
                      {addr.is_default && <Badge variant="success">Default</Badge>}
                    </div>
                    <p className="text-sm text-gray-600">{addr.full_address}, {addr.city}</p>
                    {addr.postal_code && <p className="text-xs text-gray-400 mt-0.5">Postal: {addr.postal_code}</p>}
                    {addr.phone && <p className="text-xs text-gray-400">{addr.phone}</p>}
                  </div>
                  <button
                    onClick={() => deleteAddress(addr.id)}
                    className="p-2 text-gray-300 hover:text-red hover:bg-red-light rounded-lg transition-colors"
                    aria-label="Delete address"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── WISHLIST ── */}
      {tab === 'wishlist' && (
        wishlistLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
          </div>
        ) : wishlist.length === 0 ? (
          <EmptyState
            title="Your wishlist is empty"
            description="Save products you love by tapping the heart on any product page"
            action={{ label: 'Browse products', href: '/products' }}
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {wishlist.map((item) => (
              <div key={item.product_id} className="bg-white rounded-2xl shadow-card overflow-hidden group relative">
                <button
                  onClick={() => removeFromWishlist(item.product_id)}
                  className="absolute top-2 right-2 z-10 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center text-gray-400 hover:text-red hover:bg-red-light transition-colors opacity-0 group-hover:opacity-100"
                  aria-label="Remove from wishlist"
                >
                  <Trash2 size={12} />
                </button>
                <Link href={`/products/${item.product.slug}`}>
                  <div className="h-28 bg-cream flex items-center justify-center">
                    {item.product.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <Package size={28} className="text-gray-200" />
                    )}
                  </div>
                  <div className="p-3">
                    {item.product.category && (
                      <p className="text-[9px] font-bold text-primary/70 uppercase tracking-widest mb-1">
                        {item.product.category.name}
                      </p>
                    )}
                    <p className="text-xs font-semibold text-navy line-clamp-2 leading-snug">{item.product.name}</p>
                    <p className="text-primary font-bold text-sm mt-1.5">{formatPrice(item.product.price)}</p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── PROFILE ── */}
      {tab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-card">
            <h2 className="font-bold text-navy text-sm mb-5">Personal Information</h2>
            <dl className="space-y-4 text-sm">
              <div className="flex gap-4 pb-4 border-b border-gray-50">
                <dt className="text-gray-400 w-28 shrink-0">Full name</dt>
                <dd className="font-medium text-navy">{user.full_name}</dd>
              </div>
              <div className="flex gap-4 pb-4 border-b border-gray-50">
                <dt className="text-gray-400 w-28 shrink-0">Email</dt>
                <dd className="font-medium text-navy">{user.email}</dd>
              </div>
              <div className="flex gap-4 pb-4 border-b border-gray-50">
                <dt className="text-gray-400 w-28 shrink-0">Phone</dt>
                <dd className="font-medium text-navy">{user.phone ?? <span className="text-gray-300">Not provided</span>}</dd>
              </div>
              <div className="flex gap-4">
                <dt className="text-gray-400 w-28 shrink-0">Account type</dt>
                <dd><Badge variant="ghost">{user.role}</Badge></dd>
              </div>
            </dl>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-card">
            <h2 className="font-bold text-navy text-sm mb-5">Account Summary</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-cream rounded-xl">
                <div className="w-9 h-9 bg-primary-light rounded-lg flex items-center justify-center">
                  <Package size={16} className="text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold text-navy">{orders.length}</p>
                  <p className="text-xs text-gray-400">Total orders</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-cream rounded-xl">
                <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center">
                  <CheckCircle size={16} className="text-green-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-navy">{orders.filter(o => o.status === 'delivered').length}</p>
                  <p className="text-xs text-gray-400">Delivered</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-cream rounded-xl">
                <div className="w-9 h-9 bg-primary-light rounded-lg flex items-center justify-center">
                  <Star size={16} className="text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold text-navy">{wishlist.length}</p>
                  <p className="text-xs text-gray-400">Wishlist items</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
