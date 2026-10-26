import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { db, ensureTrip, TRIP_ID } from '../db'

export function useTrip() {
  useEffect(() => {
    void ensureTrip()
  }, [])
  const trip = useLiveQuery(() => db.trips.get(TRIP_ID), [])
  const days = useLiveQuery(() => db.days.where('tripId').equals(TRIP_ID).sortBy('order'), [])
  return { trip, days: days ?? [], loading: trip === undefined || days === undefined }
}
