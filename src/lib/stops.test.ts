import { describe, expect, it } from 'vitest'
import { googleRouteLink, parseGoogleMaps } from './stops'
import type { PlanStop } from '../types'

describe('parseGoogleMaps', () => {
  it('takes the exact place position over the map view', () => {
    const p = parseGoogleMaps('https://www.google.com/maps/place/Pariwana+Hostel+Lima/@-12.12,-77.03,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d-12.1211!4d-77.0297')
    expect(p).toMatchObject({ name: 'Pariwana Hostel Lima', lat: -12.1211, lng: -77.0297 })
  })

  it('uses the first line of an iPhone share as the name and keeps a short link', () => {
    const p = parseGoogleMaps('Parque del Amor\nMalecón Cisneros, Miraflores\nhttps://maps.app.goo.gl/AbCd123')
    expect(p).toEqual({ name: 'Parque del Amor', url: 'https://maps.app.goo.gl/AbCd123' })
  })

  it('reads coordinates from a query link', () => {
    expect(parseGoogleMaps('https://maps.google.com/?q=-13.1631,-72.5450')).toMatchObject({ lat: -13.1631, lng: -72.545 })
  })
})

describe('googleRouteLink', () => {
  const stop = (name: string, extra: Partial<PlanStop> = {}): PlanStop => ({ id: name, tripId: 'main', dayId: 'd', order: 0, kind: 'sight', name, time: '', memo: '', ...extra })

  it('needs two stops', () => {
    expect(googleRouteLink([stop('a')], '리마')).toBeUndefined()
  })

  it('goes through the middle stops as waypoints, by position when known', () => {
    const url = new URL(googleRouteLink([stop('공항'), stop('케네디 공원', { lat: -12.12, lng: -77.03 }), stop('호스텔')], '리마')!)
    expect(url.searchParams.get('origin')).toBe('공항 리마')
    expect(url.searchParams.get('waypoints')).toBe('-12.12,-77.03')
    expect(url.searchParams.get('destination')).toBe('호스텔 리마')
  })
})
