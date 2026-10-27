import { describe, expect, it } from 'vitest'
import { collectPins, distanceKm, formatKm, formatMinutes, legEstimate } from './places'
import type { Day, Moment, PlanStop, Trip } from '../types'

const trip: Trip = { id: 'main', name: 't', startDate: '2027-01-12', budgetKrw: 0, mode: 'solo' }
const day: Day = { id: 'd1', tripId: 'main', order: 0, country: '페루', cities: ['리마'], content: '', lodging: '', notes: '', buffer: false }
const stop = (id: string, lat?: number, lng?: number): PlanStop => ({ id, tripId: 'main', dayId: 'd1', order: 0, kind: 'sight', name: id, time: '', memo: '', lat, lng })
const moment = (id: string, lat?: number, lng?: number): Moment => ({ id, tripId: 'main', date: '2027-01-12', time: '10:00', place: id, city: '리마', country: '페루', lat, lng, rating: 4, caption: '좋다', photoIds: [] })

describe('collectPins', () => {
  it('keeps only places with a position and links each to its screen', () => {
    const pins = collectPins(trip, [day], [stop('a', -12.1, -77.0), stop('nopos')], [moment('m', -12.2, -77.1), moment('nopos')])
    expect(pins.map((p) => p.id).sort()).toEqual(['a', 'm'])
    expect(pins.find((p) => p.id === 'a')?.href).toBe('/plan/d1/stop/a')
    expect(pins.find((p) => p.id === 'm')?.note).toContain('★4')
  })

  it('shows a planned place that was recorded only once', () => {
    const pins = collectPins(trip, [day], [stop('a', -12.1, -77.0)], [moment('m', -12.1001, -77.0001)])
    expect(pins.map((p) => p.source)).toEqual(['record'])
  })
})

describe('leg estimates', () => {
  it('measures Lima Miraflores to the centre at about 8 km', () => {
    const km = distanceKm({ lat: -12.1211, lng: -77.0297 }, { lat: -12.0464, lng: -77.0428 })
    expect(km).toBeGreaterThan(7.5)
    expect(km).toBeLessThan(9)
  })

  it('walks short hops and rides longer ones', () => {
    expect(legEstimate(1).mode).toBe('walk')
    expect(legEstimate(1).minutes).toBe(17)
    expect(legEstimate(8)).toEqual({ mode: 'ride', minutes: 25 })
  })

  it('formats distances and times', () => {
    expect(formatKm(0.42)).toBe('420m')
    expect(formatKm(3.21)).toBe('3.2km')
    expect(formatMinutes(95)).toBe('1시간 35분')
  })
})
