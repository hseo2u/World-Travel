import { useEffect, useMemo, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import mapWorkerUrl from '../platform/mapWorker'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { useTrip } from '../lib/useTrip'
import { buildRoute, TRANSPORT_LABEL, type Leg, type Stop } from '../lib/route'
import { builtinPlace, cityKey, continentOf, geocode } from '../lib/geo'
import type { Place, Transport } from '../types'

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

maplibregl.setWorkerUrl(mapWorkerUrl)

const OFFLINE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#dfe9ee' } }],
}

type Scale = 'continent' | 'country' | 'city'

const MODE_COLOR: Record<Transport, string> = {
  flight: '#7c3aed',
  train: '#059669',
  bus: '#2563eb',
  'night-bus': '#1e3a8a',
  ferry: '#0891b2',
  'night-ferry': '#155e75',
  tour: '#d97706',
  unknown: '#6b7280',
}

export default function MapPage() {
  const { days } = useTrip()
  const saved = useLiveQuery(() => db.places.toArray(), [])
  const { stops, legs } = useMemo(() => buildRoute(days), [days])
  const [scale, setScale] = useState<Scale>('continent')
  const [pick, setPick] = useState('')
  const [geocoding, setGeocoding] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markers = useRef<maplibregl.Marker[]>([])
  const [styleVersion, setStyleVersion] = useState(0)

  const placeOf = useMemo(() => {
    const byKey = new Map((saved ?? []).map((p) => [p.key, p]))
    return (s: Stop): Place | undefined => byKey.get(cityKey(s.city)) ?? builtinPlace(s.city, s.country)
  }, [saved])

  const continents = unique(stops.map((s) => continentOf(s.country) ?? '기타'))
  const countries = unique(stops.map((s) => s.country).filter(Boolean))
  const cities = unique(stops.map((s) => s.city))
  const options = scale === 'continent' ? continents : scale === 'country' ? countries : cities
  const current = options.includes(pick) ? pick : options[0] ?? ''

  const inScope = (s: Stop) =>
    scale === 'continent' ? (continentOf(s.country) ?? '기타') === current
      : scale === 'country' ? s.country === current
        : s.city === current
  const visibleStops = stops.filter(inScope)
  const visibleLegs = legs.filter((l) => (scale === 'city' ? inScope(l.from) || inScope(l.to) : inScope(l.from) && inScope(l.to)))
  const missing = unique(stops.filter((s) => !placeOf(s)).map((s) => `${s.city}|${s.country}`))

  useEffect(() => {
    if (!box.current) return
    const m = new maplibregl.Map({ container: box.current, style: STYLE_URL, center: [-40, -10], zoom: 1.5 })
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    const addLayers = () => {
      if (m.getSource('legs')) return
      m.addSource('legs', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      m.addLayer({
        id: 'legs', type: 'line', source: 'legs', filter: ['!=', ['get', 'mode'], 'flight'],
        paint: { 'line-color': ['get', 'color'], 'line-width': 3, 'line-opacity': 0.85 },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      })
      m.addLayer({
        id: 'legs-flight', type: 'line', source: 'legs', filter: ['==', ['get', 'mode'], 'flight'],
        paint: { 'line-color': ['get', 'color'], 'line-width': 3, 'line-dasharray': [2, 2] },
      })
      setStyleVersion((v) => v + 1)
    }
    m.on('style.load', addLayers)
    // With no network and no cached tiles, fall back to a plain background so the route still shows.
    const fallback = setTimeout(() => {
      if (!m.isStyleLoaded()) m.setStyle(OFFLINE_STYLE)
    }, 6000)
    m.on('error', () => {
      if (!m.isStyleLoaded()) {
        clearTimeout(fallback)
        m.setStyle(OFFLINE_STYLE)
      }
    })
    map.current = m
    return () => {
      clearTimeout(fallback)
      m.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    const m = map.current
    if (!m || !styleVersion) return
    const features = visibleLegs.flatMap((l: Leg) => {
      const a = placeOf(l.from)
      const b = placeOf(l.to)
      if (!a || !b) return []
      return [{
        type: 'Feature' as const,
        properties: { mode: l.transport, color: MODE_COLOR[l.transport] },
        geometry: { type: 'LineString' as const, coordinates: [[a.lng, a.lat], [b.lng, b.lat]] },
      }]
    })
    ;(m.getSource('legs') as maplibregl.GeoJSONSource).setData({ type: 'FeatureCollection', features })

    markers.current.forEach((mk) => mk.remove())
    const seen = new Set<string>()
    const bounds = new maplibregl.LngLatBounds()
    markers.current = []
    for (const s of visibleStops) {
      const p = placeOf(s)
      if (!p) continue
      bounds.extend([p.lng, p.lat])
      if (seen.has(p.key)) continue
      seen.add(p.key)
      const nights = stops.filter((o) => cityKey(o.city) === p.key).reduce((n, o) => n + o.dayOrders.length, 0)
      // On the continent view names would pile up, so cities are dots that show their name on tap.
      const dot = scale === 'continent'
      const el = document.createElement('div')
      el.className = dot ? 'map-dot' : 'map-pin'
      if (!dot) el.textContent = s.city
      const marker = new maplibregl.Marker({ element: el, anchor: dot ? 'center' : 'bottom' })
        .setLngLat([p.lng, p.lat])
        .setPopup(new maplibregl.Popup({ offset: 12, closeButton: false }).setText(`${s.city} · ${nights}일`))
        .addTo(m)
      markers.current.push(marker)
    }
    if (!bounds.isEmpty()) {
      if (scale === 'city') m.flyTo({ center: bounds.getCenter(), zoom: 11 })
      else m.fitBounds(bounds, { padding: { top: 110, bottom: 96, left: 40, right: 40 }, maxZoom: 9, duration: 600 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleVersion, scale, current, days, saved])

  async function geocodeMissing() {
    setGeocoding(true)
    for (const entry of missing) {
      const [city, country] = entry.split('|')
      try {
        await geocode(city, country)
      } catch {
        // Offline or blocked: leave it for the next try.
      }
      await new Promise((r) => setTimeout(r, 1100))
    }
    setGeocoding(false)
  }

  return (
    <div className="map-page">
      <div className="map-controls">
        <div className="chips">
          {(['continent', 'country', 'city'] as Scale[]).map((s) => (
            <button key={s} className={s === scale ? 'chip active' : 'chip'} onClick={() => { setScale(s); setPick('') }}>
              {s === 'continent' ? '대륙' : s === 'country' ? '나라' : '도시'}
            </button>
          ))}
        </div>
        <select value={current} onChange={(e) => setPick(e.target.value)}>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div ref={box} className="map-box" />
      <div className="map-legend">
        {(['flight', 'train', 'bus', 'night-bus', 'ferry'] as Transport[]).map((t) => (
          <span key={t}><i style={{ background: MODE_COLOR[t] }} />{TRANSPORT_LABEL[t]}</span>
        ))}
      </div>
      {missing.length > 0 && (
        <div className="map-missing">
          위치를 모르는 도시 {missing.length}곳: {missing.map((m) => m.split('|')[0]).join(', ')}
          <button className="btn small" disabled={geocoding} onClick={geocodeMissing}>
            {geocoding ? '찾는 중…' : '위치 찾기'}
          </button>
        </div>
      )}
    </div>
  )
}

function unique<T>(xs: T[]): T[] {
  return [...new Set(xs)]
}
