'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Star, Bike, Phone, Mail, Circle, MapPin, CheckCircle, XCircle, Clock, FileText, ExternalLink } from 'lucide-react'
import { Badge, Button, ErrorBanner } from '@/components/ui'
import { Skeleton } from '@/components/ui'
import { api } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import type { RiderOut } from '@/types'

interface RiderDelivery {
  id: string; order_id: string; customer_name: string
  delivery_address: string; order_status: string
  rating: number | null; completed_at: string | null
}

const STATUS_VARIANTS: Record<string, any> = {
  delivered: 'success', cancelled: 'danger', out_for_delivery: 'info',
  shipped: 'info', packed: 'warning', confirmed: 'info', pending: 'warning',
}

const DOC_LABELS: Record<string, string> = {
  license: 'Driving License', national_id: 'National ID', selfie: 'Selfie with ID', other: 'Other Document',
}

export default function RiderDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()
  const [rider, setRider]             = useState<any | null>(null)
  const [deliveries, setDeliveries]   = useState<RiderDelivery[]>([])
  const [loading, setLoading]         = useState(true)
  const [verifying, setVerifying]     = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject]   = useState(false)
  const [verifyError, setVerifyError] = useState('')

  const load = () =>
    Promise.all([
      api.get<any>(`/admin/riders/${id}`),
      api.get<RiderDelivery[]>(`/admin/riders/${id}/deliveries`),
    ]).then(([r, d]) => { setRider(r); setDeliveries(d) })
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [id])

  const verify = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && !rejectReason.trim()) {
      setVerifyError('Please provide a reason for rejection.'); return
    }
    setVerifying(true); setVerifyError('')
    try {
      await api.patch(`/admin/riders/${id}/verify`, {
        action,
        reason: action === 'reject' ? rejectReason : undefined,
      })
      setShowReject(false); setRejectReason('')
      await load()
    } catch (e: any) {
      setVerifyError(e?.message ?? 'Failed to verify rider')
    } finally { setVerifying(false) }
  }

  if (loading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-48 rounded" />
      <div className="bg-white rounded-2xl shadow-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div className="space-y-2"><Skeleton className="h-5 w-40 rounded" /><Skeleton className="h-4 w-32 rounded" /></div>
        </div>
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-4 w-full rounded mb-2" />)}
      </div>
    </div>
  )
  if (!rider) return <div className="p-6 text-center text-gray-400 py-16">Rider not found</div>

  const vs = rider.verification_status ?? 'pending'
  const docs = rider.documents ?? []

  return (
    <div className="p-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-400 hover:text-navy transition-colors mb-4">
        <ArrowLeft size={14} /> Back to Riders
      </button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-1 space-y-4">
          {/* Profile card */}
          <div className="bg-white rounded-2xl shadow-card p-6">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center text-2xl font-bold text-primary">
                {rider.name[0]}
              </div>
              <div>
                <p className="font-bold text-navy text-lg">{rider.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Circle size={8} className={`${rider.is_active && rider.is_available ? 'text-green-500 fill-green-500' : 'text-gray-300 fill-gray-300'}`} />
                  <span className="text-sm text-gray-500">{!rider.is_active ? 'Inactive' : rider.is_available ? 'Available' : 'Busy'}</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-gray-600"><Mail size={14} className="text-gray-400 shrink-0" /><span className="truncate">{rider.email}</span></div>
              {rider.phone && <div className="flex items-center gap-3 text-sm text-gray-600"><Phone size={14} className="text-gray-400 shrink-0" /><a href={`tel:${rider.phone}`} className="hover:text-primary">{rider.phone}</a></div>}
              <div className="flex items-center gap-3 text-sm text-gray-600"><Bike size={14} className="text-gray-400 shrink-0" /><span className="capitalize">{rider.vehicle_type}</span>{rider.license_plate && <span className="text-gray-400">· {rider.license_plate}</span>}</div>
            </div>
          </div>

          {/* Verification panel */}
          <div className="bg-white rounded-2xl shadow-card p-5">
            <h3 className="font-bold text-navy mb-3">Verification</h3>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-4 ${
              vs === 'approved' ? 'bg-green-50 text-green-700' :
              vs === 'rejected' ? 'bg-red-light text-red' : 'bg-amber-50 text-amber-700'
            }`}>
              {vs === 'approved' && <CheckCircle size={15} />}
              {vs === 'pending'  && <Clock size={15} />}
              {vs === 'rejected' && <XCircle size={15} />}
              <span className="text-sm font-semibold capitalize">{vs}</span>
            </div>
            {vs === 'rejected' && rider.rejection_reason && (
              <p className="text-xs text-red/80 mb-3 bg-red-light/50 px-3 py-2 rounded-lg">
                Reason: {rider.rejection_reason}
              </p>
            )}
            {verifyError && <ErrorBanner message={verifyError} onDismiss={() => setVerifyError('')} className="mb-3" />}
            {vs !== 'approved' && (
              <Button variant="primary" size="sm" className="w-full mb-2" onClick={() => verify('approve')} loading={verifying && !showReject}>
                <CheckCircle size={14} /> Approve Rider
              </Button>
            )}
            {vs !== 'rejected' && !showReject && (
              <Button variant="ghost" size="sm" className="w-full text-red hover:bg-red-light" onClick={() => setShowReject(true)}>
                <XCircle size={14} /> Reject
              </Button>
            )}
            {showReject && (
              <div className="mt-2 space-y-2">
                <textarea
                  placeholder="Reason for rejection (required)…"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red/30 resize-none"
                />
                <div className="flex gap-2">
                  <Button variant="danger" size="sm" className="flex-1" onClick={() => verify('reject')} loading={verifying}>
                    Confirm Reject
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setShowReject(false); setRejectReason('') }}>Cancel</Button>
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="bg-white rounded-2xl shadow-card p-5">
            <h3 className="font-bold text-navy mb-4">Performance</h3>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-sm text-gray-500">Total Deliveries</span><span className="font-bold text-navy">{rider.total_deliveries}</span></div>
              <div className="flex justify-between"><span className="text-sm text-gray-500">Average Rating</span>
                <div className="flex items-center gap-1">
                  <Star size={13} className="text-amber-400 fill-amber-400" />
                  <span className="font-bold text-navy">{rider.rating ? rider.rating.toFixed(1) : '—'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Documents */}
          <div className="bg-white rounded-2xl shadow-card p-5">
            <h2 className="font-bold text-navy mb-4">Submitted Documents</h2>
            {docs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No documents uploaded yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {docs.map((doc: any) => (
                  <a key={doc.type} href={doc.url} target="_blank" rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2 p-4 border border-gray-100 rounded-xl hover:border-primary hover:bg-primary-light/30 transition-colors group">
                    <FileText size={28} className="text-gray-300 group-hover:text-primary transition-colors" />
                    <p className="text-xs font-semibold text-navy text-center">{DOC_LABELS[doc.type] ?? doc.type}</p>
                    <p className="text-[10px] text-gray-400">{new Date(doc.uploaded_at).toLocaleDateString()}</p>
                    <div className="flex items-center gap-1 text-[10px] text-primary font-medium">
                      View <ExternalLink size={9} />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Delivery history */}
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-navy">Delivery History</h2>
            </div>
            {deliveries.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">No deliveries recorded yet</div>
            ) : (
              <table className="w-full">
                <thead><tr className="border-b border-gray-50">
                  {['Order', 'Customer', 'Address', 'Status', 'Rating', 'Date'].map(h => (
                    <th key={h} className="text-left text-xs font-bold uppercase tracking-wide text-gray-400 px-5 py-3">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {deliveries.map((d) => (
                    <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-5 py-3 font-mono text-xs text-navy font-bold">#{d.order_id.slice(-8).toUpperCase()}</td>
                      <td className="px-5 py-3 text-sm text-navy">{d.customer_name}</td>
                      <td className="px-5 py-3"><div className="flex items-start gap-1 text-xs text-gray-400 max-w-[140px]"><MapPin size={10} className="shrink-0 mt-0.5" /><span className="truncate">{d.delivery_address}</span></div></td>
                      <td className="px-5 py-3"><Badge variant={STATUS_VARIANTS[d.order_status] ?? 'default'}>{d.order_status}</Badge></td>
                      <td className="px-5 py-3">{d.rating ? <div className="flex items-center gap-1"><Star size={12} className="text-amber-400 fill-amber-400" /><span className="text-sm font-medium text-navy">{d.rating}</span></div> : <span className="text-xs text-gray-300">—</span>}</td>
                      <td className="px-5 py-3 text-xs text-gray-400">{d.completed_at ? new Date(d.completed_at).toLocaleDateString() : '—'}</td>
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
