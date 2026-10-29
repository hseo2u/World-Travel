import { describe, expect, it } from 'vitest'
import { monthCells, shiftMonth } from './dates'
import { formatKrwTiny } from './money'

describe('month calendar', () => {
  it('starts on the right weekday and pads to full weeks', () => {
    const cells = monthCells('2027-01')
    // 2027-01-01 is a Friday
    expect(cells.indexOf('2027-01-01')).toBe(5)
    expect(cells.length % 7).toBe(0)
    expect(cells.filter(Boolean)).toHaveLength(31)
  })
  it('moves across years', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2027-01', -1)).toBe('2026-12')
  })
  it('writes short amounts', () => {
    expect([2_530_000, 42_000, 9_960, 8_200, 900].map(formatKrwTiny)).toEqual(['253만', '4.2만', '1만', '8천', '900'])
  })
})
