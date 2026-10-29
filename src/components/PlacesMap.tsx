import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { db, TRIP_ID } from '../db'
import { addPin, declutter, maplibregl, openMap, pinElement } from '../lib/mapbase'
import { collectPins, type SavedPin } from '../lib/places'
import { useMoments } from '../lib/useRecords'
import { useTrip } from '../lib/useTrip'
import { locateStops } from '../lib/locate'
import { buildRoute } from '../lib/route'
import { builtinPlace, cityKey } from '../lib/geo'

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
  const [locating, setLocating] = useState('')
  const saved = useLiveQuery(() => db.places.toArray(), [], [])

  const all = useMemo(() => (trip ? collectPins(trip, days, stops, moments) : []), [trip, days, stops, moments])
  const countries = [...new Set(all.map((p) => p.country).filter(Boolean))]
  const shown = all.filter((p) => (only === 'all' || p.source === only) && (!country || p.country === country))
  // Stops saved by name only have no position yet.
  const unplaced = stops.filter((s) => s.lat === undefined && s.name.trim())
  // The plan's cities sit underneath, so the map is never empty and shows the whole route.
  const cityPins = useMemo(() => {
    const byKey = new Map(saved.map((p) => [p.key, p]))
    const seen = new Set<string>()
    return buildRoute(days).stops.flatMap((st) => {
      const p = byKey.get(cityKey(st.city)) ?? builtinPlace(st.city, st.country)
      if (!p || seen.has(p.key) || (country && st.country !== country)) return []
      seen.add(p.key)
      return [{ name: st.city, lat: p.lat, lng: p.lng }]
    })
  }, [days, saved, country])
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
    markers.current = [
      ...ordered.map((p) => addPin(m, [p.lng, p.lat], pinElement(p.name, tone(p)), popup(p, navigate))),
      ...cityPins.map((c) => addPin(m, [c.lng, c.lat], pinElement(c.name, 'city'), c.name)),
    ]
    const fit = shown.length ? shown : cityPins
    if (fit.length) {
      const b = fit.reduce((acc, p) => acc.extend([p.lng, p.lat]), new maplibregl.LngLatBounds([fit[0].lng, fit[0].lat], [fit[0].lng, fit[0].lat]))
      m.fitBounds(b, { padding: { top: 60, bottom: 110, left: 30, right: 110 }, maxZoom: 14, duration: 500 })
    }
    return declutter(m, () => markers.current.map((mk) => mk.getElement()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleVersion, JSON.stringify(shown.map((p) => p.id)), cityPins])

  async function locate() {
    setLocating(`위치 찾는 중… 0/${unplaced.length}`)
    const found = await locateStops(unplaced, days, (n) => setLocating(`위치 찾는 중… ${n}/${unplaced.length}`))
    setLocating(found ? `${found}곳을 지도에 올렸어요.` : '위치를 못 찾았어요. 인터넷을 확인하거나 장소에 구글맵 링크를 붙여넣어 주세요.')
  }

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
      {unplaced.length > 0 && (
        <div className="map-missing">
          이름만 있고 위치가 없는 장소 {unplaced.length}곳은 지도에 못 찍었어요.
          <button className="btn small" disabled={locating.startsWith('위치 찾는')} onClick={locate}>위치 찾기</button>
        </div>
      )}
      {locating && <div className="map-missing" role="status">{locating}</div>}
      {all.length === 0 && unplaced.length === 0 && (
        <div className="map-missing">
          아직 위치가 있는 장소가 없어서 계획한 도시만 보여요. 계획의 Day에 장소를 넣으면 여기에 모여요.
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
