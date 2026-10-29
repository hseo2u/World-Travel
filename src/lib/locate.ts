import { db } from '../db'
import { searchPlaces } from './nearby'
import type { Day, PlanStop } from '../types'

/**
 * Finds a position for a stop that was saved by name only, so it can go on the
 * maps. Returns true when one was found and stored.
 */
export async function locateStop(stop: PlanStop, day: Day | undefined): Promise<boolean> {
  if (stop.lat !== undefined || !stop.name.trim()) return false
  const hit = (await searchPlaces(stop.name.trim(), day?.cities.at(-1) ?? '', day?.country ?? ''))[0]
  if (!hit) return false
  await db.stops.update(stop.id, { lat: hit.lat, lng: hit.lng })
  return true
}

/** One at a time, a little over a second apart, as OpenStreetMap asks. */
export async function locateStops(stops: PlanStop[], days: Day[], onEach?: (done: number) => void): Promise<number> {
  const dayOf = new Map(days.map((d) => [d.id, d]))
  let found = 0
  for (let i = 0; i < stops.length; i++) {
    try {
      if (await locateStop(stops[i], dayOf.get(stops[i].dayId))) found++
    } catch {
      // Offline or blocked: the rest will be tried next time.
      break
    }
    onEach?.(i + 1)
    if (i < stops.length - 1) await new Promise((r) => setTimeout(r, 1100))
  }
  return found
}
