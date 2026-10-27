import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, newId, TRIP_ID } from '../db'
import { searchPlaces, type PlaceHit } from '../lib/nearby'
import { parseGoogleMaps, STOP_KIND_ICON, STOP_KIND_LABEL } from '../lib/stops'
import { useTrip } from '../lib/useTrip'
import type { Day, PlanStop, StopKind } from '../types'
import { useLeaveGuard } from '../components/useLeaveGuard'

const KINDS = Object.keys(STOP_KIND_LABEL) as StopKind[]

/** Loads the stop, or starts a new one at the end of the day, then hands it to the editor. */
export default function StopPage() {
  const { dayId, stopId } = useParams()
  const { days, loading } = useTrip()
  const stored = useLiveQuery(async () => (stopId === 'new' ? null : ((await db.stops.get(stopId ?? '')) ?? null)), [stopId])
  const last = useLiveQuery(async () => (await db.stops.where('dayId').equals(dayId ?? '').sortBy('order')).at(-1) ?? null, [dayId])
  const day = days.find((d) => d.id === dayId)
  if (loading || stored === undefined || last === undefined) return null
  if (!day || (stopId !== 'new' && !stored)) return <div className="page"><p className="muted">이 장소를 찾을 수 없어요.</p></div>

  const initial: PlanStop = stored ?? {
    id: newId(), tripId: TRIP_ID, dayId: day.id, order: (last?.order ?? -1) + 1,
    kind: last ? 'sight' : 'stay', name: '', time: '', memo: '',
  }
  return <StopEditor key={initial.id} initial={initial} isNew={!stored} day={day} />
}

function StopEditor({ initial, isNew, day }: { initial: PlanStop; isNew: boolean; day: Day }) {
  const navigate = useNavigate()
  const [s, setS] = useState(initial)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<PlaceHit[]>([])
  const [status, setStatus] = useState('')
  const [paste, setPaste] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const set = (patch: Partial<PlanStop>) => setS({ ...s, ...patch })
  const city = day.cities.at(-1) ?? ''
  const back = () => navigate(`/plan/${day.id}`)
  const leave = useLeaveGuard(JSON.stringify(s) !== JSON.stringify(initial))
  const done = () => {
    leave.release()
    back()
  }

  async function search() {
    if (!query.trim()) return
    setStatus('찾는 중…')
    try {
      const found = await searchPlaces(query.trim(), city, day.country)
      setHits(found)
      setStatus(found.length ? '' : '찾은 곳이 없어요. 구글맵 링크를 붙여넣거나 이름만 써도 돼요.')
    } catch {
      setStatus('인터넷이 안 돼서 못 찾았어요. 이름만 써두고 나중에 위치를 넣어도 돼요.')
    }
  }

  function pick(h: PlaceHit) {
    set({ name: h.name, lat: h.lat, lng: h.lng, url: undefined })
    setHits([])
    setQuery('')
    setStatus('')
  }

  function readLink(text: string) {
    setPaste(text)
    const p = parseGoogleMaps(text)
    if (!p.url) return
    set({ name: p.name ?? s.name, lat: p.lat, lng: p.lng, url: p.url })
    setStatus(p.lat !== undefined ? '구글맵 위치를 넣었어요.' : '구글맵 링크를 넣었어요. 이름이 비었으면 직접 써주세요.')
  }

  async function save() {
    await db.stops.put({ ...s, name: s.name.trim() })
    done()
  }

  async function remove() {
    if (!confirmDelete) return setConfirmDelete(true)
    await db.stops.delete(s.id)
    done()
  }

  return (
    <div className="page">
      {leave.sheet}
      <header className="page-head">
        <button className="icon-btn" onClick={back} aria-label="닫기">✕</button>
        <h1>{isNew ? 'Day ' + (day.order + 1) + ' 장소 추가' : s.name || '장소'}</h1>
        <button className="btn primary small" onClick={save} disabled={!s.name.trim()}>저장</button>
      </header>

      <div className="chips">
        {KINDS.map((k) => (
          <button key={k} className={s.kind === k ? 'chip active' : 'chip'} onClick={() => set({ kind: k })}>{STOP_KIND_ICON[k]} {STOP_KIND_LABEL[k]}</button>
        ))}
      </div>

      <section className="card">
        <h2>장소 찾기</h2>
        <div className="inline-form">
          <input id="st-search" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder={`${city}에서 검색 (예: Pariwana Hostel)`} />
          <button className="btn" onClick={search}>검색</button>
        </div>
        {hits.length > 0 && (
          <ul className="plain-list hit-list">
            {hits.map((h) => (
              <li key={`${h.name}${h.lat}`}><button className="hit" onClick={() => pick(h)}><strong>{h.name}</strong>{h.kind && <span className="muted"> {h.kind}</span>}</button></li>
            ))}
          </ul>
        )}
        <label className="field">
          <span>또는 구글맵에서 공유한 링크 붙여넣기</span>
          <textarea id="st-paste" rows={2} value={paste} onChange={(e) => readLink(e.target.value)} placeholder="구글맵 앱 › 장소 › 공유 › 복사" />
        </label>
        {status && <p className="muted">{status}</p>}
      </section>

      <label className="field"><span>이름</span><input id="st-name" value={s.name} onChange={(e) => set({ name: e.target.value })} /></label>
      {(s.lat !== undefined || s.url) && (
        <p className="muted">📍 {s.lat !== undefined ? `위치 저장됨 (${s.lat.toFixed(4)}, ${s.lng!.toFixed(4)})` : '구글맵 링크 저장됨'}</p>
      )}
      <label className="field"><span>시간 (선택)</span><input id="st-time" type="time" value={s.time} onChange={(e) => set({ time: e.target.value })} /></label>
      <label className="field">
        <span>메모</span>
        <textarea id="st-memo" rows={3} value={s.memo} onChange={(e) => set({ memo: e.target.value })} placeholder="입장료 15솔, 일몰 6시 반, 체크인 2시" />
      </label>

      {!isNew && <button className="btn danger" onClick={remove}>{confirmDelete ? '정말 삭제' : '삭제'}</button>}
    </div>
  )
}
