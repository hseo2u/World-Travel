export type TravelMode = 'solo' | 'companion'

export type Transport = 'flight' | 'train' | 'bus' | 'night-bus' | 'ferry' | 'night-ferry' | 'tour' | 'unknown'

export interface Trip {
  id: string
  name: string
  /** Day 1 date, YYYY-MM-DD */
  startDate: string
  budgetKrw: number
  mode: TravelMode
  /** The starter packing list was added once; deleting items never brings it back. */
  packSeeded?: boolean
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

export type BookingKind = 'stay' | 'flight' | 'transport' | 'activity'
export type BookingStatus = 'needed' | 'booked' | 'skipped'

export interface Booking {
  id: string
  tripId: string
  kind: BookingKind
  title: string
  status: BookingStatus
  /** The plan day the booking starts on */
  dayId: string
  /** Nights, for stays */
  nights?: number
  /** Where it was booked: Hostelworld, Booking.com, airline site... */
  bookedVia: string
  confirmation: string
  /** Book by this date (YYYY-MM-DD) or get a reminder */
  dueDate?: string
  price?: number
  currency?: string
  memo: string
  /** Set when the item was generated from the plan; identifies it across plan edits */
  planKey?: string
  /** Flights only */
  flight?: FlightInfo
}

export interface FlightInfo {
  flightNo: string
  from: string
  to: string
  /** Local departure date and time, YYYY-MM-DDTHH:mm */
  departs: string
  /** Local arrival date and time, YYYY-MM-DDTHH:mm */
  arrives: string
}

export type ExpenseCategory = 'flight' | 'transport' | 'stay' | 'food' | 'activity' | 'admission' | 'shopping' | 'supplies' | 'essentials' | 'etc'
export type PayKind = 'card' | 'cash'

export interface PayMethod {
  id: string
  name: string
  kind: PayKind
  /** Cash wallets hold one currency */
  currency?: string
}

export interface Expense {
  id: string
  tripId: string
  /** YYYY-MM-DD */
  date: string
  amount: number
  currency: string
  /** Amount in KRW at the rate used when it was entered */
  krw: number
  category: ExpenseCategory
  payMethodId: string
  memo: string
  bookingId?: string
}

/** Cash exchanged from one currency to another, e.g. USD 200 → PEN 742 */
export interface Exchange {
  id: string
  tripId: string
  date: string
  fromCurrency: string
  fromAmount: number
  toCurrency: string
  toAmount: number
  place: string
}

/** How many KRW one unit of the currency is worth */
export interface Rate {
  currency: string
  krwPerUnit: number
  updated: string
}

export interface PackItem {
  id: string
  tripId: string
  group: string
  name: string
  done: boolean
  /** Added during the trip, so buying it is a supplies expense */
  onTrip: boolean
  created: string
}

/** A photo or PDF of an important document, kept on the phone for offline use. */
export interface DocFile {
  id: string
  title: string
  blob: Blob
  mime: string
  created: string
}

/** Small free-form records, such as the safety card or notes per country. */
export interface KeyValue {
  key: string
  value: Record<string, string>
}
