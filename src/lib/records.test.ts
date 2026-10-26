import { describe, expect, it } from 'vitest'
import { feedPhotos, fileIntoAlbums, groupByCountry, groupByDay, whereOn } from './records'
import type { Day, Moment, Photo, Trip } from '../types'

const trip: Trip = { id: 'main', name: 't', startDate: '2027-01-12', budgetKrw: 0, mode: 'solo' }
const day = (order: number, country: string, cities: string[]): Day => ({ id: String(order), tripId: 'main', order, country, cities, content: '', lodging: '', notes: '', buffer: false })
const days = [day(0, '페루', ['리마']), day(1, '페루', ['리마', '이카']), day(2, '볼리비아', ['라파스'])]
const m = (id: string, date: string, time: string, extra: Partial<Moment> = {}): Moment => ({
  id, tripId: 'main', date, time, place: id, city: '', country: '', rating: 0, caption: '', photoIds: [], ...extra,
})

describe('records', () => {
  it('takes the city a day ends in from the plan', () => {
    expect(whereOn(trip, days, '2027-01-13')).toEqual({ city: '이카', country: '페루' })
    expect(whereOn(trip, days, '2026-12-01')).toEqual({ city: '', country: '' })
  })

  it('groups by day newest first, in time order inside a day', () => {
    const groups = groupByDay([m('a', '2027-01-12', '18:00'), m('b', '2027-01-13', '09:00'), m('c', '2027-01-12', '08:00', { caption: '첫날' })], trip, days)
    expect(groups.map((g) => g.date)).toEqual(['2027-01-13', '2027-01-12'])
    expect(groups[1].moments.map((x) => x.id)).toEqual(['c', 'a'])
    expect(groups[1].caption).toBe('첫날')
    expect(groups[0].city).toBe('이카')
  })

  it('groups by country then city in visit order', () => {
    const groups = groupByCountry([
      m('a', '2027-01-14', '10:00', { country: '볼리비아', city: '라파스', photoIds: ['p3'] }),
      m('b', '2027-01-12', '10:00', { country: '페루', city: '리마', photoIds: ['p1'] }),
      m('c', '2027-01-13', '10:00', { country: '페루', city: '이카', photoIds: ['p2'], place: '' }),
    ])
    expect(groups.map((g) => [g.country, g.cities.map((c) => c.city)])).toEqual([['페루', ['리마', '이카']], ['볼리비아', ['라파스']]])
    expect(groups[0].cities[1].places).toBe(0)
  })

  it('lists feed photos newest first', () => {
    const feed = feedPhotos([m('a', '2027-01-12', '10:00', { photoIds: ['p1', 'p2'] }), m('b', '2027-01-13', '10:00', { photoIds: ['p3'] })])
    expect(feed.map((f) => f.photoId)).toEqual(['p3', 'p1', 'p2'])
  })

  it('files placeless photos into one album per date, reusing an existing album', () => {
    const photo = (id: string, taken: string) => ({ id, taken } as Photo)
    const existing = m('album', '2027-01-12', '07:00', { place: '', photoIds: ['old'] })
    const saved = fileIntoAlbums([photo('p1', '2027-01-12T10:00'), photo('p2', '2027-01-13T11:00'), photo('p3', '2027-01-12T12:00')], [existing], (d) => whereOn(trip, days, d))
    expect(saved).toHaveLength(2)
    expect(saved.find((s) => s.id === 'album')!.photoIds).toEqual(['old', 'p1', 'p3'])
    expect(saved.find((s) => s.date === '2027-01-13')).toMatchObject({ city: '이카', country: '페루', time: '11:00', photoIds: ['p2'] })
  })
})
