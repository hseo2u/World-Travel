import { dayDate, formatShort } from './dates'
import { STOP_KIND_LABEL } from './stops'
import type { Day, Moment, PlanStop, StopKind, Trip } from '../types'

/** One pin on the "my places" map: a planned stop or a record, wherever it has a position. */
export interface SavedPin {
  id: string
  source: 'plan' | 'record'
  kind?: StopKind
  name: string
  lat: number
  lng: number
  /** YYYY-MM-DD */
  date: string
  city: string
  country: string
  /** Second line in the popup, e.g. "Day 3 · 볼거리" or "★4 · 하늘이 땅에…" */
  note: string
  /** In-app link (without the #) */
  href: string
}

export function collectPins(trip: Trip, days: Day[], stops: PlanStop[], moments: Moment[]): SavedPin[] {
  const dayOf = new Map(days.map((d) => [d.id, d]))
  const plan: SavedPin[] = stops.flatMap((s) => {
    const day = dayOf.get(s.dayId)
    if (s.lat === undefined || s.lng === undefined || !day) return []
    return [{
      id: s.id, source: 'plan', kind: s.kind, name: s.name, lat: s.lat, lng: s.lng,
      date: dayDate(trip.startDate, day.order), city: day.cities.at(-1) ?? '', country: day.country,
      note: `Day ${day.order + 1} · ${formatShort(dayDate(trip.startDate, day.order))} · ${STOP_KIND_LABEL[s.kind]}`,
      href: `/plan/${day.id}/stop/${s.id}`,
    }]
  })
  const records: SavedPin[] = moments.flatMap((m) => {
    if (m.lat === undefined || m.lng === undefined || !m.place) return []
    const stars = m.rating ? `★${m.rating} · ` : ''
    return [{
      id: m.id, source: 'record', name: m.place, lat: m.lat, lng: m.lng,
      date: m.date, city: m.city, country: m.country,
      note: `${formatShort(m.date)} · ${stars}${m.caption.slice(0, 30) || '기록'}`,
      href: `/record/m/${m.id}`,
    }]
  })
  // A place that was planned and then recorded shows once, as the record.
  const recorded = records.map((r) => [r.lat, r.lng] as const)
  const planOnly = plan.filter((p) => !recorded.some(([lat, lng]) => Math.abs(lat - p.lat) < 0.0005 && Math.abs(lng - p.lng) < 0.0005))
  return [...records, ...planOnly].sort((a, b) => a.date.localeCompare(b.date))
}

/** Straight-line distance in km. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

/**
 * A rough guess at the time between two stops. Streets wind, so the straight line
 * is stretched by 1.3. Under 2 km is a walk (4.5 km/h); beyond that a taxi or bus
 * in city traffic (25 km/h), or a road trip (60 km/h) past 40 km.
 */
export function legEstimate(km: number): { mode: 'walk' | 'ride'; minutes: number } {
  const road = km * 1.3
  if (km < 2) return { mode: 'walk', minutes: Math.max(1, Math.round((road / 4.5) * 60)) }
  const speed = km > 40 ? 60 : 25
  return { mode: 'ride', minutes: Math.round((road / speed) * 60) }
}

export function formatKm(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km < 10 ? km.toFixed(1) : Math.round(km)}km`
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min}분`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}시간 ${m}분` : `${h}시간`
}
