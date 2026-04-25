'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle, Clock, XCircle, Upload, FileText, User, Camera, Car } from 'lucide-react'
import { Button, Input, ErrorBanner } from '@/components/ui'
import { api } from '@/lib/api'

interface RiderProfile {
  verification_status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
  documents: { type: string; url: string; uploaded_at: string }[]
  vehicle_type: string
  license_plate: string | null
  full_name: string
  email: string
  phone: string | null
}

const DOC_CONFIGS = [
  { type: 'license',     label: 'Driving License',  icon: FileText, desc: 'Front side of your driving license' },
  { type: 'national_id', label: 'National ID',       icon: User,     desc: 'Citizenship certificate or passport' },
  { type: 'selfie',      label: 'Selfie with ID',    icon: Camera,   desc: 'Clear photo of you holding your ID' },
]

const VEHICLE_TYPES = ['motorcycle', 'bicycle', 'car', 'van']

export default function RiderSettingsPage() {
  const [profile, setProfile]     = useState<RiderProfile | null>(null)
  const [loading, setLoading]     = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [vehicle, setVehicle]     = useState({ vehicle_type: 'motorcycle', license_plate: '' })
  const [savingVehicle, setSavingVehicle] = useState(false)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const load = () =>
    api.get<RiderProfile>('/rider/settings/profile')
      .then(p => { setProfile(p); setVehicle({ vehicle_type: p.vehicle_type, license_plate: p.license_plate ?? '' }) })
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const handleUpload = async (docType: string, file: File) => {
    setUploading(docType)
    setUploadError('')
    try {
      const form = new FormData()
      form.append('file', file)
      await api.upload(`/rider/settings/documents?doc_type=${docType}`, form)
      await load()
    } catch (e: any) {
      setUploadError(e?.message ?? 'Upload failed')
    } finally {
      setUploading(null)
    }
  }

  const saveVehicle = async () => {
    setSavingVehicle(true)
    try {
      await api.patch('/rider/settings/profile', vehicle)
      await load()
    } finally { setSavingVehicle(false) }
  }

  if (loading) return (
    <div className="p-6 space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-6 shadow-card animate-pulse h-24" />
      ))}
    </div>
  )

  const status = profile?.verification_status ?? 'pending'
  const docs   = profile?.documents ?? []
  const getDoc = (type: string) => docs.find(d => d.type === type)

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-navy mb-6">Settings & Verification</h1>

      {/* Verification status banner */}
      <div className={`rounded-2xl p-4 mb-6 flex items-start gap-3 ${
        status === 'approved' ? 'bg-green-50 border border-green-200' :
        status === 'rejected' ? 'bg-red-light border border-red/20' :
        'bg-amber-50 border border-amber-200'
      }`}>
        {status === 'approved' && <CheckCircle size={20} className="text-green-600 shrink-0 mt-0.5" />}
        {status === 'pending'  && <Clock       size={20} className="text-amber-600 shrink-0 mt-0.5" />}
        {status === 'rejected' && <XCircle     size={20} className="text-red shrink-0 mt-0.5" />}
        <div>
          <p className={`font-bold text-sm ${
            status === 'approved' ? 'text-green-800' :
            status === 'rejected' ? 'text-red' : 'text-amber-800'
          }`}>
            {status === 'approved' && 'Verification Approved — you can accept deliveries'}
            {status === 'pending'  && 'Verification Pending — upload your documents below'}
            {status === 'rejected' && 'Verification Rejected — please re-upload your documents'}
          </p>
          {status === 'rejected' && profile?.rejection_reason && (
            <p className="text-sm text-red/80 mt-1">Reason: {profile.rejection_reason}</p>
          )}
          {status === 'pending' && (
            <p className="text-xs text-amber-700 mt-1">An admin will review your documents shortly.</p>
          )}
        </div>
      </div>

      {/* Document upload cards */}
      <div className="bg-white rounded-2xl shadow-card p-6 mb-6">
        <h2 className="font-bold text-navy mb-4">Verification Documents</h2>
        {uploadError && <ErrorBanner message={uploadError} onDismiss={() => setUploadError('')} className="mb-4" />}
        <div className="space-y-4">
          {DOC_CONFIGS.map(({ type, label, icon: Icon, desc }) => {
            const doc = getDoc(type)
            const isUploading = uploading === type
            return (
              <div key={type} className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-colors ${
                doc ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'
              }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  doc ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <Icon size={18} className={doc ? 'text-green-600' : 'text-gray-400'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-navy text-sm">{label}</p>
                  <p className="text-xs text-gray-400">{doc ? `Uploaded ${new Date(doc.uploaded_at).toLocaleDateString()}` : desc}</p>
                </div>
                <div className="shrink-0">
                  {doc ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-green-500" />
                      <button
                        onClick={() => fileRefs.current[type]?.click()}
                        className="text-xs text-gray-400 hover:text-primary transition-colors"
                      >
                        Replace
                      </button>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => fileRefs.current[type]?.click()}
                      loading={isUploading}
                    >
                      <Upload size={13} /> Upload
                    </Button>
                  )}
                  <input
                    ref={el => { fileRefs.current[type] = el }}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) handleUpload(type, f)
                      e.target.value = ''
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Vehicle info */}
      <div className="bg-white rounded-2xl shadow-card p-6">
        <h2 className="font-bold text-navy mb-4 flex items-center gap-2"><Car size={16} /> Vehicle Info</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Vehicle Type</label>
            <select
              value={vehicle.vehicle_type}
              onChange={e => setVehicle({ ...vehicle, vehicle_type: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {VEHICLE_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
          </div>
          <Input
            label="License Plate"
            value={vehicle.license_plate}
            onChange={e => setVehicle({ ...vehicle, license_plate: e.target.value })}
            placeholder="BA 1 KA 1234"
          />
        </div>
        <Button variant="primary" size="sm" className="mt-4" onClick={saveVehicle} loading={savingVehicle}>
          Save Vehicle Info
        </Button>
      </div>
    </div>
  )
}
