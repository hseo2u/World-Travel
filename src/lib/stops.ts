import type { PlanStop, StopKind } from '../types'

export const STOP_KIND_LABEL: Record<StopKind, string> = { stay: '숙소', sight: '볼거리', food: '먹을 곳', move: '터미널·역', etc: '기타' }
export const STOP_KIND_ICON: Record<StopKind, string> = { stay: '🛏️', sight: '📍', food: '🍽️', move: '🚉', etc: '•' }

export interface ParsedPlace {
  name?: string
  lat?: number
  lng?: number
  url?: string
}

/**
 * Reads what a Google Maps share gives: a link, or "Name\nAddress\nlink" from the iPhone share sheet.
 * Full links carry the position; short maps.app.goo.gl links only keep the name and the link itself.
 */
export function parseGoogleMaps(text: string): ParsedPlace {
  const url = text.match(/https?:\/\/\S+/)?.[0]
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('http'))
  const out: ParsedPlace = { url, name: lines[0] }
  if (!url) return out
  let decoded = url
  try {
    decoded = decodeURIComponent(url)
  } catch {
    // keep the raw link
  }
  const exact = decoded.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
  const view = decoded.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  const query = decoded.match(/[?&](?:q|query|ll|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/)
  const hit = exact ?? query ?? view
  if (hit) {
    out.lat = Number(hit[1])
    out.lng = Number(hit[2])
  }
  const placeName = decoded.match(/\/place\/([^/@]+)/)?.[1] ?? decoded.match(/[?&](?:q|query)=([^&]+)/)?.[1]
  if (!out.name && placeName && !/^-?\d+\.\d+,/.test(placeName)) out.name = placeName.replace(/\+/g, ' ').trim()
  return out
}

function where(stop: Pick<PlanStop, 'name' | 'lat' | 'lng'>, city: string): string {
  return stop.lat !== undefined && stop.lng !== undefined ? `${stop.lat},${stop.lng}` : [stop.name, city].filter(Boolean).join(' ')
}

/** Opens the place in Google Maps (the app on an iPhone when it is installed). */
export function googlePlaceLink(stop: PlanStop, city: string): string {
  if (stop.url) return stop.url
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(where(stop, city))}`
}

/** Directions through the day's stops in order, for Google Maps. */
export function googleRouteLink(stops: PlanStop[], city: string): string | undefined {
  const pts = stops.filter((s) => s.name || s.lat !== undefined).map((s) => where(s, city))
  if (pts.length < 2) return undefined
  const q = new URLSearchParams({ api: '1', origin: pts[0], destination: pts.at(-1)! })
  if (pts.length > 2) q.set('waypoints', pts.slice(1, -1).join('|'))
  return `https://www.google.com/maps/dir/?${q}`
}
