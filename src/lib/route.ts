import type { Day, Transport } from '../types'

export interface Stop {
  city: string
  country: string
  /** Day orders spent in or passing through this city on this visit */
  dayOrders: number[]
}

export interface Leg {
  from: Stop
  to: Stop
  transport: Transport
  dayOrder: number
}

/**
 * Walks the days in order and returns each visit to a city once,
 * plus the legs between consecutive visits.
 */
export function buildRoute(days: Day[]): { stops: Stop[]; legs: Leg[] } {
  const stops: Stop[] = []
  const legs: Leg[] = []
  const sorted = [...days].sort((a, b) => a.order - b.order)

  for (const day of sorted) {
    for (const city of day.cities) {
      const last = stops.at(-1)
      if (last && last.city === city) {
        if (!last.dayOrders.includes(day.order)) last.dayOrders.push(day.order)
        continue
      }
      const stop: Stop = { city, country: day.country, dayOrders: [day.order] }
      if (last) legs.push({ from: last, to: stop, transport: day.transport ?? 'unknown', dayOrder: day.order })
      stops.push(stop)
    }
  }
  return { stops, legs }
}

export const TRANSPORT_LABEL: Record<Transport, string> = {
  flight: '비행기',
  train: '기차',
  bus: '버스',
  'night-bus': '야간버스',
  ferry: '페리',
  'night-ferry': '야간페리',
  tour: '투어',
  unknown: '이동',
}

export const TRANSPORT_ICON: Record<Transport, string> = {
  flight: '✈️',
  train: '🚆',
  bus: '🚌',
  'night-bus': '🌙🚌',
  ferry: '⛴️',
  'night-ferry': '🌙⛴️',
  tour: '🚙',
  unknown: '➡️',
}
