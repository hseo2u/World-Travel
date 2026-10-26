import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { PlanStop } from '../types'

/** A day's stops in order. */
export function useStops(dayId: string | undefined): PlanStop[] {
  return useLiveQuery(
    () => (dayId ? db.stops.where('dayId').equals(dayId).sortBy('order') : Promise.resolve([] as PlanStop[])),
    [dayId],
    [] as PlanStop[],
  )
}
