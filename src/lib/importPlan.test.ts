import { describe, expect, it } from 'vitest'
import { detectTransport, parseCities, parseTsv, rowsToDays } from './importPlan'

const SAMPLE = [
  '일\t국가\t도시\t내용\t숙박\t기타',
  'Day 1\t페루\t리마\t\t리마\t',
  'Day 2\t\t리마 > 와라즈\t"리마 구경하고\n밤에 야간버스로 이동"\tX (야간버스)\t8-10 시간 소요',
  'Day 21\t\t아구아스깔리엔테스\t마추픽추 (날씨 버퍼)\t아구아스깔리엔테스\t',
  'Day 43\t\t"아타카마 > 카라마 (버스)\n카라마 > 산티아고 (비행기)"\t\t산티아고\t',
  'Day 83\t모로코\t\t\t\t',
  '\t\t\t\t\t',
  'Day 73\t스페인\t포르투 > 마드리드\t야간버스\tX (야간버스)\t9-10시간 소요',
].join('\n')

describe('parseTsv', () => {
  it('keeps line breaks inside quoted cells', () => {
    const rows = parseTsv(SAMPLE)
    expect(rows[2][3]).toBe('리마 구경하고\n밤에 야간버스로 이동')
    expect(rows).toHaveLength(8)
  })

  it('unescapes doubled quotes', () => {
    expect(parseTsv('"a ""b"""\tc')).toEqual([['a "b"', 'c']])
  })
})

describe('parseCities', () => {
  it('splits multi-hop routes and drops transport notes', () => {
    expect(parseCities('아타카마 > 카라마 (버스)\n카라마 > 산티아고 (비행기)')).toEqual(['아타카마', '카라마', '산티아고'])
  })
})

describe('detectTransport', () => {
  it('prefers night bus over bus', () => {
    expect(detectTransport('밤에 야간버스로 이동')).toBe('night-bus')
    expect(detectTransport('버스 이동')).toBe('bus')
    expect(detectTransport('TGV')).toBe('train')
  })
})

describe('rowsToDays', () => {
  const { days, skipped } = rowsToDays(parseTsv(SAMPLE))

  it('renumbers days in sheet order, ignoring the sheet labels', () => {
    expect(days.map((d) => d.order)).toEqual([0, 1, 2, 3, 4, 5])
    expect(skipped).toBe(1)
  })

  it('carries the country down from the row above', () => {
    expect(days[1].country).toBe('페루')
    expect(days[3].country).toBe('페루')
    expect(days[5].country).toBe('스페인')
  })

  it('reads moves, transport and buffer days', () => {
    expect(days[1].cities).toEqual(['리마', '와라즈'])
    expect(days[1].transport).toBe('night-bus')
    expect(days[2].buffer).toBe(true)
    expect(days[2].transport).toBeUndefined()
    expect(days[3].transport).toBe('flight')
  })

  it('keeps an unplanned country row as a placeholder', () => {
    expect(days[4]).toMatchObject({ country: '모로코', cities: [], notes: '미정' })
  })
})
