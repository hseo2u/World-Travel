import Dexie, { type EntityTable } from 'dexie'
import type { Day, Place, Trip } from './types'

// Everything lives on the phone first so the app works offline.
// A sync layer (Supabase) can be added later without changing these tables.
export const db = new Dexie('world-travel') as Dexie & {
  trips: EntityTable<Trip, 'id'>
  days: EntityTable<Day, 'id'>
  places: EntityTable<Place, 'key'>
}

db.version(1).stores({
  trips: 'id',
  days: 'id, tripId, [tripId+order]',
  places: 'key',
})

export const TRIP_ID = 'main'

export async function ensureTrip(): Promise<Trip> {
  const existing = await db.trips.get(TRIP_ID)
  if (existing) return existing
  const trip: Trip = {
    id: TRIP_ID,
    name: '나의 세계여행',
    startDate: '2027-01-12',
    budgetKrw: 15_000_000,
    mode: 'solo',
  }
  await db.trips.put(trip)
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
