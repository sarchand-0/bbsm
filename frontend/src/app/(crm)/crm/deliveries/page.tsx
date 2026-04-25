'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Truck, Package, UserCheck, RefreshCw, Circle } from 'lucide-react'
import { Button, Badge, ErrorBanner } from '@/components/ui'
import { api } from '@/lib/api'
import type { DeliveryOut, MapRiderOut, RiderOut } from '@/types'

const ORDER_STATUSES: Record<string, 'default' | 'warning' | 'info' | 'success' | 'danger'> = {
  pending: 'warning', confirmed: 'info', packed: 'warning',
  shipped: 'info', out_for_delivery: 'info', delivered: 'success', cancelled: 'danger',
}

const DeliveryMap = dynamic(() => import('@/components/ui/DeliveryMap'), { ssr: false })

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<DeliveryOut[]>([])
  const [mapRiders, setMapRiders]   = useState<MapRiderOut[]>([])
  const [riders, setRiders]         = useState<RiderOut[]>([])
  const [selected, setSelected]     = useState<DeliveryOut | null>(null)
  const [assigning, setAssigning]   = useState(false)
  const [assignRiderId, setAssignRiderId] = useState('')
  const [assignError, setAssignError] = useState('')
  const [loading, setLoading]       = useState(true)

  const load = async () => {
    const [d, m, r] = await Promise.all([
      api.get<DeliveryOut[]>('/admin/deliveries?active_only=true'),
      api.get<MapRiderOut[]>('/admin/delivery-map'),
      api.get<RiderOut[]>('/admin/riders'),
    ])
    setDeliveries(d)
    setMapRiders(m)
    setRiders(r.filter(r => r.is_active && r.is_available))
    setLoading(false)
  }

  useEffect(() => {
    load()
    const iv = setInterval(load, 30000)
    return () => clearInterval(iv)
  }, [])

  const handleRiderClick = (activeOrderId: string | null) => {
    if (!activeOrderId) return
    const d = deliveries.find(d => d.order_id === activeOrderId)
    if (d) setSelected(d)
  }

  const handleAssign = async () => {
    if (!selected || !assignRiderId) return
    setAssigning(true)
    try {
      await api.post(`/admin/orders/${selected.order_id}/assign`, {
        rider_id: assignRiderId,
        estimated_minutes: 60,
      })
      await load()
      setSelected(null)
      setAssignRiderId('')
    } catch (e: any) {
      setAssignError(e?.message ?? 'Failed to assign rider')
    } finally { setAssigning(false) }
  }

  const unassigned = deliveries.filter(d => !d.rider_id)

  return (
    <div className="p-6 h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-navy">Live Deliveries</h1>
        <button onClick={load} className="flex items-center gap-2 text-sm text-gray-400 hover:text-navy transition-colors">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Summary chips */}
      <div className="flex gap-3 mb-4 flex-wrap">
        {[
          { label: `${deliveries.length} active`, color: 'bg-blue-50 text-blue-700' },
          { label: `${unassigned.length} unassigned`, color: 'bg-amber-50 text-amber-700' },
          { label: `${mapRiders.filter(r => r.is_available).length} riders online`, color: 'bg-green-50 text-green-700' },
        ].map((c) => (
          <span key={c.label} className={`text-xs font-semibold px-3 py-1.5 rounded-full ${c.color}`}>{c.label}</span>
        ))}
      </div>

      <div className="flex-1 grid lg:grid-cols-3 gap-4 min-h-0">
        {/* Map */}
        <div className="lg:col-span-2 min-h-[400px]">
          <DeliveryMap
            riders={mapRiders.map(r => ({
              rider_id: r.rider_id,
              name: r.name,
              lat: r.lat,
              lng: r.lng,
              is_available: r.is_available,
              active_order_id: r.active_order_id,
            }))}
            selectedAddress={selected?.delivery_address ?? null}
            onRiderClick={handleRiderClick}
          />
        </div>

        {/* Side panel */}
        <div className="flex flex-col gap-3 overflow-y-auto">
          {/* Selected delivery detail + assign */}
          {selected && (
            <div className="bg-white rounded-2xl p-4 shadow-card border-2 border-primary">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-primary uppercase tracking-wide">Selected Order</p>
                <button onClick={() => setSelected(null)} className="text-gray-300 hover:text-gray-600 text-xs">✕</button>
              </div>
              <p className="font-bold text-navy text-sm">#{selected.order_id.slice(-8).toUpperCase()}</p>
              <p className="text-xs text-gray-500 mt-1">{selected.customer_name}</p>
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                <MapPin size={10} /> {selected.delivery_address}
              </p>
              <p className="text-[10px] text-gray-300 mt-1">Map zooms to this address automatically</p>
              <Badge variant={ORDER_STATUSES[selected.order_status] ?? 'default'} className="mt-2">
                {selected.order_status}
              </Badge>

              {!selected.rider_id && (
                <div className="mt-4 space-y-2">
                  <label className="text-xs font-semibold text-gray-600">Assign Rider</label>
                  <select
                    value={assignRiderId}
                    onChange={(e) => setAssignRiderId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Select rider…</option>
                    {riders.map((r) => (
                      <option key={r.id} value={r.id}>{r.name} · {r.vehicle_type}</option>
                    ))}
                  </select>
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    onClick={handleAssign}
                    loading={assigning}
                    disabled={!assignRiderId}
                  >
                    <UserCheck size={14} /> Assign Rider
                  </Button>
                  {assignError && <ErrorBanner message={assignError} onDismiss={() => setAssignError('')} />}
                </div>
              )}
              {selected.rider_id && (
                <p className="mt-3 text-xs text-green-700 font-medium">
                  ✓ Assigned to {selected.rider_name}
                </p>
              )}
            </div>
          )}

          {/* Unassigned queue */}
          {unassigned.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">
                Unassigned ({unassigned.length})
              </p>
              {unassigned.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelected(d)}
                  className={`w-full text-left rounded-xl p-3 mb-2 transition-colors border ${
                    selected?.id === d.id
                      ? 'bg-amber-100 border-amber-400'
                      : 'bg-amber-50 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-navy">#{d.order_id.slice(-8).toUpperCase()}</p>
                    <Badge variant="warning" className="text-[10px]">{d.order_status}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{d.customer_name}</p>
                  <p className="text-xs text-gray-400 truncate">{d.delivery_address}</p>
                </button>
              ))}
            </div>
          )}

          {/* All active deliveries */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Active Deliveries</p>
            {loading ? (
              <div className="text-xs text-gray-400">Loading…</div>
            ) : deliveries.filter(d => d.rider_id).map((d) => (
              <button
                key={d.id}
                onClick={() => setSelected(d)}
                className={`w-full text-left rounded-xl p-3 mb-2 transition-all ${
                  selected?.id === d.id
                    ? 'bg-primary-light border border-primary shadow-sm'
                    : 'bg-white shadow-sm hover:shadow-card'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Truck size={12} className="text-primary shrink-0" />
                  <p className="text-xs font-bold text-navy flex-1">#{d.order_id.slice(-8).toUpperCase()}</p>
                  <Badge variant={ORDER_STATUSES[d.order_status] ?? 'default'} className="text-[10px]">
                    {d.order_status}
                  </Badge>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 ml-5">{d.rider_name} → {d.customer_name}</p>
              </button>
            ))}
            {!loading && deliveries.filter(d => d.rider_id).length === 0 && unassigned.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-8">No active deliveries</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
