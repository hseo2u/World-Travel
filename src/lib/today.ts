import { daysBetween } from './dates'
import type { Booking, Day, PlanStop, Trip } from '../types'

export interface TodayInfo {
  day: Day
  /** Tonight's bed: the stay stop if one was planned, and the booking that covers tonight */
  stayStop?: PlanStop
  stayBooking?: Booking
  stops: PlanStop[]
  /** The next day with a move on it (today included), with its booking */
  move?: { day: Day; booking?: Booking }
}

/** What the home screen shows during the trip. Undefined before departure and after the last day. */
export function todayInfo(trip: Trip, days: Day[], bookings: Booking[], stops: PlanStop[], today: string): TodayInfo | undefined {
  const order = daysBetween(trip.startDate, today)
  const day = days.find((d) => d.order === order)
  if (!day) return undefined
  const orderOf = new Map(days.map((d) => [d.id, d.order]))
  const todays = stops.filter((s) => s.dayId === day.id).sort((a, b) => a.order - b.order)
  // A stay booked for several nights covers every night from its first day.
  const stayBooking = bookings.find((b) => {
    if (b.kind !== 'stay' || b.status === 'skipped') return false
    const start = orderOf.get(b.dayId)
    return start !== undefined && order >= start && order < start + (b.nights ?? 1)
  })
  const moveDay = days.find((d) => d.order >= order && d.cities.length > 1)
  const move = moveDay && {
    day: moveDay,
    booking: bookings.find((b) => b.dayId === moveDay.id && b.kind !== 'stay' && b.status !== 'skipped'),
  }
  return { day, stayStop: todays.findLast((s) => s.kind === 'stay'), stayBooking, stops: todays, move }
}
