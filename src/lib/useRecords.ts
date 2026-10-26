import { useLiveQuery } from 'dexie-react-hooks'
import { db, TRIP_ID } from '../db'
import type { PlaceHit } from './nearby'
import type { Moment } from '../types'

export function useMoments(): Moment[] {
  return useLiveQuery(() => db.moments.where('tripId').equals(TRIP_ID).toArray(), [], [] as Moment[])
}

export function newMomentLink(date: string, hit?: PlaceHit): string {
  const q = new URLSearchParams({ date })
  if (hit) {
    q.set('place', hit.name)
    q.set('lat', String(hit.lat))
    q.set('lng', String(hit.lng))
  }
  return `/record/m/new?${q}`
}
