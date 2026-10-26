import Dexie, { type EntityTable } from 'dexie'
import type { Booking, Day, Exchange, Expense, PackItem, PayMethod, Place, Rate, Trip } from './types'
import { SEED_TSV } from './platform/seed'
import { parseTsv, rowsToDays } from './lib/importPlan'

// Everything lives on the phone first so the app works offline.
// A sync layer (Supabase) can be added later without changing these tables.
export const db = new Dexie('world-travel') as Dexie & {
  trips: EntityTable<Trip, 'id'>
  days: EntityTable<Day, 'id'>
  places: EntityTable<Place, 'key'>
  bookings: EntityTable<Booking, 'id'>
  expenses: EntityTable<Expense, 'id'>
  payMethods: EntityTable<PayMethod, 'id'>
  exchanges: EntityTable<Exchange, 'id'>
  rates: EntityTable<Rate, 'currency'>
  packItems: EntityTable<PackItem, 'id'>
}

db.version(1).stores({
  trips: 'id',
  days: 'id, tripId, [tripId+order]',
  places: 'key',
})

db.version(2).stores({
  bookings: 'id, tripId, kind, status',
  expenses: 'id, tripId, date',
  payMethods: 'id',
  exchanges: 'id, tripId, date',
  rates: 'currency',
})

db.version(3).stores({
  packItems: 'id, tripId',
})

export const TRIP_ID = 'main'

let ensuring: Promise<Trip> | undefined

/** Creates the single trip on first open. Safe to call from several places at once. */
export function ensureTrip(): Promise<Trip> {
  ensuring ??= createTripOnce()
  return ensuring
}

async function createTripOnce(): Promise<Trip> {
  const existing = await db.trips.get(TRIP_ID)
  if (existing) return existing
  const trip: Trip = {
    id: TRIP_ID,
    name: '나의 세계여행',
    startDate: '2027-01-12',
    budgetKrw: 15_000_000,
    mode: 'solo',
  }
  await db.transaction('rw', db.trips, db.days, async () => {
    await db.trips.put(trip)
    if (SEED_TSV) {
      const { days } = rowsToDays(parseTsv(SEED_TSV))
      await db.days.bulkAdd(days.map((d) => ({ ...d, id: newId(), tripId: TRIP_ID })))
    }
  })
  return trip
}

export function newId(): string {
  return crypto.randomUUID()
}

/** Rewrites `order` so days are numbered 1..n with no gaps. */
export async function renumberDays(tripId: string): Promise<void> {
  const days = await db.days.where('tripId').equals(tripId).sortBy('order')
  await db.transaction('rw', db.days, async () => {
    for (const [i, d] of days.entries()) {
      if (d.order !== i) await db.days.update(d.id, { order: i })
    }
  })
}
