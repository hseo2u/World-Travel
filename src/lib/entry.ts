import { dayDate } from './dates'
import type { Day } from '../types'

/** Rules for a Korean passport. They change, so the page says when they were written and asks for a check before leaving. */
export const ENTRY_CHECKED = '2026년 10월'

export interface EntryInfo {
  stay: string
  notes: string[]
  /** Local emergency numbers, label → number */
  emergency: [string, string][]
}

const SCHENGEN_NOTES = [
  '쉥겐 국가는 모두 합쳐 180일 중 90일까지 머물 수 있어요.',
  '첫 입국 때 EES(지문·얼굴 등록)를 해요. ETIAS 사전 신청이 시작됐는지 출발 전에 확인하세요.',
]
const schengen = (emergency: [string, string][] = [['통합 긴급', '112']]): EntryInfo => ({
  stay: '무비자 · 쉥겐 합산 90일',
  notes: SCHENGEN_NOTES,
  emergency,
})

export const ENTRY: Record<string, EntryInfo> = {
  페루: { stay: '무비자 · 입국 심사에서 일수 결정 (최대 183일)', notes: ['입국 때 받은 체류 일수를 여권 도장이나 전자 기록으로 확인해 두세요.'], emergency: [['경찰', '105'], ['구급', '106'], ['소방', '116']] },
  볼리비아: { stay: '무비자 30일 (연장 가능)', notes: ['황열병 예방접종 증명서를 요구할 수 있어요. 페루에서 육로로 넘어갈 때 특히 챙기세요.', '라파스·우유니는 고도 3,600m 이상이에요.'], emergency: [['경찰', '110'], ['구급', '118'], ['소방', '119']] },
  칠레: { stay: '무비자 90일', notes: ['입국 때 받는 PDI 종이(전자 기록)를 보관하면 숙소 부가세 면제를 받을 수 있어요.', '과일·육류 반입 금지. 신고서에 꼭 표시하세요.'], emergency: [['경찰', '133'], ['구급', '131'], ['소방', '132']] },
  아르헨티나: { stay: '무비자 90일', notes: ['카드 결제가 현금보다 유리한 환율일 때가 많아요.'], emergency: [['경찰', '911'], ['구급', '107'], ['소방', '100']] },
  우루과이: { stay: '무비자 90일', notes: [], emergency: [['긴급', '911']] },
  브라질: { stay: '무비자 90일', notes: ['황열병 예방접종이 권장돼요.'], emergency: [['경찰', '190'], ['구급', '192'], ['소방', '193']] },
  파라과이: { stay: '무비자 90일', notes: ['이과수에서 국경을 오갈 때 출입국 도장을 꼭 받으세요.'], emergency: [['긴급', '911']] },
  포르투갈: schengen(),
  스페인: schengen(),
  프랑스: schengen([['통합 긴급', '112'], ['구급', '15'], ['경찰', '17']]),
  네덜란드: schengen(),
  벨기에: schengen(),
  독일: schengen([['통합 긴급', '112'], ['경찰', '110']]),
  오스트리아: schengen(),
  체코: schengen(),
  헝가리: schengen(),
  이탈리아: schengen(),
  스위스: schengen(),
  모나코: { stay: '무비자 (프랑스 쉥겐 기간에 포함)', notes: [], emergency: [['통합 긴급', '112']] },
  영국: { stay: '전자여행허가(ETA) 필요 · 최대 6개월', notes: ['출국 전 UK ETA 앱으로 신청하세요. 보통 며칠 안에 나와요.', '쉥겐 90일에 들어가지 않아요.'], emergency: [['긴급', '999'], ['통합 긴급', '112']] },
  모로코: { stay: '무비자 90일', notes: ['드론 반입 금지예요.'], emergency: [['경찰', '19'], ['구급·소방', '15']] },
  튀르키예: { stay: '무비자 90일 (180일 중)', notes: [], emergency: [['통합 긴급', '112']] },
  이집트: { stay: '도착비자 또는 e-Visa · 30일', notes: ['공항 은행 창구에서 도착비자를 사거나, 미리 공식 e-Visa 사이트에서 신청해요.'], emergency: [['경찰', '122'], ['구급', '123'], ['관광경찰', '126']] },
}

const SCHENGEN = new Set(['포르투갈', '스페인', '프랑스', '네덜란드', '벨기에', '독일', '오스트리아', '체코', '헝가리', '이탈리아', '스위스', '모나코'])

export interface CountryStay {
  country: string
  first: number
  last: number
  days: number
}

/** Countries in plan order with their first and last Day. A country visited twice appears twice. */
export function countryStays(days: Day[]): CountryStay[] {
  const out: CountryStay[] = []
  for (const d of days) {
    const prev = out.at(-1)
    if (prev && prev.country === d.country) {
      prev.last = d.order
      prev.days++
    } else if (d.country) {
      out.push({ country: d.country, first: d.order, last: d.order, days: 1 })
    }
  }
  return out
}

/** The most Schengen days the plan puts inside any 180-day window. */
export function schengenMax(startDate: string, days: Day[]): number {
  const dates = days.filter((d) => SCHENGEN.has(d.country)).map((d) => Date.parse(dayDate(startDate, d.order)))
  let best = 0
  for (const [i, end] of dates.entries()) {
    const from = end - 179 * 86_400_000
    const inWindow = dates.slice(0, i + 1).filter((t) => t >= from).length
    best = Math.max(best, inWindow)
  }
  return best
}

export const CONSULAR_CALL = '+82-2-3210-0404'
