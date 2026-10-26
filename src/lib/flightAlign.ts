import type { Day, FlightInfo, Trip } from '../types'
import { dayDate, daysBetween } from './dates'
import { cityKey } from './geo'

export type Alignment =
  | { kind: 'aligned' }
  | { kind: 'shift-start'; newStart: string; delta: number }
  | { kind: 'stretch'; city: string; delta: number; insertAt: number }
  | { kind: 'shrink'; city: string; delta: number; removeIds: string[]; shortBy: number }

/**
 * Works out how to move the plan so the day this flight lands on falls on its arrival date.
 * Day 1 moves the whole trip; any later day grows or shrinks the stay right before the flight.
 */
export function alignFlight(trip: Trip, days: Day[], dayId: string, flight: FlightInfo): Alignment | undefined {
  const sorted = [...days].sort((a, b) => a.order - b.order)
  const day = sorted.find((d) => d.id === dayId)
  if (!day || !flight.arrives) return undefined
  const arrival = flight.arrives.slice(0, 10)
  const planned = dayDate(trip.startDate, day.order)
  const delta = daysBetween(planned, arrival)
  if (delta === 0) return { kind: 'aligned' }
  if (day.order === 0) return { kind: 'shift-start', newStart: dayDate(trip.startDate, delta), delta }

  const city = day.cities[0] ?? sorted[day.order - 1]?.cities.at(-1) ?? ''
  if (delta > 0) return { kind: 'stretch', city, delta, insertAt: day.order }

  // Only plain stay days in the departure city, right before the flight, can go.
  const removable: string[] = []
  for (let i = day.order - 1; i >= 0 && removable.length < -delta; i--) {
    const d = sorted[i]
    if (d.cities.length !== 1 || cityKey(d.cities[0]) !== cityKey(city)) break
    removable.push(d.id)
  }
  return { kind: 'shrink', city, delta, removeIds: removable, shortBy: -delta - removable.length }
}

/** Plan day that matches a flight's cities, for preselecting the link. */
export function matchFlightDay(days: Day[], flight: Pick<FlightInfo, 'from' | 'to'>): Day | undefined {
  const from = cityKey(flight.from)
  const to = cityKey(flight.to)
  if (!to) return undefined
  const isTo = (c: string) => cityKey(c) === to
  const isFrom = (c: string) => cityKey(c) === from
  // A flight from outside the plan (home) into the first city is the trip's way in.
  const fromInPlan = !!from && days.some((d) => d.cities.some(isFrom))
  if (!fromInPlan && days[0] && isTo(days[0].cities[0] ?? '')) return days[0]
  return (
    days.find((d) => d.cities.length > 1 && isTo(d.cities.at(-1)!) && d.cities.some(isFrom)) ??
    days.find((d) => d.cities.length > 1 && isTo(d.cities.at(-1)!))
  )
}
