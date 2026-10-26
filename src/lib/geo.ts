import { db } from '../db'
import type { Place } from '../types'

export type Continent = '남미' | '유럽' | '아프리카' | '아시아' | '북미' | '오세아니아'

const CONTINENT_OF: Record<string, Continent> = {
  페루: '남미', 볼리비아: '남미', 칠레: '남미', 아르헨티나: '남미', 우루과이: '남미', 브라질: '남미', 파라과이: '남미',
  콜롬비아: '남미', 에콰도르: '남미',
  포르투갈: '유럽', 스페인: '유럽', 프랑스: '유럽', 영국: '유럽', 네덜란드: '유럽', 벨기에: '유럽', 독일: '유럽',
  오스트리아: '유럽', 체코: '유럽', 헝가리: '유럽', 이탈리아: '유럽', 스위스: '유럽', 모나코: '유럽', 튀르키예: '유럽',
  모로코: '아프리카', 이집트: '아프리카',
}

export function continentOf(country: string): Continent | undefined {
  return CONTINENT_OF[country.trim()]
}

/** Spaces and spelling variants removed, so "푸랑크 푸르트" and "프랑크푸르트" match. */
export function cityKey(name: string): string {
  const k = name.replace(/\s+/g, '')
  return ALIASES[k] ?? k
}

const ALIASES: Record<string, string> = {
  푸랑크푸르트: '프랑크푸르트',
  퀼른: '쾰른',
  리우: '리우데자네이루',
  이카: '이카와카치나',
  와카치나: '이카와카치나',
  아타카마: '산페드로데아타카마',
  산마르틴: '산마르틴데로스안데스',
  라파스: '라파즈',
  빈: '비엔나',
  베니스: '베네치아',
}

// Approximate city centres for the planned route, so the map works with no network.
// [lat, lng]
const BUILTIN: Record<string, [number, number]> = {
  리마: [-12.046, -77.043], 와라즈: [-9.527, -77.528], 푼타에르모사: [-12.336, -76.824],
  이카와카치나: [-14.087, -75.763], 아레키파: [-16.409, -71.537], 쿠스코: [-13.532, -71.967],
  오얀따이땀뽀: [-13.258, -72.263], 아구아스깔리엔테스: [-13.155, -72.525], 푸에르토말도나도: [-12.593, -69.189],
  푸노: [-15.840, -70.022],
  코파카바나: [-16.166, -69.086], 라파즈: [-16.500, -68.150], 수크레: [-19.035, -65.259], 우유니: [-20.460, -66.825],
  산페드로데아타카마: [-22.911, -68.200], 카라마: [-22.456, -68.929], 산티아고: [-33.449, -70.669], 푸콘: [-39.272, -71.978],
  산마르틴데로스안데스: [-40.157, -71.353], 바릴로체: [-41.133, -71.310], 엘칼라파테: [-50.338, -72.265],
  엘찬텐: [-49.331, -72.886], 우수아이아: [-54.801, -68.303], 부에노스아이레스: [-34.604, -58.382],
  푸에르토이과수: [-25.598, -54.573], 콜로니아: [-34.471, -57.844], 몬테비데오: [-34.901, -56.164],
  포즈두이과수: [-25.516, -54.585], 시우다드델에스테: [-25.509, -54.611], 리우데자네이루: [-22.907, -43.173],
  일랴그란지: [-23.141, -44.169], 파라치: [-23.217, -44.713],
  리스본: [38.722, -9.139], 신트라: [38.800, -9.378], 포르투: [41.158, -8.629],
  마드리드: [40.417, -3.704], 세비야: [37.389, -5.984], 그라나다: [37.177, -3.599], 바르셀로나: [41.385, 2.173],
  산세바스티안: [43.318, -1.981],
  파리: [48.857, 2.352], 지베르니: [49.075, 1.534], 리옹: [45.764, 4.836], 안시: [45.899, 6.129], 샤모니: [45.924, 6.870],
  니스: [43.710, 7.262], 모나코: [43.738, 7.425],
  런던: [51.507, -0.128], 에든버러: [55.953, -3.188], 뉴캐슬: [54.978, -1.618],
  암스테르담: [52.370, 4.895], 잔세스칸스: [52.474, 4.818], 쾨켄호프: [52.270, 4.546],
  브뤼셀: [50.850, 4.352], 브뤼헤: [51.209, 3.225],
  쾰른: [50.938, 6.960], 함부르크: [53.551, 9.994], 프랑크푸르트: [50.110, 8.682], 하이델베르크: [49.399, 8.672],
  베를린: [52.520, 13.405], 뮌헨: [48.135, 11.582],
  잘츠부르크: [47.810, 13.055], 비엔나: [48.208, 16.373], 프라하: [50.076, 14.438], 체스키크룸로프: [48.811, 14.315],
  부다페스트: [47.498, 19.040], 베네치아: [45.441, 12.316], 피렌체: [43.770, 11.256], 로마: [41.903, 12.496],
  밀라노: [45.464, 9.190], 이스탄불: [41.008, 28.978],
}

export function builtinPlace(name: string, country: string): Place | undefined {
  const key = cityKey(name)
  const c = BUILTIN[key]
  return c ? { key, name, country, lat: c[0], lng: c[1], source: 'builtin' } : undefined
}

/** Looks a city up: saved places first, then the built-in table. */
export async function findPlace(name: string, country: string): Promise<Place | undefined> {
  const key = cityKey(name)
  return (await db.places.get(key)) ?? builtinPlace(name, country)
}

/**
 * Asks OpenStreetMap's Nominatim for a city's coordinates and saves the result.
 * Nominatim allows about one request per second, so callers must space calls out.
 */
export async function geocode(name: string, country: string): Promise<Place | undefined> {
  const q = encodeURIComponent(`${name} ${country}`.trim())
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=ko&q=${q}`)
  if (!res.ok) return undefined
  const hits = (await res.json()) as { lat: string; lon: string }[]
  if (!hits.length) return undefined
  const place: Place = {
    key: cityKey(name), name, country,
    lat: Number(hits[0].lat), lng: Number(hits[0].lon), source: 'geocoded',
  }
  await db.places.put(place)
  return place
}
