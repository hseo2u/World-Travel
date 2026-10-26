import { newId, TRIP_ID } from '../db'
import { daysBetween } from './dates'
import type { Day, Moment, Photo, Trip } from '../types'

/** The plan's Day for a date, if the date falls inside the trip. */
export function dayForDate(trip: Trip, days: Day[], date: string): Day | undefined {
  const order = daysBetween(trip.startDate, date)
  return days.find((d) => d.order === order)
}

/** Where the plan says the traveller sleeps that day: the last city of the day. */
export function whereOn(trip: Trip, days: Day[], date: string): { city: string; country: string } {
  const day = dayForDate(trip, days, date)
  return { city: day?.cities.at(-1) ?? '', country: day?.country ?? '' }
}

const byTime = (a: Moment, b: Moment) => a.time.localeCompare(b.time)

export interface DayGroup {
  date: string
  day?: Day
  city: string
  country: string
  moments: Moment[]
  photoIds: string[]
  caption: string
}

/** Records gathered per date, newest date first, each day's records in time order. */
export function groupByDay(moments: Moment[], trip: Trip, days: Day[]): DayGroup[] {
  const map = new Map<string, Moment[]>()
  for (const m of moments) map.set(m.date, [...(map.get(m.date) ?? []), m])
  return [...map]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, list]) => {
      const sorted = [...list].sort(byTime)
      const plan = whereOn(trip, days, date)
      const named = sorted.find((m) => m.city)
      return {
        date,
        day: dayForDate(trip, days, date),
        city: named?.city ?? plan.city,
        country: named?.country ?? plan.country,
        moments: sorted,
        photoIds: sorted.flatMap((m) => m.photoIds),
        caption: sorted.find((m) => m.caption)?.caption ?? '',
      }
    })
}

export interface CityGroup {
  city: string
  from: string
  to: string
  photoIds: string[]
  places: number
}

export interface CountryGroup {
  country: string
  cities: CityGroup[]
  photoIds: string[]
}

/** Countries in the order they were first recorded, each split into its cities. */
export function groupByCountry(moments: Moment[]): CountryGroup[] {
  const sorted = [...moments].sort((a, b) => a.date.localeCompare(b.date) || byTime(a, b))
  const countries = new Map<string, Map<string, CityGroup>>()
  for (const m of sorted) {
    const country = m.country || '어딘가'
    const city = m.city || '도시 미정'
    if (!countries.has(country)) countries.set(country, new Map())
    const cities = countries.get(country)!
    const g = cities.get(city) ?? { city, from: m.date, to: m.date, photoIds: [], places: 0 }
    g.to = m.date
    g.photoIds.push(...m.photoIds)
    if (m.place) g.places++
    cities.set(city, g)
  }
  return [...countries].map(([country, cities]) => ({
    country,
    cities: [...cities.values()],
    photoIds: [...cities.values()].flatMap((c) => c.photoIds),
  }))
}

/** Every photo, newest first, with the date it belongs to. */
export function feedPhotos(moments: Moment[]): { photoId: string; date: string }[] {
  return [...moments]
    .sort((a, b) => b.date.localeCompare(a.date) || byTime(b, a))
    .flatMap((m) => m.photoIds.map((photoId) => ({ photoId, date: m.date })))
}

/**
 * Puts photos picked without a place into their day's album, the one record per date that has no place.
 * Returns the records to save.
 */
export function fileIntoAlbums(photos: Photo[], moments: Moment[], where: (date: string) => { city: string; country: string }): Moment[] {
  const touched = new Map<string, Moment>()
  for (const p of photos) {
    const date = p.taken.slice(0, 10)
    const album = touched.get(date) ?? moments.find((m) => m.date === date && !m.place)
    const next: Moment = album
      ? { ...album, photoIds: [...album.photoIds, p.id] }
      : { id: newId(), tripId: TRIP_ID, date, time: p.taken.slice(11, 16), place: '', ...where(date), rating: 0, caption: '', photoIds: [p.id] }
    touched.set(date, next)
  }
  return [...touched.values()]
}
