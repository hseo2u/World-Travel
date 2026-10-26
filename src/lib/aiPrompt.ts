import type { Day, Trip } from '../types'
import { dayDate } from './dates'
import { TRANSPORT_LABEL } from './route'

export type PromptKind = 'review' | 'bookings' | 'next-move' | 'city-tips'

export const PROMPT_KINDS: { kind: PromptKind; label: string; needsDay: boolean }[] = [
  { kind: 'review', label: '전체 계획 점검', needsDay: false },
  { kind: 'bookings', label: '미리 예약할 것 찾기', needsDay: false },
  { kind: 'next-move', label: '이 날 이동 방법', needsDay: true },
  { kind: 'city-tips', label: '이 도시에서 할 것', needsDay: true },
]

/** One line per day: "Day 2 | 2027-01-13 | 페루 | 리마 > 와라즈 | 야간버스 | ..." */
export function planAsText(trip: Trip, days: Day[]): string {
  return [...days]
    .sort((a, b) => a.order - b.order)
    .map((d) => {
      const parts = [
        `Day ${d.order + 1}`,
        dayDate(trip.startDate, d.order),
        d.country || '?',
        d.cities.join(' > ') || '(미정)',
      ]
      if (d.transport) parts.push(TRANSPORT_LABEL[d.transport])
      if (d.content) parts.push(d.content.replace(/\n/g, ' / '))
      if (d.lodging) parts.push(`숙박: ${d.lodging}`)
      if (d.notes) parts.push(d.notes.replace(/\n/g, ' / '))
      if (d.buffer) parts.push('(버퍼일)')
      return parts.join(' | ')
    })
    .join('\n')
}

function tripHeader(trip: Trip): string {
  const who = trip.mode === 'solo' ? '혼자' : '동행과 함께'
  return `나는 ${trip.startDate}에 출국해서 ${who} 세계여행을 해. 예산은 약 ${Math.round(trip.budgetKrw / 10_000).toLocaleString()}만 원이고, 달러를 가져가서 현지 통화로 환전해 써.`
}

export function buildPrompt(kind: PromptKind, trip: Trip, days: Day[], day?: Day): string {
  const header = tripHeader(trip)
  const plan = planAsText(trip, days)

  switch (kind) {
    case 'review':
      return `${header}

아래는 내 Day별 여행 계획표야. 여행 전문가처럼 점검해줘.
1. 대중교통으로 이동이 어렵거나 소요시간이 비현실적인 구간
2. 일정이 너무 빡빡하거나 너무 늘어지는 곳
3. 계절, 날씨, 축제 기간, 달의 위상(별 보기) 등 날짜와 안 맞는 일정
4. 국경 이동, 비자, 입국 조건에서 주의할 점
문제마다 Day 번호와 구체적인 대안을 적어줘. 문제없는 부분은 생략해도 돼.

[계획표]
${plan}`
    case 'bookings':
      return `${header}

아래 계획표를 보고, 미리 예약하지 않으면 매진되거나 비싸지는 것(항공, 기차, 야간버스, 입장권, 투어, 숙소)을 찾아줘.
표로 정리해줘: Day 번호 | 예약할 것 | 언제까지 예약하면 좋은지 | 이유 | 예약하는 곳.
급한 순서대로 정렬해줘.

[계획표]
${plan}`
    case 'next-move': {
      if (!day) return ''
      const route = day.cities.join(' → ')
      return `${header}

Day ${day.order + 1} (${dayDate(trip.startDate, day.order)})에 ${day.country}에서 ${route}로 이동해. 계획: ${day.content || '없음'}, 숙박: ${day.lodging || '미정'}.
이 구간을 대중교통으로 가는 방법을 알려줘: 수단별 소요시간, 대략적인 가격(현지 통화와 달러), 예약 방법과 사이트, 출발 터미널/역 위치, 안전이나 짐 관련 주의점.
혼자 여행하는 배낭여행자 기준으로 가장 추천하는 방법을 먼저 말해줘.`
    }
    case 'city-tips': {
      if (!day) return ''
      const city = day.cities.at(-1) ?? ''
      const stayDays = days.filter((d) => d.cities.at(-1) === city).length
      return `${header}

${day.country} ${city}에 Day ${day.order + 1} (${dayDate(trip.startDate, day.order)})쯤 도착해서 약 ${stayDays}일 머물러. 계획: ${day.content || '아직 없음'}.
그 시기 날씨, 꼭 해볼 것, 현지 음식, 숙소 잡기 좋은 동네, 치안 주의점, 현금이 필요한 곳과 카드가 되는 곳을 알려줘.
혼자 여행하는 배낭여행자 기준으로 짧게 정리해줘.`
    }
  }
}
