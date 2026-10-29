import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { feature } from 'topojson-client'
import type { Topology } from 'topojson-specification'
import countries from 'world-atlas/countries-110m.json'
import mapWorkerUrl from '../platform/mapWorker'

export { maplibregl }

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

maplibregl.setWorkerUrl(mapWorkerUrl)

const topo = countries as unknown as Topology
const land = withoutWrapped(feature(topo, topo.objects.countries) as unknown as GeoJSON.FeatureCollection)

// Fiji, Russia's far east and Antarctica cross the 180° line. Drawn flat, those
// parts become bands across the whole map, so they are left out.
function withoutWrapped(fc: GeoJSON.FeatureCollection): GeoJSON.FeatureCollection {
  const span = (poly: GeoJSON.Position[][]) => {
    const xs = poly[0].map((p) => p[0])
    return Math.max(...xs) - Math.min(...xs)
  }
  const features = fc.features.flatMap((f) => {
    const g = f.geometry
    if (g.type === 'Polygon') return span(g.coordinates) > 180 ? [] : [f]
    if (g.type === 'MultiPolygon') {
      const parts = g.coordinates.filter((p) => span(p) <= 180)
      return parts.length ? [{ ...f, geometry: { ...g, coordinates: parts } }] : []
    }
    return [f]
  })
  return { ...fc, features }
}

// Used when the tile server can't be reached: a plain sea with country shapes,
// so pins and routes still have something to sit on.
const OFFLINE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: { land: { type: 'geojson', data: land } },
  layers: [
    { id: 'sea', type: 'background', paint: { 'background-color': '#d6e6f0' } },
    { id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': '#f4f2ec' } },
    { id: 'borders', type: 'line', source: 'land', paint: { 'line-color': '#b9b5aa', 'line-width': 0.6 } },
  ],
}

/**
 * Opens a map on `container`. `onStyle` runs every time a style is ready
 * (the online one, or the offline fallback), so layers can be added again.
 */
export function openMap(
  container: HTMLElement,
  onStyle: (m: maplibregl.Map) => void,
  view: { center: [number, number]; zoom: number } = { center: [-40, -10], zoom: 1.5 },
): () => void {
  const m = new maplibregl.Map({ container, style: STYLE_URL, ...view, attributionControl: { compact: true } })
  m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
  let ready = false
  m.on('style.load', () => {
    ready = true
    onStyle(m)
  })
  const goOffline = () => {
    if (ready) return
    ready = true
    m.setStyle(OFFLINE_STYLE)
  }
  // Only the style itself decides online vs offline. A missing tile or a slow
  // phone network after the style has loaded must not wipe the map.
  const timer = setTimeout(goOffline, navigator.onLine ? 12000 : 0)
  m.on('error', () => {
    if (!ready) goOffline()
  })
  // The map is often created inside a box that is still settling its size.
  const resize = new ResizeObserver(() => m.resize())
  resize.observe(container)
  return () => {
    clearTimeout(timer)
    resize.disconnect()
    m.remove()
  }
}

export type PinTone = 'city' | 'plan' | 'stay' | 'record'

/**
 * A dot with its name beside it. `badge` goes inside the dot (a stop's number).
 * Add it with addPin, which lines the dot's centre up with the place.
 */
export function pinElement(name: string, tone: PinTone, badge = ''): HTMLElement {
  const el = document.createElement('div')
  el.className = `mark ${tone}${badge ? ' badged' : ''}`
  const dot = document.createElement('i')
  dot.textContent = badge
  const label = document.createElement('span')
  label.textContent = name
  el.append(dot, label)
  return el
}

export function addPin(m: maplibregl.Map, at: [number, number], el: HTMLElement, popup?: HTMLElement | string): maplibregl.Marker {
  const half = el.classList.contains('badged') ? 11 : 7
  const mk = new maplibregl.Marker({ element: el, anchor: 'left', offset: [-half, 0] }).setLngLat(at)
  if (popup) {
    const p = new maplibregl.Popup({ offset: 14, closeButton: false, maxWidth: '240px' })
    if (typeof popup === 'string') p.setText(popup)
    else p.setDOMContent(popup)
    mk.setPopup(p)
  }
  return mk.addTo(m)
}

/**
 * Hides names that would sit on top of a more important one. `pins` is in
 * priority order, most important first. Runs again after every move.
 */
export function declutter(m: maplibregl.Map, pins: () => HTMLElement[]): () => void {
  const run = () => {
    const taken: DOMRect[] = []
    for (const el of pins()) {
      const label = el.querySelector('span')
      if (!label) continue
      label.style.visibility = ''
      const r = label.getBoundingClientRect()
      const hit = taken.some((t) => r.left < t.right && r.right > t.left && r.top < t.bottom && r.bottom > t.top)
      if (hit) label.style.visibility = 'hidden'
      else taken.push(r)
    }
  }
  m.on('moveend', run)
  requestAnimationFrame(run)
  return () => { m.off('moveend', run) }
}
