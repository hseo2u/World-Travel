import type { CashCount, Exchange, Expense, ExpenseCategory, PayMethod, Rate, Trip } from '../types'
import { dayDate } from './dates'

export const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  flight: '항공',
  transport: '교통',
  stay: '숙박',
  food: '식비',
  activity: '투어·액티비티',
  admission: '입장료',
  shopping: '쇼핑',
  supplies: '필요물품 구매',
  essentials: '통신·보험·비자',
  etc: '기타',
}

export const CATEGORY_ICON: Record<ExpenseCategory, string> = {
  flight: '✈️',
  transport: '🚌',
  stay: '🛏️',
  food: '🍽️',
  activity: '🧗',
  admission: '🎟️',
  shopping: '🛍️',
  supplies: '🧴',
  essentials: '📶',
  etc: '•',
}

const CURRENCY_OF: Record<string, string> = {
  한국: 'KRW', 페루: 'PEN', 볼리비아: 'BOB', 칠레: 'CLP', 아르헨티나: 'ARS', 우루과이: 'UYU', 브라질: 'BRL',
  파라과이: 'PYG', 포르투갈: 'EUR', 스페인: 'EUR', 프랑스: 'EUR', 네덜란드: 'EUR', 벨기에: 'EUR', 독일: 'EUR',
  오스트리아: 'EUR', 이탈리아: 'EUR', 모나코: 'EUR', 영국: 'GBP', 체코: 'CZK', 헝가리: 'HUF', 스위스: 'CHF',
  모로코: 'MAD', 튀르키예: 'TRY', 이집트: 'EGP',
}

export function currencyOf(country: string): string | undefined {
  return CURRENCY_OF[country.trim()]
}

/**
 * Rough KRW values used until the traveller records a real exchange or edits the rate.
 * They drift, so the wallet screen shows them as editable estimates.
 */
export const DEFAULT_KRW_PER_UNIT: Record<string, number> = {
  KRW: 1, USD: 1400, EUR: 1500, GBP: 1800, CHF: 1600, PEN: 370, BOB: 200, CLP: 1.5, ARS: 1.2, UYU: 35,
  BRL: 250, PYG: 0.18, CZK: 60, HUF: 3.8, MAD: 140, TRY: 35, EGP: 28,
}

export const CURRENCIES = Object.keys(DEFAULT_KRW_PER_UNIT)

export function krwPerUnit(currency: string, rates: Rate[]): number {
  if (currency === 'KRW') return 1
  return rates.find((r) => r.currency === currency)?.krwPerUnit ?? DEFAULT_KRW_PER_UNIT[currency] ?? 0
}

/**
 * The rate an exchange implies for the currency received, priced through what was handed over.
 * USD 200 → PEN 742 with USD at 1,400 KRW gives PEN ≈ 377 KRW.
 */
export function rateFromExchange(ex: Exchange, rates: Rate[]): number {
  return (ex.fromAmount * krwPerUnit(ex.fromCurrency, rates)) / ex.toAmount
}

/** Always offered when no cash wallet was added, so cash spending can leave the wallet. */
export const WALLET_CASH: PayMethod = { id: 'cash', name: '현금', kind: 'cash' }

export function withWallet(methods: PayMethod[]): PayMethod[] {
  return methods.some((m) => m.kind === 'cash') ? methods : [WALLET_CASH, ...methods]
}

/** Money moved by records alone: exchanged in, minus exchanged out, minus cash spent. */
export function cashFlows(exchanges: Exchange[], expenses: Expense[], methods: PayMethod[]): Map<string, number> {
  const out = new Map<string, number>()
  const add = (c: string, n: number) => out.set(c, (out.get(c) ?? 0) + n)
  for (const ex of exchanges) {
    add(ex.toCurrency, ex.toAmount)
    add(ex.fromCurrency, -ex.fromAmount)
  }
  const cashIds = new Set([WALLET_CASH.id, ...methods.filter((m) => m.kind === 'cash').map((m) => m.id)])
  for (const e of expenses) if (cashIds.has(e.payMethodId)) add(e.currency, -e.amount)
  return out
}

/**
 * Cash on hand per currency. Where the wallet was counted, the latest count is
 * the starting point and only records added after it change it. KRW shows only
 * when counted, since won usually leaves a bank account, not the wallet.
 */
export function cashBalances(exchanges: Exchange[], expenses: Expense[], methods: PayMethod[], counts: CashCount[] = []): Map<string, number> {
  const flows = cashFlows(exchanges, expenses, methods)
  const latest = new Map<string, CashCount>()
  for (const c of counts) {
    const prev = latest.get(c.currency)
    if (!prev || c.date > prev.date || (c.date === prev.date && c.at > prev.at)) latest.set(c.currency, c)
  }
  const out = new Map<string, number>()
  for (const [cur, n] of flows) if (cur !== 'KRW') out.set(cur, n)
  for (const [cur, c] of latest) out.set(cur, c.amount + (flows.get(cur) ?? 0) - c.flowAt)
  return out
}

export interface SpendSummary {
  totalKrw: number
  beforeKrw: number
  duringKrw: number
  todayKrw: number
  byCategory: { category: ExpenseCategory; krw: number }[]
  /** Average per travel day so far, KRW */
  perDayKrw: number
}

export function summarize(trip: Trip, expenses: Expense[], today: string, tripDays: number): SpendSummary {
  let before = 0
  let during = 0
  let todayKrw = 0
  const cats = new Map<ExpenseCategory, number>()
  for (const e of expenses) {
    if (e.date < trip.startDate) before += e.krw
    else during += e.krw
    if (e.date === today) todayKrw += e.krw
    cats.set(e.category, (cats.get(e.category) ?? 0) + e.krw)
  }
  const end = tripDays > 0 ? dayDate(trip.startDate, tripDays - 1) : trip.startDate
  const elapsed = today < trip.startDate ? 0 : Math.min(daysInclusive(trip.startDate, today < end ? today : end), tripDays)
  return {
    totalKrw: before + during,
    beforeKrw: before,
    duringKrw: during,
    todayKrw,
    byCategory: [...cats.entries()].map(([category, krw]) => ({ category, krw })).sort((a, b) => b.krw - a.krw),
    perDayKrw: elapsed ? Math.round(during / elapsed) : 0,
  }
}

function daysInclusive(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1
}

export function formatKrw(n: number): string {
  if (Math.abs(n) >= 10_000) return `${(n / 10_000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}만 원`
  return `${Math.round(n).toLocaleString('ko-KR')}원`
}

export function formatMoney(amount: number, currency: string): string {
  const digits = amount % 1 === 0 ? 0 : 2
  return `${amount.toLocaleString('ko-KR', { maximumFractionDigits: digits })} ${currency}`
}

/** Short enough for a calendar cell: 253만, 4.2만, 8천, 900. */
export function formatKrwTiny(n: number): string {
  if (n >= 99_500) return `${Math.round(n / 10_000)}만`
  if (n >= 9_950) return `${(n / 10_000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}만`
  if (n >= 950) return `${Math.round(n / 1_000)}천`
  return String(Math.round(n))
}
