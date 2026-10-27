import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { db, newId, TRIP_ID } from '../db'
import type { Day, Trip } from '../types'
import { plannedBookings, syncBookings } from './bookings'

export function useBookings() {
  return useLiveQuery(() => db.bookings.where('tripId').equals(TRIP_ID).toArray(), []) ?? []
}

export function useMoney() {
  const expenses = useLiveQuery(() => db.expenses.where('tripId').equals(TRIP_ID).reverse().sortBy('date'), []) ?? []
  const methods = useLiveQuery(() => db.payMethods.toArray(), []) ?? []
  const exchanges = useLiveQuery(() => db.exchanges.where('tripId').equals(TRIP_ID).reverse().sortBy('date'), []) ?? []
  const rates = useLiveQuery(() => db.rates.toArray(), []) ?? []
  const counts = useLiveQuery(() => db.cashCounts.where('tripId').equals(TRIP_ID).toArray(), []) ?? []
  return { expenses, methods, exchanges, rates, counts }
}

let syncing: Promise<void> | undefined

/** Keeps the booking list in step with the plan: new stays and moves appear, removed ones go. */
export function useBookingSync(trip: Trip | undefined, days: Day[]) {
  const signature = days.map((d) => `${d.id}:${d.order}:${d.lodging}:${d.cities.join('>')}:${d.transport ?? ''}:${d.content}`).join('|')
  useEffect(() => {
    if (!trip || !days.length) return
    const run = async () => {
      const stored = await db.bookings.where('tripId').equals(TRIP_ID).toArray()
      const { add, update, remove } = syncBookings(plannedBookings(trip, days), stored)
      if (!add.length && !update.length && !remove.length) return
      await db.transaction('rw', db.bookings, async () => {
        await db.bookings.bulkDelete(remove)
        for (const u of update) await db.bookings.update(u.id, u.patch)
        await db.bookings.bulkAdd(add.map((p) => ({
          ...p, id: newId(), tripId: TRIP_ID, status: 'needed' as const, bookedVia: '', confirmation: '', memo: '',
        })))
      })
    }
    syncing = (syncing ?? Promise.resolve()).then(run, run)
    // signature captures every field the planner reads
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.startDate, signature])
}
