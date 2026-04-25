'use client'

import { useEffect, useRef } from 'react'

interface Rider {
  rider_id: string
  name: string
  lat: number
  lng: number
  is_available: boolean
  active_order_id: string | null
}

interface Props {
  riders: Rider[]
  selectedAddress?: string | null
  onRiderClick?: (activeOrderId: string | null) => void
}

declare global {
  interface Window {
    L: any
    _leafletLoaded?: boolean
  }
}

function loadLeaflet(): Promise<void> {
  if (window._leafletLoaded || window.L) {
    window._leafletLoaded = true
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => { window._leafletLoaded = true; resolve() }
    document.head.appendChild(script)
  })
}

async function geocode(address: string): Promise<[number, number] | null> {
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', Kathmandu, Nepal')}&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    )
    const data = await resp.json()
    if (data[0]) return [parseFloat(data[0].lat), parseFloat(data[0].lon)]
  } catch {}
  return null
}

export default function DeliveryMap({ riders, selectedAddress, onRiderClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<any>(null)
  const markersRef   = useRef<any[]>([])
  const destMarkerRef = useRef<any>(null)

  // Init map once
  useEffect(() => {
    let cancelled = false
    loadLeaflet().then(() => {
      if (cancelled || !containerRef.current || mapRef.current) return
      const L = window.L
      const map = L.map(containerRef.current).setView([27.7, 85.32], 12)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)
      mapRef.current = map
    })
    return () => { cancelled = true }
  }, [])

  // Update rider markers when riders change
  useEffect(() => {
    if (!mapRef.current || !window.L) return
    const L = window.L

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    riders.forEach((rider) => {
      if (!rider.lat || !rider.lng) return
      const color = rider.active_order_id ? '#E07830' : '#4A7FA0'
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:28px;height:28px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2zm0 12c-5.33 0-8 2.67-8 4v2h16v-2c0-1.33-2.67-4-8-4z"/></svg>
        </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })
      const marker = L.marker([rider.lat, rider.lng], { icon })
        .addTo(mapRef.current)
        .bindPopup(`<strong>${rider.name}</strong><br>${rider.active_order_id ? 'On delivery' : 'Available'}`)
      if (onRiderClick) {
        marker.on('click', () => onRiderClick(rider.active_order_id))
      }
      markersRef.current.push(marker)
    })
  }, [riders])

  // Fly to selected delivery address
  useEffect(() => {
    if (!mapRef.current || !window.L) return
    if (!selectedAddress) {
      destMarkerRef.current?.remove()
      destMarkerRef.current = null
      return
    }

    geocode(selectedAddress).then((coords) => {
      if (!coords || !mapRef.current) return
      const L = window.L

      destMarkerRef.current?.remove()
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:32px;height:32px;background:#C8102E;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.3);">
          <div style="transform:rotate(45deg);width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          </div>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [8, 32],
      })
      destMarkerRef.current = L.marker(coords, { icon })
        .addTo(mapRef.current)
        .bindPopup(selectedAddress)
        .openPopup()

      mapRef.current.flyTo(coords, 16, { duration: 1.2 })
    })
  }, [selectedAddress])

  return (
    <div ref={containerRef} className="w-full h-full rounded-2xl overflow-hidden shadow-card" />
  )
}
