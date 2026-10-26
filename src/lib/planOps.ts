import { db, newId, renumberDays, TRIP_ID } from '../db'
import type { Alignment } from './flightAlign'

/** Applies a flight alignment to the stored plan. */
export async function applyAlignment(a: Alignment): Promise<void> {
  if (a.kind === 'aligned') return
  if (a.kind === 'shift-start') {
    await db.trips.update(TRIP_ID, { startDate: a.newStart })
    return
  }
  if (a.kind === 'shrink') {
    await db.days.bulkDelete(a.removeIds)
    await renumberDays(TRIP_ID)
    return
  }
  const days = await db.days.where('tripId').equals(TRIP_ID).sortBy('order')
  const before = days[a.insertAt - 1]
  const lodging = before && before.cities.length === 1 && !before.lodging.startsWith('X') ? before.lodging : a.city
  await db.transaction('rw', db.days, async () => {
    for (const d of days) if (d.order >= a.insertAt) await db.days.update(d.id, { order: d.order + a.delta })
    for (let i = 0; i < a.delta; i++) {
      await db.days.add({
        id: newId(), tripId: TRIP_ID, order: a.insertAt + i,
        country: before?.country ?? '', cities: [a.city], content: '', lodging,
        notes: '항공편에 맞춰 추가한 날', buffer: false,
      })
    }
  })
}
