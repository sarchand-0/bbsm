'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Package, ChevronLeft, Navigation, CheckCircle, Truck, Clock } from 'lucide-react'
import { Button, ErrorBanner } from '@/components/ui'
import { api } from '@/lib/api'
import { formatPrice } from '@/lib/utils'

interface RiderOrderDetail {
  id: string
  status: string
  customer_name: string
  delivery_address: string
  delivery_city: string
  total: number
  otp: string | null
  assigned_at: string | null
  picked_up_at: string | null
  out_for_delivery_at: string | null
  delivered_at: string | null
  estimated_delivery_at: string | null
  items: { id: string; product_name: string; quantity: number; unit_price: number; subtotal: number }[]
}

const ACTIONS: Record<string, { action: string; label: string; icon: typeof Truck; color: string }> = {
  confirmed: { action: 'picked_up',         label: 'Mark as Picked Up',     icon: Truck,       color: 'bg-blue-600 hover:bg-blue-700' },
  packed:    { action: 'picked_up',         label: 'Mark as Picked Up',     icon: Truck,       color: 'bg-purple-600 hover:bg-purple-700' },
  shipped:   { action: 'out_for_delivery',  label: 'Out for Delivery',      icon: Navigation,  color: 'bg-orange-500 hover:bg-orange-600' },
}

export default function RiderOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [order, setOrder] = useState<RiderOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpMode, setOtpMode] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    api.get<RiderOrderDetail>(`/rider/orders/${id}`)
      .then(setOrder)
      .catch(() => router.push('/rider/orders'))
      .finally(() => setLoading(false))

    // Push GPS on load
    navigator.geolocation?.getCurrentPosition((pos) => {
      api.post('/rider/location', { lat: pos.coords.latitude, lng: pos.coords.longitude }).catch(() => {})
    })
  }, [id])

  const advance = async (action: string) => {
    setUpdating(true)
    try {
      await api.patch(`/rider/orders/${id}/status`, { action, otp: otp || undefined })
      const updated = await api.get<RiderOrderDetail>(`/rider/orders/${id}`)
      setOrder(updated)
      setOtp('')
      setOtpMode(false)
    } catch (e: any) {
      setActionError(e?.message ?? 'Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  const handleDeliver = async () => {
    if (order?.otp && !otp) { setOtpMode(true); return }
    await advance('delivered')
  }

  if (loading || !order) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  const nextAction = ACTIONS[order.status]

  return (
    <div className="p-6 max-w-2xl">
      <Link href="/rider/orders" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-navy mb-6">
        <ChevronLeft size={16} /> Back to orders
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-navy">Order #{id.slice(-8).toUpperCase()}</h1>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${
          order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-primary-light text-primary'
        }`}>
          {order.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Delivery address */}
      <div className="bg-white rounded-2xl p-5 shadow-card mb-4">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Deliver to</p>
        <div className="flex items-start gap-3">
          <MapPin size={18} className="text-primary mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-navy">{order.customer_name}</p>
            <p className="text-sm text-gray-500">{order.delivery_address}, {order.delivery_city}</p>
          </div>
        </div>
        {order.estimated_delivery_at && (
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
            <Clock size={14} />
            ETA: {new Date(order.estimated_delivery_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery_address + ' ' + order.delivery_city)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center gap-2 text-sm text-primary font-medium hover:underline"
        >
          <Navigation size={14} /> Open in Maps
        </a>
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl p-5 shadow-card mb-4">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Items</p>
        <div className="space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-navy">{item.product_name} <span className="text-gray-400">×{item.quantity}</span></span>
              <span className="font-medium text-navy">{formatPrice(item.subtotal)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between font-bold">
          <span className="text-navy">Total</span>
          <span className="text-primary">{formatPrice(order.total)}</span>
        </div>
      </div>

      {/* Delivery OTP display */}
      {order.otp && order.status !== 'delivered' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
          <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Delivery OTP</p>
          <p className="text-3xl font-bold tracking-widest text-amber-900">{order.otp}</p>
          <p className="text-xs text-amber-700 mt-1">Ask the customer for this code to confirm delivery</p>
        </div>
      )}

      {/* Action buttons */}
      {order.status !== 'delivered' && order.status !== 'cancelled' && (
        <div className="space-y-3">
          {nextAction && (
            <button
              onClick={() => advance(nextAction.action)}
              disabled={updating}
              className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold text-sm transition-colors disabled:opacity-50 ${nextAction.color}`}
            >
              <nextAction.icon size={18} />
              {nextAction.label}
            </button>
          )}

          {order.status === 'out_for_delivery' && (
            <>
              {otpMode ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500 text-center">Enter OTP provided by customer</p>
                  <input
                    type="text"
                    maxLength={4}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="4-digit OTP"
                    className="w-full text-center text-3xl font-bold tracking-widest border border-gray-200 rounded-2xl py-4 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <div className="flex gap-3">
                    <Button variant="ghost" className="flex-1" onClick={() => setOtpMode(false)}>Cancel</Button>
                    <button
                      onClick={handleDeliver}
                      disabled={updating || otp.length !== 4}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle size={16} /> Confirm Delivered
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleDeliver}
                  disabled={updating}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <CheckCircle size={18} /> Mark as Delivered
                </button>
              )}
            </>
          )}
        </div>
      )}

      {actionError && <ErrorBanner message={actionError} onDismiss={() => setActionError('')} className="mt-3" />}

      {order.status === 'delivered' && (
        <div className="bg-green-50 rounded-2xl p-5 text-center">
          <CheckCircle size={32} className="text-green-500 mx-auto mb-2" />
          <p className="font-bold text-green-800">Order Delivered Successfully</p>
          <p className="text-sm text-green-600 mt-1">
            {order.delivered_at ? new Date(order.delivered_at).toLocaleString() : ''}
          </p>
        </div>
      )}
    </div>
  )
}
