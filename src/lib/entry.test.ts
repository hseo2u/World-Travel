import { describe, expect, it } from 'vitest'
import { countryStays, ENTRY, schengenMax } from './entry'
import type { Day } from '../types'

const day = (order: number, country: string): Day => ({ id: String(order), tripId: 'main', order, country, cities: ['x'], content: '', lodging: '', notes: '', buffer: false })

describe('entry info', () => {
  it('groups consecutive days by country, keeping return visits separate', () => {
    const stays = countryStays([day(0, '아르헨티나'), day(1, '아르헨티나'), day(2, '우루과이'), day(3, '아르헨티나')])
    expect(stays.map((s) => [s.country, s.days])).toEqual([['아르헨티나', 2], ['우루과이', 1], ['아르헨티나', 1]])
  })

  it('counts Schengen days in the worst 180-day window, leaving the UK out', () => {
    const days = [...Array(50)].map((_, i) => day(i, '스페인'))
      .concat([...Array(10)].map((_, i) => day(50 + i, '영국')))
      .concat([...Array(45)].map((_, i) => day(60 + i, '독일')))
    expect(schengenMax('2027-04-01', days)).toBe(95)
  })

  it('has entry info for every country in the plan', () => {
    for (const c of ['페루', '볼리비아', '칠레', '아르헨티나', '우루과이', '브라질', '파라과이', '포르투갈', '모로코', '스페인', '프랑스', '영국', '네덜란드', '벨기에', '독일', '오스트리아', '체코', '헝가리', '이탈리아', '튀르키예', '이집트']) {
      expect(ENTRY[c], c).toBeDefined()
    }
  })
})
