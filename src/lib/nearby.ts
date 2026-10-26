export interface PlaceHit {
  name: string
  kind: string
  lat: number
  lng: number
}

/** Asks the phone where it is. Rejects when location is off or refused. */
export function here(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('no geolocation'))
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  })
}

const KIND: Record<string, string> = {
  restaurant: '식당', cafe: '카페', bar: '바', pub: '펍', fast_food: '간편식', marketplace: '시장',
  museum: '박물관', viewpoint: '전망대', attraction: '명소', hostel: '호스텔', hotel: '숙소', gallery: '갤러리',
  park: '공원', place_of_worship: '성당·사원', monument: '기념물', ruins: '유적', artwork: '예술',
}

/** Named places within a few hundred metres, nearest first, from OpenStreetMap (free, no key). */
export async function nearbyPlaces(lat: number, lng: number, radius = 300): Promise<PlaceHit[]> {
  const around = `(around:${radius},${lat},${lng})`
  const query = `[out:json][timeout:10];(nwr${around}[name][tourism];nwr${around}[name][amenity~"restaurant|cafe|bar|pub|fast_food|marketplace|place_of_worship"];nwr${around}[name][historic];nwr${around}[name][leisure=park];);out center 40;`
  const res = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: new URLSearchParams({ data: query }) })
  if (!res.ok) return []
  const json = (await res.json()) as { elements: { lat?: number; lon?: number; center?: { lat: number; lon: number }; tags: Record<string, string> }[] }
  const dist = (a: number, b: number) => (a - lat) ** 2 + ((b - lng) * Math.cos((lat * Math.PI) / 180)) ** 2
  const seen = new Set<string>()
  return json.elements
    .map((e) => {
      const t = e.tags
      const name = t['name:ko'] ?? t.name
      const kindKey = t.tourism ?? t.amenity ?? t.historic ?? t.leisure ?? ''
      return { name, kind: KIND[kindKey] ?? '', lat: e.lat ?? e.center?.lat ?? lat, lng: e.lon ?? e.center?.lon ?? lng }
    })
    .filter((p) => p.name && !seen.has(p.name) && seen.add(p.name))
    .sort((a, b) => dist(a.lat, a.lng) - dist(b.lat, b.lng))
}

/** Searches places by name, near the city when one is given. */
export async function searchPlaces(q: string, city: string, country: string): Promise<PlaceHit[]> {
  const text = encodeURIComponent([q, city, country].filter(Boolean).join(' '))
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=6&accept-language=ko&q=${text}`)
  if (!res.ok) return []
  const hits = (await res.json()) as { name?: string; display_name: string; type: string; lat: string; lon: string }[]
  return hits.map((h) => ({ name: h.name || h.display_name.split(',')[0], kind: h.display_name.split(',').slice(1, 3).join(',').trim(), lat: Number(h.lat), lng: Number(h.lon) }))
}
