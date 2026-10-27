import { describe, expect, it } from 'vitest'
import { todayInfo } from './today'
import type { Booking, Day, PlanStop, Trip } from '../types'

const trip: Trip = { id: 'main', name: 't', startDate: '2027-01-12', budgetKrw: 0, mode: 'solo' }
const day = (order: number, cities: string[]): Day => ({ id: `d${order}`, tripId: 'main', order, country: '페루', cities, content: '', lodging: '', notes: '', buffer: false })
const days = [day(0, ['리마']), day(1, ['리마']), day(2, ['리마', '와라즈']), day(3, ['와라즈'])]
const booking = (p: Partial<Booking>): Booking => ({ id: 'b', tripId: 'main', kind: 'stay', title: '', status: 'booked', dayId: 'd0', bookedVia: '', confirmation: '', memo: '', ...p })
const stop = (id: string, dayId: string, order: number, kind: PlanStop['kind']): PlanStop => ({ id, tripId: 'main', dayId, order, kind, name: id, time: '', memo: '' })

describe('todayInfo', () => {
  it('is empty before departure', () => {
    expect(todayInfo(trip, days, [], [], '2027-01-11')).toBeUndefined()
  })

  it('finds the stay booked for several nights and the next move', () => {
    const stay = booking({ id: 'hostel', nights: 2 })
    const bus = booking({ id: 'bus', kind: 'transport', dayId: 'd2' })
    const info = todayInfo(trip, days, [stay, bus], [stop('b', 'd1', 1, 'sight'), stop('a', 'd1', 0, 'stay')], '2027-01-13')!
    expect(info.day.id).toBe('d1')
    expect(info.stayBooking?.id).toBe('hostel')
    expect(info.stayStop?.id).toBe('a')
    expect(info.stops.map((s) => s.id)).toEqual(['a', 'b'])
    expect(info.move?.day.id).toBe('d2')
    expect(info.move?.booking?.id).toBe('bus')
  })

  it('stops counting a stay after its last night', () => {
    expect(todayInfo(trip, days, [booking({ nights: 2 })], [], '2027-01-14')!.stayBooking).toBeUndefined()
  })
})
