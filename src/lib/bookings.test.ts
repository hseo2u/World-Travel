import { describe, expect, it } from 'vitest'
import type { Booking, Day, Trip } from '../types'
import { coverage, dueSoon, plannedBookings, syncBookings } from './bookings'
import { alignFlight, matchFlightDay } from './flightAlign'
import { cashBalances, rateFromExchange, summarize } from './money'

const trip: Trip = { id: 'main', name: 't', startDate: '2027-01-12', budgetKrw: 15_000_000, mode: 'solo' }

function day(order: number, cities: string[], lodging: string, extra: Partial<Day> = {}): Day {
  return { id: `d${order}`, tripId: 'main', order, country: '페루', cities, content: '', lodging, notes: '', buffer: false, ...extra }
}

const days: Day[] = [
  day(0, ['리마'], '리마'),
  day(1, ['리마', '와라즈'], 'X (야간버스)', { transport: 'night-bus' }),
  day(2, ['와라즈'], '와라즈'),
  day(3, ['와라즈'], '와라즈', { content: '파론 호수 트레킹' }),
  day(4, ['와라즈', '리마'], '리마', { transport: 'flight' }),
  day(5, ['리마'], '리마', { content: '마추픽추 (날씨 버퍼)', buffer: true }),
]

describe('plannedBookings', () => {
  const planned = plannedBookings(trip, days)

  it('makes one stay per run of the same lodging, skipping night buses', () => {
    const stays = planned.filter((p) => p.kind === 'stay')
    expect(stays.map((s) => [s.title, s.nights])).toEqual([['리마 숙소', 1], ['와라즈 숙소', 2], ['리마 숙소', 2]])
    expect(new Set(stays.map((s) => s.planKey)).size).toBe(3)
  })

  it('lists moves and tour-like activities but not buffer days', () => {
    expect(planned.filter((p) => p.kind === 'transport').map((p) => p.title)).toEqual(['리마 → 와라즈 야간버스'])
    expect(planned.filter((p) => p.kind === 'flight')).toHaveLength(1)
    expect(planned.filter((p) => p.kind === 'activity').map((p) => p.title)).toEqual(['파론 호수 트레킹'])
  })

  it('sets the reminder ahead of the day', () => {
    expect(planned.find((p) => p.kind === 'flight')!.dueDate).toBe('2026-12-02')
  })
})

describe('syncBookings', () => {
  const planned = plannedBookings(trip, days)
  const base = { tripId: 'main', bookedVia: '', confirmation: '', memo: '' }
  const stored: Booking[] = [
    { ...base, id: 'b1', kind: 'stay', title: '와라즈 숙소', status: 'booked', dayId: 'd9', nights: 2, planKey: 'stay:와라즈#0' },
    { ...base, id: 'b2', kind: 'activity', title: 'old', status: 'needed', dayId: 'd1', planKey: 'act:없어진 투어#0' },
    { ...base, id: 'b3', kind: 'stay', title: 'gone but booked', status: 'booked', dayId: 'd1', planKey: 'stay:없음#0' },
  ]
  const r = syncBookings(planned, stored)

  it('keeps booked items and moves them with the plan', () => {
    expect(r.update).toEqual([{ id: 'b1', patch: { dayId: 'd2', nights: 2 } }])
  })

  it('drops only unbooked items whose plan entry is gone', () => {
    expect(r.remove).toEqual(['b2'])
    expect(r.add).toHaveLength(planned.length - 1)
  })
})

describe('coverage and dueSoon', () => {
  const base = { tripId: 'main', bookedVia: '', confirmation: '', memo: '', dayId: 'd0' }
  const items: Booking[] = [
    { ...base, id: '1', kind: 'stay', title: 'a', status: 'booked', nights: 3, dueDate: '2026-11-01' },
    { ...base, id: '2', kind: 'stay', title: 'b', status: 'needed', nights: 2, dueDate: '2026-10-20' },
    { ...base, id: '3', kind: 'stay', title: 'c', status: 'skipped', nights: 5 },
    { ...base, id: '4', kind: 'flight', title: 'd', status: 'needed', dueDate: '2026-12-30' },
  ]
  it('counts stay nights, ignoring skipped', () => {
    expect(coverage(items)).toEqual([{ kind: 'stay', done: 3, total: 5 }, { kind: 'flight', done: 0, total: 1 }])
  })
  it('lists overdue and upcoming unbooked items', () => {
    expect(dueSoon(items, '2026-10-26').map((b) => b.id)).toEqual(['2'])
  })
})

describe('alignFlight', () => {
  const flight = { flightNo: 'LA1', from: '와라즈', to: '리마', departs: '2027-01-17T09:00', arrives: '2027-01-17T10:00' }

  it('finds the plan day for the flight', () => {
    expect(matchFlightDay(days, flight)?.id).toBe('d4')
    expect(matchFlightDay(days, { from: '인천', to: '리마' })?.id).toBe('d0')
  })

  it('stretches the stay before a later flight', () => {
    expect(alignFlight(trip, days, 'd4', flight)).toEqual({ kind: 'stretch', city: '와라즈', delta: 1, insertAt: 4 })
  })

  it('shrinks the stay before an earlier flight and reports what it cannot remove', () => {
    const a = alignFlight(trip, days, 'd4', { ...flight, arrives: '2027-01-13T10:00' })
    expect(a).toEqual({ kind: 'shrink', city: '와라즈', delta: -3, removeIds: ['d3', 'd2'], shortBy: 1 })
  })

  it('moves the departure date for the first day', () => {
    const a = alignFlight(trip, days, 'd0', { ...flight, arrives: '2027-01-10T22:00' })
    expect(a).toEqual({ kind: 'shift-start', newStart: '2027-01-10', delta: -2 })
  })
})

describe('money', () => {
  it('prices an exchange through the currency handed over', () => {
    const ex = { id: 'e', tripId: 'main', date: '2027-01-12', fromCurrency: 'USD', fromAmount: 200, toCurrency: 'PEN', toAmount: 740, place: '' }
    expect(Math.round(rateFromExchange(ex, [{ currency: 'USD', krwPerUnit: 1480, updated: '' }]))).toBe(400)
  })

  it('tracks cash per currency', () => {
    const methods = [{ id: 'cash', name: '현금', kind: 'cash' as const }, { id: 'card', name: '카드', kind: 'card' as const }]
    const ex = [{ id: 'e', tripId: 'main', date: '', fromCurrency: 'USD', fromAmount: 200, toCurrency: 'PEN', toAmount: 740, place: '' }]
    const spent = [
      { id: 'x', tripId: 'main', date: '', amount: 40, currency: 'PEN', krw: 0, category: 'food' as const, payMethodId: 'cash', memo: '' },
      { id: 'y', tripId: 'main', date: '', amount: 99, currency: 'PEN', krw: 0, category: 'food' as const, payMethodId: 'card', memo: '' },
    ]
    const b = cashBalances(ex, spent, methods)
    expect(b.get('PEN')).toBe(700)
    expect(b.get('USD')).toBe(-200)
  })

  it('splits spending before and during the trip', () => {
    const e = (date: string, krw: number) => ({ id: date, tripId: 'main', date, amount: 0, currency: 'KRW', krw, category: 'food' as const, payMethodId: '', memo: '' })
    const s = summarize(trip, [e('2026-11-01', 1_000_000), e('2027-01-12', 30_000), e('2027-01-13', 50_000)], '2027-01-13', 174)
    expect(s).toMatchObject({ totalKrw: 1_080_000, beforeKrw: 1_000_000, duringKrw: 80_000, todayKrw: 50_000, perDayKrw: 40_000 })
  })
})
