import type { Day, Transport } from '../types'

/**
 * Parses tab-separated text copied from Google Sheets / Excel.
 * Cells with line breaks arrive wrapped in double quotes, with "" for a literal quote.
 */
export function parseTsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const src = text.replace(/\r\n?/g, '\n')

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          quoted = false
        }
      } else {
        cell += ch
      }
    } else if (ch === '"' && cell === '') {
      quoted = true
    } else if (ch === '\t') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += ch
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

const HEADER_HINTS = ['일', '국가', '도시', '내용', '숙박', '기타']

/** Splits "아타카마 > 카라마 (버스)\n카라마 > 산티아고 (비행기)" into ["아타카마", "카라마", "산티아고"]. */
export function parseCities(cell: string): string[] {
  const parts = cell
    .split(/>|\n|→|\s\/\s/)
    .map((p) => p.replace(/\(.*?\)/g, '').trim())
    .filter(Boolean)
  return parts.filter((p, i) => p !== parts[i - 1])
}

export function detectTransport(text: string): Transport | undefined {
  if (/야간\s*페리/.test(text)) return 'night-ferry'
  if (/야간\s*버스|야간버스|아갼버스/.test(text)) return 'night-bus'
  if (/비행기|항공/.test(text)) return 'flight'
  if (/페리/.test(text)) return 'ferry'
  if (/기차|열차|TGV|고속\s*열차/.test(text)) return 'train'
  if (/버스/.test(text)) return 'bus'
  if (/투어로/.test(text)) return 'tour'
  return undefined
}

export interface ImportResult {
  days: Omit<Day, 'id' | 'tripId'>[]
  skipped: number
}

/**
 * Turns the spreadsheet rows (일 · 국가 · 도시 · 내용 · 숙박 · 기타) into days.
 * The sheet's own Day numbers are ignored: days are renumbered in sheet order,
 * and a blank country carries over from the row above.
 */
export function rowsToDays(rows: string[][]): ImportResult {
  let body = rows
  if (body.length && HEADER_HINTS.filter((h) => body[0].some((c) => c.trim() === h)).length >= 3) {
    body = body.slice(1)
  }

  const days: ImportResult['days'] = []
  let country = ''
  let skipped = 0

  for (const raw of body) {
    const [dayCol = '', countryCol = '', cityCol = '', content = '', lodging = '', notes = ''] = raw.map((c) => c.trim())
    if (countryCol) country = countryCol
    const cities = parseCities(cityCol)
    // A row with no day label and no city is an empty spacer in the sheet.
    if (!cities.length && !content && !lodging) {
      if (dayCol || countryCol) {
        // Placeholder like "Day 83 | 모로코" with nothing planned yet: keep it so the gap is visible.
        days.push({ order: days.length, country, cities: [], content: '', lodging: '', notes: '미정', buffer: false })
      } else {
        skipped++
      }
      continue
    }
    const moving = cities.length > 1
    const all = `${cityCol} ${content} ${lodging} ${notes}`
    days.push({
      order: days.length,
      country,
      cities,
      content,
      lodging,
      notes,
      transport: moving ? (detectTransport(all) ?? 'unknown') : undefined,
      buffer: /버퍼/.test(content),
    })
  }
  return { days, skipped }
}
