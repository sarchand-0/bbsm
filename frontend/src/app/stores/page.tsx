'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { MapPin, Phone, Clock, Search, Navigation, Loader2, NavigationOff } from 'lucide-react'
import { Navbar } from '@/components/store/Navbar'
import { Footer } from '@/components/store/Footer'
import { CartDrawer } from '@/components/store/CartDrawer'

const STORES = [
  { id: '1',  name: 'New Road',        address: 'New Road, Kathmandu',         lat: 27.7042, lng: 85.3120, phone: '+977-1-4220000', hours: '7am – 9pm' },
  { id: '2',  name: 'Maharajgunj',     address: 'Maharajgunj, Kathmandu',      lat: 27.7315, lng: 85.3300, phone: '+977-1-4008000', hours: '7am – 9pm' },
  { id: '3',  name: 'Thamel',          address: 'Thamel, Kathmandu',           lat: 27.7153, lng: 85.3123, phone: '+977-1-4700000', hours: '7am – 9pm' },
  { id: '4',  name: 'Lalitpur',        address: 'Kupondole, Lalitpur',         lat: 27.6870, lng: 85.3144, phone: '+977-1-5540000', hours: '7am – 9pm' },
  { id: '5',  name: 'Bhaktapur',       address: 'Suryabinayak, Bhaktapur',    lat: 27.6710, lng: 85.4298, phone: '+977-1-6610000', hours: '7am – 9pm' },
  { id: '6',  name: 'Pokhara',         address: 'Lakeside, Pokhara',          lat: 28.2096, lng: 83.9856, phone: '+977-61-530000', hours: '7am – 9pm' },
  { id: '7',  name: 'Butwal',          address: 'Traffic Chowk, Butwal',       lat: 27.7000, lng: 83.4600, phone: '+977-71-540000', hours: '7am – 9pm' },
  { id: '8',  name: 'Biratnagar',      address: 'Main Road, Biratnagar',       lat: 26.4525, lng: 87.2718, phone: '+977-21-530000', hours: '7am – 9pm' },
  { id: '9',  name: 'Birgunj',         address: 'Adarshanagar, Birgunj',       lat: 27.0121, lng: 84.8772, phone: '+977-51-520000', hours: '7am – 9pm' },
  { id: '10', name: 'Dharan',          address: 'BP Chowk, Dharan',            lat: 26.8120, lng: 87.2836, phone: '+977-25-520000', hours: '7am – 9pm' },
]

// Default Nepal center — used when user is far away (> 500 km from nearest store)
const NEPAL_CENTER = { lat: 28.0, lng: 84.1 }
const NEPAL_ZOOM   = 7
const FAR_THRESHOLD_KM = 500

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDist(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}

type GeoStatus = 'idle' | 'loading' | 'granted' | 'denied'

