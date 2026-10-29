import type { Booking, BookingKind, Day, Trip } from '../types'
import { dayDate } from './dates'
import { TRANSPORT_LABEL } from './route'

export const KIND_LABEL: Record<BookingKind, string> = {
  stay: '숙소',
  flight: '항공편',
  transport: '교통편',
  activity: '액티비티',
}

export const KIND_ICON: Record<BookingKind, string> = {
  stay: '🛏️',
  flight: '✈️',
  transport: '🚆',
  activity: '🎟️',
}

/** Days before the booking's first day to be reminded, by kind */
const LEAD_DAYS: Record<BookingKind, number> = { flight: 45, transport: 21, stay: 14, activity: 10 }

const ACTIVITY = /투어|트레킹|마추픽추|스카이다이빙|와이너리|디즈니|입장|축제|쾨켄호프|알함브라/

export type PlannedBooking = Pick<Booking, 'kind' | 'title' | 'dayId' | 'nights' | 'planKey' | 'dueDate'>

/** Lodging text that is not a bookable bed: night buses, ferries, tours that include the night. */
function isBed(lodging: string): boolean {
  const l = lodging.trim()
  return !!l && !l.startsWith('X') && !/투어|아마존/.test(l)
}

/** Reads the plan and lists what needs booking: each stay, each long move, each tour-like activity. */
export function plannedBookings(trip: Trip, days: Day[]): PlannedBooking[] {
  const sorted = [...days].sort((a, b) => a.order - b.order)
  const out: PlannedBooking[] = []
  const seen = new Map<string, number>()
  const key = (base: string) => {
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    return `${base}#${n}`
  }
  const due = (kind: BookingKind, order: number) => {
    const d = new Date(`${dayDate(trip.startDate, order)}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() - LEAD_DAYS[kind])
    return d.toISOString().slice(0, 10)
  }

  for (let i = 0; i < sorted.length; i++) {
    const day = sorted[i]
    const lodging = day.lodging.trim()
    const prev = sorted[i - 1]
    if (isBed(lodging) && !(prev && prev.lodging.trim() === lodging)) {
      let nights = 1
      while (sorted[i + nights] && sorted[i + nights].lodging.trim() === lodging) nights++
      out.push({ kind: 'stay', title: `${lodging} 숙소`, dayId: day.id, nights, planKey: key(`stay:${lodging}`), dueDate: due('stay', day.order) })
    }

    if (day.cities.length > 1 && day.transport && day.transport !== 'unknown' && day.transport !== 'tour') {
      const kind: BookingKind = day.transport === 'flight' ? 'flight' : 'transport'
      const route = `${day.cities[0]} → ${day.cities.at(-1)}`
      out.push({ kind, title: `${route} ${TRANSPORT_LABEL[day.transport]}`, dayId: day.id, planKey: key(`move:${route}`), dueDate: due(kind, day.order) })
    }

    const text = day.content.split('\n')[0].trim()
    if (!day.buffer && ACTIVITY.test(day.content)) {
      out.push({ kind: 'activity', title: text, dayId: day.id, planKey: key(`act:${text}`), dueDate: due('activity', day.order) })
    }
  }
  return out
}

export interface SyncResult {
  add: PlannedBooking[]
  update: { id: string; patch: Partial<Booking> }[]
  /** Untouched "needed" items whose plan entry is gone */
  remove: string[]
}

/** Matches planned items to stored ones by planKey so plan edits keep what was already booked. */
export function syncBookings(planned: PlannedBooking[], stored: Booking[]): SyncResult {
  const byKey = new Map(stored.filter((b) => b.planKey).map((b) => [b.planKey!, b]))
  const keys = new Set(planned.map((p) => p.planKey))
  const result: SyncResult = { add: [], update: [], remove: [] }
  for (const p of planned) {
    const b = byKey.get(p.planKey!)
    if (!b) result.add.push(p)
    else if (b.dayId !== p.dayId || b.nights !== p.nights) {
      result.update.push({ id: b.id, patch: { dayId: p.dayId, nights: p.nights } })
    }
  }
  for (const b of stored) {
    if (b.planKey && !keys.has(b.planKey) && b.status === 'needed') result.remove.push(b.id)
  }
  return result
}

export interface Coverage {
  kind: BookingKind
  done: number
  total: number
}

export const KIND_ORDER: BookingKind[] = ['transport', 'flight', 'stay', 'activity']

/** Every kind, even empty ones. For stays the count is nights, so 3 of 42 nights booked reads correctly. */
export function coverage(bookings: Booking[]): Coverage[] {
  return KIND_ORDER.map((kind) => {
    const items = bookings.filter((b) => b.kind === kind && b.status !== 'skipped')
    const weight = (b: Booking) => (kind === 'stay' ? b.nights ?? 1 : 1)
    return {
      kind,
      done: items.filter((b) => b.status === 'booked').reduce((n, b) => n + weight(b), 0),
      total: items.reduce((n, b) => n + weight(b), 0),
    }
  })
}

/** Not yet booked and due within `withinDays` (overdue first). */
export function dueSoon(bookings: Booking[], today: string, withinDays = 14): Booking[] {
  const limit = new Date(`${today}T00:00:00Z`)
  limit.setUTCDate(limit.getUTCDate() + withinDays)
  const lim = limit.toISOString().slice(0, 10)
  return bookings
    .filter((b) => b.status === 'needed' && b.dueDate && b.dueDate <= lim)
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))
}
