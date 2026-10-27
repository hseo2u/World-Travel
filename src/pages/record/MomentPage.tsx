import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, newId, TRIP_ID } from '../../db'
import Thumb from '../../components/Thumb'
import { todayIso } from '../../lib/dates'
import { nearbyPlaces, searchPlaces, type PlaceHit } from '../../lib/nearby'
import { savePhotos } from '../../lib/photos'
import { whereOn } from '../../lib/records'
import { useTrip } from '../../lib/useTrip'
import type { Day, Moment, Trip } from '../../types'
import { useLeaveGuard } from '../../components/useLeaveGuard'

function nowTime(): string {
  return new Date().toTimeString().slice(0, 5)
}

/** Loads the record, or starts a new one from the link's date and place, then hands it to the editor. */
export default function MomentPage() {
  const { momentId } = useParams()
  const [params] = useSearchParams()
  const { trip, days, loading } = useTrip()
  const stored = useLiveQuery(async () => (momentId === 'new' ? null : ((await db.moments.get(momentId ?? '')) ?? null)), [momentId])
  if (loading || !trip || stored === undefined) return null
  if (momentId !== 'new' && !stored) return <div className="page"><p className="muted">이 기록을 찾을 수 없어요.</p></div>

  const date = params.get('date') ?? todayIso()
  const lat = params.get('lat')
  const lng = params.get('lng')
  const initial: Moment = stored ?? {
    id: newId(), tripId: TRIP_ID, date, time: date === todayIso() ? nowTime() : '12:00',
    place: params.get('place') ?? '', ...whereOn(trip, days, date),
    lat: lat ? Number(lat) : undefined, lng: lng ? Number(lng) : undefined,
    rating: 0, caption: '', photoIds: [],
  }
  return <Editor key={initial.id} initial={initial} isNew={!stored} trip={trip} days={days} />
}

