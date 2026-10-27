import { CATEGORY_LABEL } from './money'
import { daysBetween } from './dates'
import type { Day, Expense, ExpenseCategory, Trip } from '../types'

/** One slice: `slot` is the categorical colour slot 1-8, or 0 for the grey "기타". */
export interface Slice {
  key: string
  label: string
  krw: number
  slot: number
}

// Each category keeps its own colour whatever its rank, so the chart reads the
// same month after month. Admission and the catch-all share the grey slice.
const CATEGORY_SLOT: Partial<Record<ExpenseCategory, number>> = {
  flight: 1, stay: 2, food: 3, transport: 4, activity: 5, essentials: 6, supplies: 7, shopping: 8,
}

export function byCategory(expenses: Expense[]): Slice[] {
  const sums = new Map<string, Slice>()
  for (const e of expenses) {
    const slot = CATEGORY_SLOT[e.category] ?? 0
    const key = slot ? e.category : 'other'
    const s = sums.get(key) ?? { key, label: slot ? CATEGORY_LABEL[e.category] : '입장료·기타', krw: 0, slot }
    s.krw += e.krw
    sums.set(key, s)
  }
  return sortSlices([...sums.values()])
}

export const BEFORE_TRIP = '출국 전'

/** The country the plan puts you in on a date. Spending before departure is its own slice. */
export function countryOn(trip: Trip, days: Day[], date: string): string {
  const order = daysBetween(trip.startDate, date)
  if (order < 0) return BEFORE_TRIP
  const day = days.find((d) => d.order === Math.min(order, days.length - 1))
  return day?.country || '미정'
}

/**
 * Spending per country. The five biggest get colours, in the order the trip
 * visits them (so a colour stays with its country); the rest fold into 기타.
 */
export function byCountry(expenses: Expense[], trip: Trip, days: Day[], top = 5): Slice[] {
  const sums = new Map<string, number>()
  for (const e of expenses) {
    const c = countryOn(trip, days, e.date)
    sums.set(c, (sums.get(c) ?? 0) + e.krw)
  }
  const route = [BEFORE_TRIP, ...new Set(days.map((d) => d.country))]
  const ranked = [...sums.entries()].sort((a, b) => b[1] - a[1])
  const kept = ranked.slice(0, ranked.length > top + 1 ? top : top + 1)
  const keptKeys = kept.map(([k]) => k).sort((a, b) => indexIn(route, a) - indexIn(route, b))
  const slices: Slice[] = keptKeys.map((k, i) => ({ key: k, label: k, krw: sums.get(k)!, slot: i + 1 }))
  const rest = ranked.slice(kept.length).reduce((n, [, v]) => n + v, 0)
  if (rest) slices.push({ key: 'other', label: `그 외 ${ranked.length - kept.length}개국`, krw: rest, slot: 0 })
  return sortSlices(slices)
}

function indexIn(list: string[], k: string) {
  const i = list.indexOf(k)
  return i < 0 ? list.length : i
}

// Biggest first, with the grey remainder always last.
function sortSlices(s: Slice[]): Slice[] {
  return s.filter((x) => x.krw > 0).sort((a, b) => (a.slot === 0 ? 1 : b.slot === 0 ? -1 : b.krw - a.krw))
}
