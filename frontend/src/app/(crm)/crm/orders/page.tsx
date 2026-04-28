'use client'

import { useEffect, useState } from 'react'
import { Search, ChevronRight } from 'lucide-react'
import { Badge, ErrorBanner } from '@/components/ui'
import { Skeleton } from '@/components/ui'
import { api } from '@/lib/api'
import { formatPrice } from '@/lib/utils'

interface AdminOrder {
  id: string
  status: string
  total: number
  customer_name: string
  customer_email: string
  item_count: number
  placed_at: string
}

const STATUS_VARIANTS: Record<string, any> = {
  pending: 'warning', confirmed: 'info', packed: 'warning',
  shipped: 'info', delivered: 'success', cancelled: 'danger',
}
const ALL_STATUSES = ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled']

export default function CRMOrdersPage() {
  const [orders, setOrders]   = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch]   = useState('')
  const [status, setStatus]   = useState('')
  const [selected, setSelected] = useState<AdminOrder | null>(null)
  const [updating, setUpdating] = useState(false)
  const [actionError, setActionError] = useState('')

  const load = () => {
    setLoading(true)
    setLoadError('')
    const q = new URLSearchParams()
    if (search) q.set('customer_email', search)
    if (status) q.set('status', status)
    api.get<AdminOrder[]>(`/admin/orders?${q.toString()}`)
      .then(setOrders)
      .catch(() => setLoadError('Failed to load orders. Check your connection.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [search, status])

  const advanceStatus = async (order: AdminOrder) => {
    const next: Record<string, string> = {
      pending: 'confirmed', confirmed: 'packed', packed: 'shipped', shipped: 'delivered',
    }
    const nextStatus = next[order.status]
    if (!nextStatus) return
    setUpdating(true)
    setActionError('')
    try {
      await api.patch(`/admin/orders/${order.id}/status`, { status: nextStatus })
      load()
      setSelected(null)
    } catch (e: any) {
      setActionError(e?.message ?? 'Failed to update status')
    } finally { setUpdating(false) }
  }

  const cancelOrder = async (order: AdminOrder) => {
    if (!confirm('Cancel this order?')) return
    setActionError('')
    try {
      await api.patch(`/admin/orders/${order.id}/status`, { status: 'cancelled' })
      load()
      setSelected(null)
    } catch (e: any) {
      setActionError(e?.message ?? 'Failed to cancel order')
    }
  }

  return (
    <div className="p-6 flex gap-6 h-[calc(100vh-2rem)]">
      {/* Main table */}
      <div className="flex-1 min-w-0 flex flex-col">
        <h1 className="text-2xl font-bold text-navy mb-4">Orders</h1>

        {loadError && <ErrorBanner message={loadError} onDismiss={() => setLoadError('')} className="mb-4" />}

        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Search by customer email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">All statuses</option>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="bg-white rounded-2xl shadow-card overflow-hidden flex-1 overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-white border-b border-gray-100">
              <tr>
                {['Order', 'Customer', 'Total', 'Items', 'Status', 'Date', ''].map(h => (
                  <th key={h} className="text-left text-xs font-bold uppercase tracking-wide text-gray-400 px-5 py-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                  <td key={j} className="px-5 py-4"><Skeleton className="h-4 rounded" /></td>
                ))}</tr>
              )) : orders.map(o => (
                <tr key={o.id} onClick={() => setSelected(o)} className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer">
                  <td className="px-5 py-3 font-mono text-xs text-navy font-bold">#{o.id.slice(-8).toUpperCase()}</td>
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-navy">{o.customer_name}</p>
                    <p className="text-xs text-gray-400">{o.customer_email}</p>
                  </td>
                  <td className="px-5 py-3 font-bold text-navy text-sm">{formatPrice(o.total)}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{o.item_count}</td>
                  <td className="px-5 py-3"><Badge variant={STATUS_VARIANTS[o.status] ?? 'default'}>{o.status}</Badge></td>
                  <td className="px-5 py-3 text-xs text-gray-400">{new Date(o.placed_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3"><ChevronRight size={14} className="text-gray-300" /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && orders.length === 0 && <p className="text-center py-12 text-gray-400 text-sm">No orders found</p>}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-80 shrink-0 bg-white rounded-2xl shadow-card p-5 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <p className="font-bold text-navy text-sm">Order Detail</p>
            <button onClick={() => setSelected(null)} className="text-gray-300 hover:text-gray-600">✕</button>
          </div>
          <p className="font-mono font-bold text-navy">#{selected.id.slice(-8).toUpperCase()}</p>
          <p className="text-sm text-gray-500 mt-1">{selected.customer_name}</p>
          <p className="text-xs text-gray-400">{selected.customer_email}</p>
          <Badge variant={STATUS_VARIANTS[selected.status] ?? 'default'} className="mt-3">
            {selected.status}
          </Badge>
          <div className="border-t border-gray-100 mt-4 pt-4">
            <p className="text-xl font-bold text-primary">{formatPrice(selected.total)}</p>
            <p className="text-xs text-gray-400">{selected.item_count} items · {new Date(selected.placed_at).toLocaleString()}</p>
          </div>
          {actionError && <div className="mt-3"><ErrorBanner message={actionError} onDismiss={() => setActionError('')} /></div>}
          <div className="mt-4 space-y-2">
            {!['delivered', 'cancelled'].includes(selected.status) && (
              <button
                onClick={() => advanceStatus(selected)}
                disabled={updating}
                className="w-full py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                Advance Status →
              </button>
            )}
            {!['delivered', 'cancelled'].includes(selected.status) && (
              <button
                onClick={() => cancelOrder(selected)}
                className="w-full py-2.5 bg-red-light text-red text-sm font-bold rounded-xl hover:bg-red hover:text-white transition-colors"
              >
                Cancel Order
              </button>
            )}
            <a
              href={`/crm/deliveries`}
              className="block w-full py-2.5 bg-gray-50 text-gray-600 text-sm font-medium rounded-xl text-center hover:bg-gray-100 transition-colors"
            >
              Assign Rider
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