export default function StoresPage() {
  const mapRef      = useRef<HTMLDivElement>(null)
  const leafletRef  = useRef<any>(null)   // L instance
  const mapObjRef   = useRef<any>(null)   // map instance
  const markersRef  = useRef<Record<string, any>>({})
  const userMarker  = useRef<any>(null)

  const [selected,   setSelected]   = useState<string | null>(null)
  const [query,      setQuery]      = useState('')
  const [geoStatus,  setGeoStatus]  = useState<GeoStatus>('idle')
  const [userPos,    setUserPos]    = useState<{ lat: number; lng: number } | null>(null)

  // Enrich stores with distance when we have user position
  const enriched = STORES.map(s => ({
    ...s,
    distKm: userPos ? haversineKm(userPos.lat, userPos.lng, s.lat, s.lng) : null,
  }))

  const sorted = [...enriched].sort((a, b) => {
    if (a.distKm === null || b.distKm === null) return 0
    return a.distKm - b.distKm
  })

  const filtered = sorted.filter(s =>
    s.name.toLowerCase().includes(query.toLowerCase()) ||
    s.address.toLowerCase().includes(query.toLowerCase())
  )

  const nearestId = sorted[0]?.id ?? null

  // ── Load Leaflet from CDN and init map ──────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return

    const L = (window as any).L
    if (L) { initMap(L); return }

    // Load CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id  = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => initMap((window as any).L)
    document.head.appendChild(script)
  }, [])

  const initMap = useCallback((L: any) => {
    if (!mapRef.current || mapObjRef.current) return
    leafletRef.current = L

    const map = L.map(mapRef.current, { zoomControl: true }).setView(
      [NEPAL_CENTER.lat, NEPAL_CENTER.lng],
      NEPAL_ZOOM
    )

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)

    mapObjRef.current = map

    // Add store markers
    STORES.forEach(store => {
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:28px;height:28px;border-radius:50% 50% 50% 0;
          background:#E07830;border:3px solid #fff;
          box-shadow:0 2px 8px rgba(0,0,0,0.25);
          transform:rotate(-45deg);
        "></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      })

      const marker = L.marker([store.lat, store.lng], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:Sora,sans-serif;min-width:160px">
            <p style="font-weight:700;color:#1A2D40;margin:0 0 4px">${store.name}</p>
            <p style="color:#6b7280;font-size:12px;margin:0 0 4px">${store.address}</p>
            <p style="color:#6b7280;font-size:12px;margin:0">${store.hours}</p>
          </div>
        `)

      marker.on('click', () => {
        setSelected(store.id)
        scrollToStore(store.id)
      })

      markersRef.current[store.id] = marker
    })
  }, [])

  // ── Fly map to selected store and highlight marker ──────────────────────────
  useEffect(() => {
    if (!mapObjRef.current || !selected) return
    const store = STORES.find(s => s.id === selected)
    if (!store) return
    mapObjRef.current.flyTo([store.lat, store.lng], 14, { duration: 1 })
    markersRef.current[selected]?.openPopup()
  }, [selected])

  // ── Update markers + user dot when geo changes ──────────────────────────────
  useEffect(() => {
    const L = leafletRef.current
    const map = mapObjRef.current
    if (!L || !map || !userPos) return

    // Remove old user marker
    if (userMarker.current) { userMarker.current.remove(); userMarker.current = null }

    const userIcon = L.divIcon({
      className: '',
      html: `<div style="
        width:18px;height:18px;border-radius:50%;
        background:#3B82F6;border:3px solid #fff;
        box-shadow:0 0 0 6px rgba(59,130,246,0.2);
      "></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    })

    userMarker.current = L.marker([userPos.lat, userPos.lng], { icon: userIcon })
      .addTo(map)
      .bindPopup('<p style="font-family:Sora,sans-serif;font-weight:700;color:#1A2D40;margin:0">You are here</p>')

    // If user is not too far, center on nearest store; otherwise stay on Nepal view
    const nearest = sorted[0]
    if (nearest && nearest.distKm !== null && nearest.distKm < FAR_THRESHOLD_KM) {
      map.flyTo([nearest.lat, nearest.lng], 12, { duration: 1.5 })
      setSelected(nearest.id)
    }
  }, [userPos])

  // ── Geolocation ─────────────────────────────────────────────────────────────
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) { setGeoStatus('denied'); return }
    setGeoStatus('loading')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGeoStatus('granted')
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => setGeoStatus('denied'),
      { timeout: 8000 }
    )
  }, [])

  // Auto-request on mount (silent — don't show browser prompt automatically,
  // let the user click the button, but check if already granted)
  useEffect(() => {
    navigator.permissions?.query({ name: 'geolocation' }).then(result => {
      if (result.state === 'granted') requestLocation()
    }).catch(() => {})
  }, [requestLocation])

  const scrollToStore = (id: string) => {
    document.getElementById(`store-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  return (
    <>
      <Navbar />
      <CartDrawer />

      <div className="max-w-7xl mx-auto px-5 py-10">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Find Us</p>
            <h1 className="text-3xl font-bold text-navy">Our Stores</h1>
            <p className="text-gray-400 mt-1">{STORES.length} stores across Nepal</p>
          </div>

          {/* Location button */}
          <button
            onClick={requestLocation}
            disabled={geoStatus === 'loading'}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 ${
              geoStatus === 'granted'
                ? 'border-green-200 bg-green-50 text-green-700'
                : geoStatus === 'denied'
                ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                : 'border-primary/30 bg-primary-light text-primary hover:bg-primary/10'
            }`}
          >
            {geoStatus === 'loading' ? (
              <><Loader2 size={15} className="animate-spin" /> Locating…</>
            ) : geoStatus === 'granted' ? (
              <><Navigation size={15} className="fill-green-500" /> Location active</>
            ) : geoStatus === 'denied' ? (
              <><NavigationOff size={15} /> Location blocked</>
            ) : (
              <><Navigation size={15} /> Use my location</>
            )}
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 items-start">
          {/* Store list */}
          <div className="lg:col-span-1 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                placeholder="Search stores…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {userPos && geoStatus === 'granted' && (
              <p className="text-xs text-gray-400 px-1">
                Sorted by distance from your location
              </p>
            )}

            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1 scroll-smooth">
              {filtered.map((store, idx) => {
                const isNearest = geoStatus === 'granted' && store.id === nearestId && idx === 0
                const isSelected = selected === store.id
                return (
                  <button
                    key={store.id}
                    id={`store-${store.id}`}
                    onClick={() => setSelected(store.id)}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                      isSelected
                        ? 'border-primary bg-primary-light shadow-md'
                        : 'border-gray-200 bg-white hover:border-primary/40 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-primary text-white' : 'bg-cream text-primary'
                      }`}>
                        <MapPin size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-navy text-sm">{store.name}</p>
                          {isNearest && (
                            <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                              Nearest
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{store.address}</p>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock size={10} /> {store.hours}
                          </span>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Phone size={10} /> {store.phone}
                          </span>
                          {store.distKm !== null && (
                            <span className={`text-xs font-semibold ${
                              store.distKm < 5 ? 'text-green-600' :
                              store.distKm < 20 ? 'text-primary' : 'text-gray-400'
                            }`}>
                              {formatDist(store.distKm)} away
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
              {filtered.length === 0 && (
                <p className="text-center py-8 text-sm text-gray-400">No stores match your search</p>
              )}
            </div>
          </div>

          {/* Map */}
          <div className="lg:col-span-2 sticky top-24">
            <div ref={mapRef} className="h-[560px] rounded-2xl overflow-hidden shadow-card bg-cream" />

            {/* Selected store quick info */}
            {selected && (() => {
              const store = STORES.find(s => s.id === selected)!
              const dist  = userPos ? haversineKm(userPos.lat, userPos.lng, store.lat, store.lng) : null
              return (
                <div className="mt-3 bg-white rounded-2xl shadow-card p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
                      <MapPin size={16} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-navy text-sm">{store.name}</p>
                      <p className="text-xs text-gray-400 truncate">{store.address}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {dist !== null && (
                      <span className="text-sm font-bold text-primary">{formatDist(dist)}</span>
                    )}
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-white bg-primary px-3 py-1.5 rounded-lg hover:bg-primary-dark transition-colors whitespace-nowrap"
                    >
                      Get Directions
                    </a>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}
