'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle, Truck, Box, Clock, Package, Phone, Star, MapPin, Navigation,
  ChevronRight
} from 'lucide-react'
import { Button, ErrorBanner } from '@/components/ui'
import { useAuthStore } from '@/lib/auth'
import { api } from '@/lib/api'
import type { TrackingOut } from '@/types'

const TIMELINE = [
  { status: 'pending',          label: 'Order Placed',     icon: Clock },
  { status: 'confirmed',        label: 'Confirmed',        icon: CheckCircle },
  { status: 'packed',           label: 'Packed',           icon: Box },
  { status: 'shipped',          label: 'Picked Up',        icon: Truck },
  { status: 'out_for_delivery', label: 'Out for Delivery', icon: Navigation },
  { status: 'delivered',        label: 'Delivered',        icon: CheckCircle },
]
const ORDER = ['pending', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered']

const STATUS_MESSAGES: Record<string, { title: string; subtitle: string; color: string }> = {
  pending:          { title: 'Order Received',     subtitle: 'We\'re preparing your order.',                   color: 'text-amber-600' },
  confirmed:        { title: 'Order Confirmed',    subtitle: 'Your order has been confirmed.',                 color: 'text-blue-600' },
  packed:           { title: 'Order Packed',       subtitle: 'Your order is packed and ready for pickup.',     color: 'text-purple-600' },
  shipped:          { title: 'Rider Picked Up',    subtitle: 'Your rider has picked up the order.',            color: 'text-orange-600' },
  out_for_delivery: { title: 'Out for Delivery',   subtitle: 'Your rider is on the way to you!',              color: 'text-primary' },
  delivered:        { title: 'Order Delivered!',   subtitle: 'Your order has arrived. Enjoy!',                color: 'text-green-600' },
  cancelled:        { title: 'Order Cancelled',    subtitle: 'This order has been cancelled.',                 color: 'text-red' },
}

export default function TrackingPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const { user } = useAuthStore()
  const [tracking, setTracking] = useState<TrackingOut | null>(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [rated, setRated] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [actionError, setActionError] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchTracking = async () => {
    try {
      const data = await api.get<TrackingOut>(`/orders/${orderId}/tracking`)
      setTracking(data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    fetchTracking()
    // Poll rider location every 20s if order is in transit
    pollRef.current = setInterval(() => {
      if (tracking && ['shipped', 'out_for_delivery'].includes(tracking.status)) {
        fetchTracking()
      }
    }, 20000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [orderId])

  const handleRate = async (stars: number) => {
    setActionError('')
    try {
      await api.post(`/orders/${orderId}/rate`, { rating: stars })
      setRated(true)
    } catch (e: any) {
      setActionError(e?.message ?? 'Failed to submit rating')
    }
  }

  const handleConfirmOtp = async () => {
    setActionError('')
    try {
      await api.post(`/orders/${orderId}/confirm-delivery`, { otp })
      setOtpSent(true)
      fetchTracking()
    } catch {
      setActionError('Incorrect OTP — please check with your rider')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-appbg flex items-center justify-center">
        <div className="animate-spin w-8 h-8 rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!tracking) {
    return (
      <div className="min-h-screen bg-appbg flex flex-col items-center justify-center gap-4">
        <Package size={48} className="text-gray-200" />
        <p className="text-navy font-semibold">Order not found</p>
        <Link href="/account"><Button variant="ghost">Back to account</Button></Link>
      </div>
    )
  }

  const currentStep = tracking.status === 'cancelled' ? -1 : ORDER.indexOf(tracking.status)
  const statusInfo = STATUS_MESSAGES[tracking.status] ?? { title: tracking.status, subtitle: '', color: 'text-navy' }
  const isInTransit = ['shipped', 'out_for_delivery'].includes(tracking.status)
  const isDelivered = tracking.status === 'delivered'

  return (
    <div className="min-h-screen bg-appbg">
      {/* Header */}
      <div className="hero-gradient text-white px-5 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 text-xs text-white/60 mb-4">
            <Link href="/" className="hover:text-white">Home</Link>
            <ChevronRight size={12} />
            <Link href="/account" className="hover:text-white">Account</Link>
            <ChevronRight size={12} />
            <span>Track Order</span>
          </div>
          <p className="text-xs text-white/60 mb-1">Order #{orderId.slice(-8).toUpperCase()}</p>
          <h1 className={`text-2xl font-bold mb-1`}>{statusInfo.title}</h1>
          <p className="text-white/70">{statusInfo.subtitle}</p>
          {tracking.estimated_delivery_at && !isDelivered && (
            <div className="mt-4 inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full text-sm">
              <Clock size={14} />
              <span>
                Est. delivery by{' '}
                {new Date(tracking.estimated_delivery_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-8 space-y-6">

        {/* Timeline */}
        {tracking.status !== 'cancelled' && (
          <div className="bg-white rounded-2xl p-6 shadow-card">
            <h2 className="font-bold text-navy text-sm mb-6">Delivery Progress</h2>
            <div className="space-y-0">
              {TIMELINE.map((step, i) => {
                const done    = i <= currentStep
                const current = i === currentStep
                const Icon    = step.icon
                return (
                  <div key={step.status} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                        done    ? 'bg-primary border-primary text-white' :
                        current ? 'border-primary bg-white text-primary ring-4 ring-primary/20' :
                                  'border-gray-200 bg-white text-gray-300'
                      }`}>
                        <Icon size={16} />
                      </div>
                      {i < TIMELINE.length - 1 && (
                        <div className={`w-0.5 flex-1 min-h-[28px] my-1 transition-colors ${done ? 'bg-primary' : 'bg-gray-100'}`} />
                      )}
                    </div>
                    <div className="pb-6 flex-1 pt-1.5">
                      <p className={`text-sm font-semibold ${done ? 'text-navy' : 'text-gray-300'}`}>
                        {step.label}
                        {current && <span className="ml-2 text-xs text-primary font-normal">Current</span>}
                      </p>
                      {tracking.events.find(e => e.status === step.status) && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(tracking.events.find(e => e.status === step.status)!.created_at)
                            .toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Rider card */}
        {tracking.rider && (isInTransit || isDelivered) && (
          <div className="bg-white rounded-2xl p-5 shadow-card">
            <h2 className="font-bold text-navy text-sm mb-4">Your Delivery Rider</h2>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary-light flex items-center justify-center shrink-0">
                <Truck size={24} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-navy">{tracking.rider.name}</p>
                <p className="text-sm text-gray-400">{tracking.rider.vehicle_type} · {tracking.rider.license_plate ?? 'No plate'}</p>
                {tracking.rider.rating && (
                  <div className="flex items-center gap-1 mt-1">
                    <Star size={12} className="text-amber-400 fill-amber-400" />
                    <span className="text-xs text-gray-500">{tracking.rider.rating.toFixed(1)} rating</span>
                  </div>
                )}
              </div>
              {tracking.rider.phone && (
                <a
                  href={`tel:${tracking.rider.phone}`}
                  className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors"
                >
                  <Phone size={16} />
                </a>
              )}
            </div>
            {isInTransit && tracking.rider.current_lat && (
              <div className="mt-4 flex items-center gap-2 text-sm text-primary font-medium">
                <Navigation size={14} className="animate-pulse" />
                <span>Rider location updating live</span>
              </div>
            )}
          </div>
        )}

        {/* OTP confirmation (shown when out_for_delivery) */}
        {tracking.status === 'out_for_delivery' && !otpSent && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <h3 className="font-bold text-amber-900 text-sm mb-2">Delivery OTP</h3>
            <p className="text-xs text-amber-700 mb-3">
              Share this 4-digit OTP with the rider when they arrive to confirm delivery.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={4}
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setActionError('') }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-amber-300 text-center text-2xl font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <Button variant="primary" onClick={handleConfirmOtp} disabled={otp.length !== 4}>
                Confirm
              </Button>
            </div>
            {actionError && <ErrorBanner message={actionError} onDismiss={() => setActionError('')} className="mt-3" />}
          </div>
        )}

        {/* Rating (after delivered) */}
        {isDelivered && !rated && (
          <div className="bg-white rounded-2xl p-6 shadow-card text-center">
            <h2 className="font-bold text-navy mb-2">How was your delivery?</h2>
            <p className="text-sm text-gray-400 mb-4">Rate your experience with the rider</p>
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onMouseEnter={() => setHoverRating(s)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => { setRating(s); handleRate(s) }}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    size={32}
                    className={s <= (hoverRating || rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && <p className="text-sm text-primary font-medium">Thanks for your feedback!</p>}
          </div>
        )}

        {rated && (
          <div className="bg-green-50 rounded-2xl p-4 text-center">
            <p className="text-green-700 font-semibold text-sm">Thanks for rating your delivery!</p>
          </div>
        )}

        {/* Event log */}
        {tracking.events.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-card">
            <h2 className="font-bold text-navy text-sm mb-4">Event History</h2>
            <div className="space-y-3">
              {[...tracking.events].reverse().map((ev) => (
                <div key={ev.id} className="flex gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <p className="font-medium text-navy capitalize">{ev.status.replace(/_/g, ' ')}</p>
                    {ev.note && <p className="text-gray-400 text-xs">{ev.note}</p>}
                    <p className="text-gray-400 text-xs">
                      {new Date(ev.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Link href="/products">
          <Button variant="ghost" className="w-full">Continue Shopping</Button>
        </Link>
      </div>
    </div>
  )
}
