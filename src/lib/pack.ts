import { db, newId, TRIP_ID } from '../db'
import type { PackItem } from '../types'

export const ON_TRIP_GROUP = '여행 중 필요해진 것'

// A starting list for five months of hostels, high altitude, Patagonia cold and African sun.
export const PACK_TEMPLATE: Record<string, string[]> = {
  서류: ['여권 (만료 6개월 이상 남음)', '여권 사본·증명사진 2장', '황열병 예방접종 증명서', '여행자보험 증서', '국제운전면허증', '항공권 e-티켓 저장', '카드 2장 이상 (VISA·Master)', '달러 현금'],
  전자기기: ['휴대폰', '충전기·케이블', '보조배터리', '멀티 어댑터', 'eSIM 또는 유심', '이어폰', '오프라인 지도 받아두기'],
  의류: ['경량 패딩', '방수 자켓', '플리스', '트레킹화', '모자·장갑·넥워머', '슬리퍼', '수영복', '속옷·양말 5일치'],
  건강: ['고산병약', '상비약 (진통제·지사제·밴드)', '선크림', '모기 기피제', '손 소독제'],
  생활: ['자물쇠 (호스텔 사물함)', '빨래줄·세제', '스포츠 타월', '침낭 라이너', '귀마개·안대', '지퍼백', '물병'],
  가방: ['메인 배낭', '보조 가방', '복대·도난방지 파우치'],
}

let seeding: Promise<void> | undefined

/** Adds the starter list the first time the packing page opens. */
export function ensurePackList(): Promise<void> {
  seeding ??= (async () => {
    const trip = await db.trips.get(TRIP_ID)
    if (!trip || trip.packSeeded) return
    // One millisecond apart so the list keeps the template's order.
    const base = Date.now()
    const items: PackItem[] = Object.entries(PACK_TEMPLATE)
      .flatMap(([group, names]) => names.map((name) => ({ group, name })))
      .map(({ group, name }, i) => ({ id: newId(), tripId: TRIP_ID, group, name, done: false, onTrip: false, created: new Date(base + i).toISOString() }))
    await db.transaction('rw', db.trips, db.packItems, async () => {
      await db.packItems.bulkAdd(items)
      await db.trips.update(TRIP_ID, { packSeeded: true })
    })
  })()
  return seeding
}

/** The on-trip group first (it is what gets used on the road), then template groups, then the user's own. */
export function groupPack(items: PackItem[]): [string, PackItem[]][] {
  const groups = new Map<string, PackItem[]>([[ON_TRIP_GROUP, []]])
  for (const g of Object.keys(PACK_TEMPLATE)) groups.set(g, [])
  for (const it of [...items].sort((a, b) => a.created.localeCompare(b.created))) {
    if (it.onTrip) continue
    if (!groups.has(it.group)) groups.set(it.group, [])
    groups.get(it.group)!.push(it)
  }
  groups.set(ON_TRIP_GROUP, items.filter((it) => it.onTrip).sort((a, b) => Number(a.done) - Number(b.done) || b.created.localeCompare(a.created)))
  return [...groups].filter(([g, list]) => list.length > 0 || g === ON_TRIP_GROUP)
}
