export type TravelMode = 'solo' | 'companion'

export type Transport = 'flight' | 'train' | 'bus' | 'night-bus' | 'ferry' | 'night-ferry' | 'tour' | 'unknown'

export interface Trip {
  id: string
  name: string
  /** Day 1 date, YYYY-MM-DD */
  startDate: string
  budgetKrw: number
  mode: TravelMode
}

export interface Day {
  id: string
  tripId: string
  /** 0-based position; Day number = order + 1 */
  order: number
  country: string
  /** Cities passed through this day, in order. One entry = staying in that city. */
  cities: string[]
  content: string
  lodging: string
  notes: string
  /** How the day's move happens, when the day moves between cities */
  transport?: Transport
  /** A spare day kept for weather or delays */
  buffer: boolean
}

export interface Place {
  /** Normalized city key (see cityKey) */
  key: string
  name: string
  country: string
  lat: number
  lng: number
  source: 'builtin' | 'geocoded' | 'manual'
}
