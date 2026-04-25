'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, ChevronRight, MapPin, Package, Tag } from 'lucide-react'
import { Button, Input, ErrorBanner } from '@/components/ui'
import { useCartStore } from '@/lib/cart'
import { useAuthStore } from '@/lib/auth'
import { api } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import type { AddressOut } from '@/types'

type Step = 'address' | 'review' | 'success'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, total, fetchCart, reset } = useCartStore()
  const { user } = useAuthStore()
  const [step, setStep] = useState<Step>('address')
  const [addresses, setAddresses] = useState<AddressOut[]>([])
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null)
  const [discountCode, setDiscountCode] = useState('')
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; discount_amount: number; final_total: number } | null>(null)
  const [applyingCode, setApplyingCode] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')

  // New address form
  const [newAddr, setNewAddr] = useState({ label: 'Home', full_address: '', city: 'Kathmandu', postal_code: '', phone: '' })
  const [showNewAddr, setShowNewAddr] = useState(false)

  useEffect(() => {
    if (!user) { router.push('/login?from=/checkout'); return }
    fetchCart()
    api.get<AddressOut[]>('/account/addresses').then((a) => {
      setAddresses(a)
      const def = a.find((x) => x.is_default)
      if (def) setSelectedAddress(def.id)
    }).catch(() => {})
  }, [user])

  const handleApplyCode = async () => {
    if (!discountCode.trim()) return
    setApplyingCode(true)
    setError('')
    try {
      const res = await api.post<{ valid: boolean; code: string; discount_amount: number; final_total: number }>(
        '/discounts/validate',
        { code: discountCode.trim(), subtotal: total }
      )
      setAppliedDiscount({ code: res.code, discount_amount: res.discount_amount, final_total: res.final_total })
    } catch (e: any) {
      setAppliedDiscount(null)
      setError(e?.message ?? 'Invalid discount code')
    } finally {
      setApplyingCode(false)
    }
  }

  const handleSaveAddress = async () => {
    try {
      const addr = await api.post<AddressOut>('/account/addresses', newAddr)
      setAddresses((prev) => [...prev, addr])
      setSelectedAddress(addr.id)
      setShowNewAddr(false)
    } catch {
      setError('Could not save address')
    }
  }

  const handlePlaceOrder = async () => {
    if (!selectedAddress) { setError('Please select a delivery address'); return }
    setPlacing(true)
    setError('')
    try {
      const res = await api.post<{ id: string }>('/orders', {
        address_id: selectedAddress,
        discount_code: discountCode.trim() || undefined,
      })
      setOrderId(res.id)
      reset()
      setStep('success')
    } catch (e: any) {
      setError(e?.message ?? 'Could not place order')
    } finally {
      setPlacing(false)
    }
  }

  if (step === 'success') {
    return (
      <div className="max-w-lg mx-auto px-5 py-24 text-center">
        <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-navy mb-2">Order Placed!</h1>
        <p className="text-gray-400 mb-2">Thank you for your order.</p>
        <p className="text-sm text-gray-400 mb-8">
          Order ID: <span className="font-mono font-medium text-navy">{orderId}</span>
        </p>
        <div className="flex flex-col gap-3">
          <Link href={`/account/orders/${orderId}`}>
            <Button variant="primary" className="w-full">Track your order</Button>
          </Link>
          <Link href="/products">
            <Button variant="ghost" className="w-full">Continue shopping</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <h1 className="text-2xl font-bold text-navy mb-8">Checkout</h1>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-10">
        {(['address', 'review'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <ChevronRight size={14} className="text-gray-300" />}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              step === s ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'
            }`}>
              {s === 'address' ? <MapPin size={14} /> : <Package size={14} />}
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {step === 'address' && (
            <div>
              <h2 className="font-bold text-navy text-lg mb-4">Delivery Address</h2>
              {addresses.map((addr) => (
                <label key={addr.id} className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer mb-3 transition-colors ${
                  selectedAddress === addr.id ? 'border-primary bg-primary-light' : 'border-gray-200 bg-white'
                }`}>
                  <input
                    type="radio"
                    name="address"
                    value={addr.id}
                    checked={selectedAddress === addr.id}
                    onChange={() => setSelectedAddress(addr.id)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="font-semibold text-navy text-sm">{addr.label}</p>
                    <p className="text-sm text-gray-500">{addr.full_address}, {addr.city}</p>
                    {addr.phone && <p className="text-xs text-gray-400 mt-0.5">{addr.phone}</p>}
                  </div>
                </label>
              ))}

              {showNewAddr ? (
                <div className="bg-white rounded-2xl p-5 border border-gray-200 space-y-3 mt-3">
                  <h3 className="font-semibold text-navy text-sm">New Address</h3>
                  <Input label="Label" value={newAddr.label} onChange={(e) => setNewAddr({ ...newAddr, label: e.target.value })} />
                  <Input label="Full Address" value={newAddr.full_address} onChange={(e) => setNewAddr({ ...newAddr, full_address: e.target.value })} />
                  <Input label="Contact Phone" value={newAddr.phone} onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })} placeholder="+977 98XXXXXXXX" />
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="City" value={newAddr.city} onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })} />
                    <Input label="Postal Code" value={newAddr.postal_code} onChange={(e) => setNewAddr({ ...newAddr, postal_code: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="primary" size="sm" onClick={handleSaveAddress}>Save Address</Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowNewAddr(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowNewAddr(true)} className="w-full mt-3 p-4 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-primary hover:text-primary text-sm font-medium transition-colors">
                  + Add new address
                </button>
              )}

              {error && <ErrorBanner message={error} onDismiss={() => setError('')} className="mt-3" />}

              <Button
                variant="primary"
                className="mt-6"
                onClick={() => setStep('review')}
                disabled={!selectedAddress}
              >
                Continue to Review
              </Button>
            </div>
          )}

          {step === 'review' && (
            <div>
              <h2 className="font-bold text-navy text-lg mb-4">Review Order</h2>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.item_id} className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-card">
                    <div className="w-12 h-12 rounded-lg bg-cream shrink-0 flex items-center justify-center">
                      <Package size={16} className="text-gray-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-navy line-clamp-1">{item.product.name}</p>
                      <p className="text-xs text-gray-400">×{item.quantity}</p>
                    </div>
                    <p className="text-sm font-bold text-navy shrink-0">{formatPrice(item.subtotal)}</p>
                  </div>
                ))}
              </div>

              {/* Discount code */}
              <div className="mt-5 flex gap-2">
                <div className="relative flex-1">
                  <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Discount code"
                    value={discountCode}
                    onChange={(e) => { setDiscountCode(e.target.value.toUpperCase()); setAppliedDiscount(null) }}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <Button variant="secondary" size="sm" onClick={handleApplyCode} loading={applyingCode} disabled={!discountCode.trim()}>
                  Apply
                </Button>
              </div>
              {appliedDiscount && (
                <div className="mt-2 flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-xl">
                  <span>🎉</span>
                  <span>Code <strong>{appliedDiscount.code}</strong> applied — you save {formatPrice(appliedDiscount.discount_amount)}!</span>
                  <button onClick={() => { setAppliedDiscount(null); setDiscountCode('') }} className="ml-auto text-gray-400 hover:text-gray-600 text-xs">✕</button>
                </div>
              )}

              {error && <ErrorBanner message={error} onDismiss={() => setError('')} className="mt-3" />}

              <div className="flex gap-3 mt-6">
                <Button variant="ghost" onClick={() => setStep('address')}>Back</Button>
                <Button variant="primary" onClick={handlePlaceOrder} loading={placing} className="flex-1">
                  Place Order — {formatPrice(appliedDiscount ? appliedDiscount.final_total : total)}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Summary sidebar */}
        <div className="bg-white rounded-2xl p-5 shadow-card h-fit">
          <h3 className="font-bold text-navy mb-4">Summary</h3>
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between">
              <span className="text-gray-500">Items ({items.length})</span>
              <span className="font-medium text-navy">{formatPrice(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Delivery</span>
              <span className="text-green-600 font-medium">Free</span>
            </div>
            {appliedDiscount && (
              <div className="flex justify-between text-green-700">
                <span>Discount ({appliedDiscount.code})</span>
                <span className="font-medium">−{formatPrice(appliedDiscount.discount_amount)}</span>
              </div>
            )}
          </div>
          <div className="border-t border-gray-100 pt-4">
            <div className="flex justify-between font-bold">
              <span className="text-navy">Total</span>
              <span className="text-primary text-lg">
                {formatPrice(appliedDiscount ? appliedDiscount.final_total : total)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
