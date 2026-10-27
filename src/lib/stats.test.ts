import { describe, expect, it } from 'vitest'
import { BEFORE_TRIP, byCategory, byCountry, countryOn } from './stats'
import type { Day, Expense, ExpenseCategory, Trip } from '../types'

const trip: Trip = { id: 'main', name: 't', startDate: '2027-01-12', budgetKrw: 0, mode: 'solo' }
const mk = (order: number, country: string): Day => ({ id: `d${order}`, tripId: 'main', order, country, cities: [], content: '', lodging: '', notes: '', buffer: false })
const days = [mk(0, '페루'), mk(1, '페루'), mk(2, '볼리비아'), mk(3, '칠레'), mk(4, '아르헨티나'), mk(5, '브라질'), mk(6, '모로코'), mk(7, '스페인')]
const ex = (date: string, krw: number, category: ExpenseCategory = 'food'): Expense => ({ id: date + krw, tripId: 'main', date, amount: krw, currency: 'KRW', krw, category, payMethodId: '', memo: '' })

describe('countryOn', () => {
  it('puts spending before departure in its own slice and follows the plan after', () => {
    expect(countryOn(trip, days, '2026-12-01')).toBe(BEFORE_TRIP)
    expect(countryOn(trip, days, '2027-01-14')).toBe('볼리비아')
    expect(countryOn(trip, days, '2027-03-01')).toBe('스페인')
  })
})

describe('byCategory', () => {
  it('keeps each category on its own colour and folds admission into the grey slice', () => {
    const s = byCategory([ex('2027-01-12', 100, 'food'), ex('2027-01-12', 900, 'flight'), ex('2027-01-12', 50, 'admission'), ex('2027-01-13', 30, 'etc')])
    expect(s.map((x) => [x.key, x.slot, x.krw])).toEqual([['flight', 1, 900], ['food', 3, 100], ['other', 0, 80]])
  })
})

describe('byCountry', () => {
  it('colours the biggest five in route order and folds the rest', () => {
    const list = [ex('2026-12-01', 1000), ex('2027-01-12', 500), ex('2027-01-14', 400), ex('2027-01-15', 300), ex('2027-01-16', 200), ex('2027-01-17', 100), ex('2027-01-18', 50)]
    const s = byCountry(list, trip, days)
    expect(s.map((x) => [x.label, x.slot])).toEqual([[BEFORE_TRIP, 1], ['페루', 2], ['볼리비아', 3], ['칠레', 4], ['아르헨티나', 5], ['그 외 2개국', 0]])
    expect(s.at(-1)!.krw).toBe(150)
  })

  it('does not fold a single leftover country', () => {
    const s = byCountry([ex('2027-01-12', 5), ex('2027-01-14', 4), ex('2027-01-15', 3), ex('2027-01-16', 2), ex('2027-01-17', 1), ex('2027-01-18', 1)], trip, days)
    expect(s.some((x) => x.slot === 0)).toBe(false)
    expect(s).toHaveLength(6)
  })
})