function Editor({ initial, isNew, trip, days }: { initial: Moment; isNew: boolean; trip: Trip; days: Day[] }) {
  const navigate = useNavigate()
  const [m, setM] = useState(initial)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<PlaceHit[]>([])
  const [status, setStatus] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  // Photos added here are only kept once the record is saved.
  const [added, setAdded] = useState<string[]>([])
  const set = (patch: Partial<Moment>) => setM({ ...m, ...patch })
  const cities = [...new Set(days.flatMap((d) => d.cities))]
  const back = () => navigate(`/record/day/${m.date}`)
  const leave = useLeaveGuard(JSON.stringify(m) !== JSON.stringify(initial), () => db.photos.bulkDelete(added))
  const done = () => {
    leave.release()
    back()
  }

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return
    const photos = await savePhotos(files, m.date)
    setAdded([...added, ...photos.map((p) => p.id)])
    setM((cur) => ({ ...cur, photoIds: [...cur.photoIds, ...photos.map((p) => p.id)] }))
    const gps = photos.find((p) => p.lat !== undefined)
    if (!m.place && gps) {
      setStatus('사진 위치 근처 장소를 찾는 중…')
      try {
        setHits((await nearbyPlaces(gps.lat!, gps.lng!)).slice(0, 6))
        setStatus('사진을 찍은 곳 근처예요')
      } catch {
        setStatus('')
      }
    }
  }

  async function search() {
    if (!query.trim()) return
    setStatus('찾는 중…')
    try {
      const found = await searchPlaces(query.trim(), m.city, m.country)
      setHits(found)
      setStatus(found.length ? '' : '찾은 곳이 없어요. 이름만 그대로 써도 돼요.')
    } catch {
      setStatus('인터넷이 안 돼서 못 찾았어요. 이름만 써두면 나중에 고칠 수 있어요.')
    }
  }

  function pick(h: PlaceHit) {
    set({ place: h.name, lat: h.lat, lng: h.lng })
    setHits([])
    setQuery('')
    setStatus('')
  }

  function changeDate(date: string) {
    if (!date) return
    set({ date, ...(isNew ? whereOn(trip, days, date) : {}) })
  }

  function changeCity(city: string) {
    const country = days.find((d) => d.cities.includes(city))?.country
    set({ city, ...(country ? { country } : {}) })
  }

  async function save() {
    const removed = initial.photoIds.filter((id) => !m.photoIds.includes(id))
    await db.transaction('rw', db.moments, db.photos, async () => {
      await db.moments.put({ ...m, place: m.place.trim() })
      await db.photos.bulkDelete(removed)
    })
    done()
  }

  // Leaving with changes asks first, and drops the photos added here.
  const cancel = back

  async function remove() {
    if (!confirmDelete) return setConfirmDelete(true)
    await db.transaction('rw', db.moments, db.photos, async () => {
      await db.moments.delete(m.id)
      await db.photos.bulkDelete([...new Set([...initial.photoIds, ...added])])
    })
    done()
  }

  return (
    <div className="page record">
      {leave.sheet}
      <header className="page-head">
        <button className="icon-btn" onClick={cancel} aria-label="닫기">✕</button>
        <h1>{isNew ? '새 기록' : m.place || '그날 사진'}</h1>
        <button className="btn primary small" onClick={save} disabled={!m.place.trim() && m.photoIds.length === 0}>저장</button>
      </header>

      <div className="editor-photos">
        {m.photoIds.map((id) => (
          <span key={id} className="ep-item">
            <Thumb id={id} className="ep-photo" />
            <button className="ep-remove" aria-label="사진 빼기" onClick={() => set({ photoIds: m.photoIds.filter((x) => x !== id) })}>×</button>
          </span>
        ))}
        <label className="ep-add" aria-label="사진 추가">
          +
          <input id="m-photos" type="file" accept="image/*" multiple hidden onChange={(e) => { void addPhotos(e.target.files); e.target.value = '' }} />
        </label>
      </div>

      <section className="card">
        <label className="field">
          <span>장소</span>
          <input id="m-place" value={m.place} onChange={(e) => set({ place: e.target.value })} placeholder="비워두면 그날 사진으로 들어가요" />
        </label>
        <div className="inline-form">
          <input id="m-search" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder={`${m.city || '도시'}에서 장소 검색`} />
          <button className="btn" onClick={search}>검색</button>
        </div>
        {status && <p className="muted">{status}</p>}
        {hits.length > 0 && (
          <ul className="plain-list hit-list">
            {hits.map((h) => (
              <li key={`${h.name}${h.lat}`}><button className="hit" onClick={() => pick(h)}><strong>{h.name}</strong>{h.kind && <span className="muted"> {h.kind}</span>}</button></li>
            ))}
          </ul>
        )}
      </section>

      <div className="field">
        <span>별점</span>
        <div className="star-input">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} className={n <= m.rating ? 'star on' : 'star'} aria-label={`${n}점`} onClick={() => set({ rating: m.rating === n ? 0 : n })}>★</button>
          ))}
        </div>
      </div>

      <label className="field">
        <span>한 줄</span>
        <textarea id="m-caption" rows={3} value={m.caption} onChange={(e) => set({ caption: e.target.value })} placeholder="하늘이 땅에 그대로 비쳤다." />
      </label>

      <div className="grid-2">
        <label className="field"><span>날짜</span><input id="m-date" type="date" value={m.date} onChange={(e) => changeDate(e.target.value)} /></label>
        <label className="field"><span>시간</span><input id="m-time" type="time" value={m.time} onChange={(e) => set({ time: e.target.value })} /></label>
      </div>
      <label className="field">
        <span>도시</span>
        <input id="m-city" list="m-cities" value={m.city} onChange={(e) => changeCity(e.target.value)} />
        <datalist id="m-cities">{cities.map((c) => <option key={c} value={c} />)}</datalist>
      </label>

      {!isNew && <button className="btn danger" onClick={remove}>{confirmDelete ? '정말 삭제 (사진도 지워져요)' : '기록 삭제'}</button>}
    </div>
  )
}
