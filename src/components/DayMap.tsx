import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { builtinPlace, cityKey } from '../lib/geo'
import { addPin, declutter, maplibregl, openMap, pinElement } from '../lib/mapbase'
import type { Day, PlanStop } from '../types'

/** The day's city with its stops as numbered pins, joined in visiting order. */
export default function DayMap({ day, stops }: { day: Day; stops: PlanStop[] }) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markers = useRef<maplibregl.Marker[]>([])
  const [styleVersion, setStyleVersion] = useState(0)
  const city = day.cities.at(-1) ?? ''
  const saved = useLiveQuery(() => db.places.get(cityKey(city)), [city])
  const cityPlace = saved ?? builtinPlace(city, day.country)
  const placed = stops.map((s, i) => ({ s, n: i + 1 })).filter(({ s }) => s.lat !== undefined && s.lng !== undefined)
  const key = JSON.stringify([placed.map(({ s, n }) => [s.id, n, s.lat, s.lng, s.name, s.kind]), cityPlace?.lat, cityPlace?.lng])

  useEffect(() => {
    if (!box.current) return
    return openMap(box.current, (m) => {
      m.addSource('path', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      m.addLayer({
        id: 'path', type: 'line', source: 'path',
        paint: { 'line-color': '#3b7db5', 'line-width': 3, 'line-dasharray': [1.5, 1.5] },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      })
      map.current = m
      setStyleVersion((v) => v + 1)
    }, cityPlace ? { center: [cityPlace.lng, cityPlace.lat], zoom: 11 } : undefined)
    // The map is made once per day; pins follow below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day.id])

  useEffect(() => {
    const m = map.current
    if (!m || !styleVersion) return
    markers.current.forEach((mk) => mk.remove())
    const coords = placed.map(({ s }) => [s.lng!, s.lat!] as [number, number])
    ;(m.getSource('path') as maplibregl.GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: coords.length > 1 ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } }] : [],
    })
    markers.current = placed.map(({ s, n }) =>
      addPin(m, [s.lng!, s.lat!], pinElement(s.name, s.kind === 'stay' ? 'stay' : 'plan', String(n)), `${n}. ${s.name}`))
    if (!placed.length && cityPlace) {
      markers.current.push(addPin(m, [cityPlace.lng, cityPlace.lat], pinElement(city, 'city')))
    }
    if (coords.length > 1) {
      const b = coords.reduce((acc, c) => acc.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]))
      m.fitBounds(b, { padding: { top: 40, bottom: 30, left: 30, right: 110 }, maxZoom: 15, duration: 0 })
    } else if (coords.length === 1) m.jumpTo({ center: coords[0], zoom: 14 })
    else if (cityPlace) m.jumpTo({ center: [cityPlace.lng, cityPlace.lat], zoom: 11 })
    return declutter(m, () => markers.current.map((mk) => mk.getElement()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, styleVersion])

  return (
    <div className="day-map">
      <div ref={box} className="day-map-box" />
      {!placed.length && <p className="day-map-hint muted">장소를 추가하면 순서대로 핀이 찍혀요.</p>}
    </div>
  )
}
