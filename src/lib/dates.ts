const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** Date of the day at `order` (0-based) counted from the trip start, as YYYY-MM-DD. */
export function dayDate(startDate: string, order: number): string {
  const d = new Date(`${startDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + order)
  return d.toISOString().slice(0, 10)
}

/** "1/12 (화)" */
export function formatShort(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} (${WEEKDAYS[d.getUTCDay()]})`
}

export function todayIso(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Whole days from `from` to `to` (both YYYY-MM-DD). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

/** "YYYY-MM" moved by `n` months. */
export function shiftMonth(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + n, 1))
  return d.toISOString().slice(0, 7)
}

/** The month's dates laid out Sunday-first, with null for the blanks before and after. */
export function monthCells(ym: string): (string | null)[] {
  const first = new Date(`${ym}-01T00:00:00Z`)
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
  const cells: (string | null)[] = Array(first.getUTCDay()).fill(null)
  for (let i = 1; i <= count; i++) cells.push(`${ym}-${String(i).padStart(2, '0')}`)
  while (cells.length % 7) cells.push(null)
  return cells
}
