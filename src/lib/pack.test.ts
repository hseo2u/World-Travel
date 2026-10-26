import { describe, expect, it } from 'vitest'
import { groupPack, ON_TRIP_GROUP } from './pack'
import type { PackItem } from '../types'

const item = (name: string, group: string, extra: Partial<PackItem> = {}): PackItem => ({
  id: name, tripId: 'main', group, name, done: false, onTrip: false, created: '2026-10-26T00:00:00Z', ...extra,
})

describe('groupPack', () => {
  it('keeps template order, adds custom groups, and puts the on-trip group first with open items on top', () => {
    const groups = groupPack([
      item('침낭', '캠핑'),
      item('여권', '서류'),
      item('우비', ON_TRIP_GROUP, { onTrip: true, done: true, created: '2027-02-01T00:00:00Z' }),
      item('선글라스', ON_TRIP_GROUP, { onTrip: true, created: '2027-01-20T00:00:00Z' }),
    ])
    expect(groups.map(([g]) => g)).toEqual([ON_TRIP_GROUP, '서류', '캠핑'])
    expect(groups[0][1].map((i) => i.name)).toEqual(['선글라스', '우비'])
  })

  it('always shows the on-trip group so there is a place to add to', () => {
    expect(groupPack([]).map(([g]) => g)).toEqual([ON_TRIP_GROUP])
  })
})
