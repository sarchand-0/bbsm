'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, Calendar, ShoppingBag, TrendingUp, ExternalLink } from 'lucide-react'
import { Badge, Button, ErrorBanner } from '@/components/ui'
import { Skeleton } from '@/components/ui'
import { api } from '@/lib/api'
import { formatPrice } from '@/lib/utils'

interface AdminUser {
  id: string; full_name: string; email: string; phone: string | null
  role: string; status: string; order_count: number; lifetime_value: number; created_at: string
}

interface OrderSummary {
  id: string; status: string; total: number; item_count: number; placed_at: string
}

const STATUS_VARIANTS: Record<string, any> = {
  pending: 'warning', confirmed: 'info', packed: 'warning',
  shipped: 'info', delivered: 'success', cancelled: 'danger',
}

const ALL_ROLES = ['customer', 'rider', 'staff', 'admin']

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [user, setUser]         = useState<AdminUser | null>(null)
  const [orders, setOrders]     = useState<OrderSummary[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const load = () =>
    Promise.all([
      api.get<AdminUser>(`/admin/users/${id}`),
      api.get<OrderSummary[]>(`/admin/users/${id}/orders`),
    ]).then(([u, o]) => { setUser(u); setOrders(o) })
      .catch(() => setError('Failed to load user'))
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [id])

  const changeRole = async (newRole: string) => {
    if (!user) return
    setSaving(true); setError('')
    try {
      await api.patch(`/admin/users/${user.id}/role`, { role: newRole })
      await load()
    } catch (e: any) { setError(e?.message ?? 'Failed') } finally { setSaving(false) }
  }

  const toggleStatus = async () => {
    if (!user) return
    setSaving(true); setError('')
    try {
      await api.patch(`/admin/users/${user.id}/status`, { status: user.status === 'active' ? 'suspended' : 'active' })
      await load()
    } catch (e: any) { setError(e?.message ?? 'Failed') } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-48 rounded" />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <div className="lg:col-span-2"><Skeleton className="h-96 rounded-2xl" /></div>
      </div>
    </div>
  )
  if (!user) return <div className="p-6 text-center text-gray-400 py-16">User not found</div>

  return (
    <div className="p-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-400 hover:text-navy transition-colors mb-4">
        <ArrowLeft size={14} /> Back to Users
      </button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left — profile */}
        <div className="lg:col-span-1 space-y-4">
          {/* Profile card */}
          <div className="bg-white rounded-2xl shadow-card p-6">
            <div className="text-center mb-5">
              <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center text-2xl font-bold text-primary mx-auto mb-3">
                {user.full_name[0]}
              </div>
              <p className="font-bold text-navy text-lg">{user.full_name}</p>
              <Badge variant={user.status === 'active' ? 'success' : 'danger'} className="mt-1">{user.status}</Badge>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-gray-600"><Mail size={14} className="text-gray-400 shrink-0" /><span className="truncate">{user.email}</span></div>
              {user.phone && <div className="flex items-center gap-3 text-sm text-gray-600"><Phone size={14} className="text-gray-400 shrink-0" />{user.phone}</div>}
              <div className="flex items-center gap-3 text-sm text-gray-600"><Calendar size={14} className="text-gray-400 shrink-0" />Joined {new Date(user.created_at).toLocaleDateString()}</div>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-2xl shadow-card p-5">
            <h3 className="font-bold text-navy mb-4">Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 flex items-center gap-1"><ShoppingBag size={13} /> Orders</span>
                <span className="font-bold text-navy">{user.order_count}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 flex items-center gap-1"><TrendingUp size={13} /> Lifetime Value</span>
                <span className="font-bold text-primary">{formatPrice(user.lifetime_value)}</span>
              </div>
            </div>
          </div>

          {/* Role & access */}
          <div className="bg-white rounded-2xl shadow-card p-5">
            <h3 className="font-bold text-navy mb-4">Role & Access</h3>
            {error && <ErrorBanner message={error} onDismiss={() => setError('')} className="mb-3" />}
            <div className="mb-3">
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Current Role</label>
              <select
                value={user.role}
                onChange={e => changeRole(e.target.value)}
                disabled={saving}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
              >
                {ALL_ROLES.map(r => <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
              {user.role === 'rider' && (
                <p className="text-xs text-gray-400 mt-1.5">A rider profile has been auto-created. View it in <Link href="/crm/riders" className="text-primary hover:underline">Riders</Link>.</p>
              )}
            </div>
            <Button
              variant={user.status === 'active' ? 'ghost' : 'secondary'}
              size="sm"
              className={`w-full ${user.status === 'active' ? 'text-red hover:bg-red-light' : 'text-green-700 hover:bg-green-50'}`}
              onClick={toggleStatus}
              loading={saving}
            >
              {user.status === 'active' ? 'Suspend Account' : 'Activate Account'}
            </Button>
          </div>
        </div>

        {/* Right — orders */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-navy">Order History</h2>
              <span className="text-xs text-gray-400">{orders.length} orders</span>
            </div>
            {orders.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <ShoppingBag size={36} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm">No orders yet</p>
              </div>
            ) : (
              <table className="w-full">
                <thead><tr className="border-b border-gray-50">
                  {['Order ID', 'Items', 'Total', 'Status', 'Date', ''].map(h => (
                    <th key={h} className="text-left text-xs font-bold uppercase tracking-wide text-gray-400 px-5 py-3">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-5 py-3 font-mono text-xs font-bold text-navy">#{o.id.slice(-8).toUpperCase()}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{o.item_count} item{o.item_count !== 1 ? 's' : ''}</td>
                      <td className="px-5 py-3 font-bold text-navy text-sm">{formatPrice(o.total)}</td>
                      <td className="px-5 py-3"><Badge variant={STATUS_VARIANTS[o.status] ?? 'default'}>{o.status}</Badge></td>
                      <td className="px-5 py-3 text-xs text-gray-400">{new Date(o.placed_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3">
                        <Link href={`/crm/orders?id=${o.id}`} className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                          View <ExternalLink size={10} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
