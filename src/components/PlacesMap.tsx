import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { db, TRIP_ID } from '../db'
import { addPin, declutter, maplibregl, openMap, pinElement } from '../lib/mapbase'
import { collectPins, type SavedPin } from '../lib/places'
import { useMoments } from '../lib/useRecords'
import { useTrip } from '../lib/useTrip'

type Only = 'all' | 'record' | 'plan'

/** Every place with a position, from the plan and the records, like saved places in Google Maps. */
export default function PlacesMap({ tabs, only: initial = 'all' }: { tabs: ReactNode; only?: Only }) {
  const navigate = useNavigate()
  const { trip, days } = useTrip()
  const stops = useLiveQuery(() => db.stops.where('tripId').equals(TRIP_ID).toArray(), [], [])
  const moments = useMoments()
  const [only, setOnly] = useState<Only>(initial)
  const [country, setCountry] = useState('')
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markers = useRef<maplibregl.Marker[]>([])
  const [styleVersion, setStyleVersion] = useState(0)

  const all = useMemo(() => (trip ? collectPins(trip, days, stops, moments) : []), [trip, days, stops, moments])
  const countries = [...new Set(all.map((p) => p.country).filter(Boolean))]
  const shown = all.filter((p) => (only === 'all' || p.source === only) && (!country || p.country === country))
  const counts = { record: all.filter((p) => p.source === 'record').length, plan: all.filter((p) => p.source === 'plan').length }

  useEffect(() => {
    if (!box.current) return
    return openMap(box.current, (m) => {
      map.current = m
      setStyleVersion((v) => v + 1)
    })
  }, [])

  useEffect(() => {
    const m = map.current
    if (!m || !styleVersion) return
    markers.current.forEach((mk) => mk.remove())
    // Records first so their names win over planned places when they collide.
    const ordered = [...shown].sort((a, b) => (a.source === b.source ? 0 : a.source === 'record' ? -1 : 1))
    markers.current = ordered.map((p) => addPin(m, [p.lng, p.lat], pinElement(p.name, tone(p)), popup(p, navigate)))
    if (shown.length) {
      const b = shown.reduce((acc, p) => acc.extend([p.lng, p.lat]), new maplibregl.LngLatBounds([shown[0].lng, shown[0].lat], [shown[0].lng, shown[0].lat]))
      m.fitBounds(b, { padding: { top: 60, bottom: 110, left: 30, right: 110 }, maxZoom: 14, duration: 500 })
    }
    return declutter(m, () => markers.current.map((mk) => mk.getElement()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleVersion, JSON.stringify(shown.map((p) => p.id))])

  return (
    <div className="map-page">
      <div className="map-controls">
        {tabs}
        <div className="chips">
          <button className={only === 'all' ? 'chip active' : 'chip'} onClick={() => setOnly('all')}>전체 {all.length}</button>
          <button className={only === 'record' ? 'chip active' : 'chip'} onClick={() => setOnly('record')}>다녀온 곳 {counts.record}</button>
          <button className={only === 'plan' ? 'chip active' : 'chip'} onClick={() => setOnly('plan')}>갈 곳 {counts.plan}</button>
        </div>
        {countries.length > 1 && (
          <select value={country} onChange={(e) => setCountry(e.target.value)} aria-label="나라">
            <option value="">모든 나라</option>
            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>
      <div ref={box} className="map-box" />
      <div className="map-legend">
        <span><i className="dot record" />다녀온 곳</span>
        <span><i className="dot plan" />갈 곳</span>
        <span><i className="dot stay" />숙소</span>
      </div>
      {all.length === 0 && (
        <div className="map-missing">
          아직 위치가 있는 장소가 없어요. 계획의 Day에 장소를 넣거나 기록에서 장소를 고르면 여기에 모여요.
        </div>
      )}
    </div>
  )
}

function tone(p: SavedPin) {
  if (p.source === 'record') return 'record' as const
  return p.kind === 'stay' ? ('stay' as const) : ('plan' as const)
}

function popup(p: SavedPin, navigate: (to: string) => void): HTMLElement {
  const el = document.createElement('div')
  el.className = 'pin-pop'
  const name = document.createElement('strong')
  name.textContent = p.name
  const note = document.createElement('div')
  note.textContent = [p.city, p.note].filter(Boolean).join(' · ')
  const open = document.createElement('button')
  open.className = 'btn small'
  open.textContent = p.source === 'record' ? '기록 보기' : '일정 보기'
  open.onclick = () => navigate(p.href)
  el.append(name, note, open)
  return el
}
