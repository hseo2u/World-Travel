import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db, newId, renumberDays, TRIP_ID } from '../db'
import { useTrip } from '../lib/useTrip'
import { dayDate, formatShort } from '../lib/dates'
import { parseCities } from '../lib/importPlan'
import { TRANSPORT_LABEL } from '../lib/route'
import DayStops from '../components/DayStops'
import type { Day, Transport } from '../types'

const TRANSPORTS = Object.keys(TRANSPORT_LABEL) as Transport[]

export default function DayPage() {
  const { dayId } = useParams()
  const navigate = useNavigate()
  const { trip, days, loading } = useTrip()
  const day = days.find((d) => d.id === dayId)
  const [route, setRoute] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (day) setRoute(day.cities.join(' > '))
    setConfirmDelete(false)
    // Only reset the text box when moving to another day, not on every save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day?.id])

  if (loading || !trip) return null
  if (!day) return <div className="page"><p>이 Day를 찾을 수 없어요.</p><Link to="/plan">계획으로</Link></div>

  const save = (patch: Partial<Day>) => db.days.update(day.id, patch)

  function saveRoute(text: string) {
    setRoute(text)
    const cities = parseCities(text)
    void save({
      cities,
      transport: cities.length > 1 ? (day!.transport ?? 'unknown') : undefined,
    })
  }

  async function move(delta: number) {
    const other = days.find((d) => d.order === day!.order + delta)
    if (!other) return
    await db.transaction('rw', db.days, async () => {
      await db.days.update(day!.id, { order: other.order })
      await db.days.update(other.id, { order: day!.order })
    })
  }

  async function insertAfter() {
    const id = newId()
    await db.transaction('rw', db.days, async () => {
      for (const d of days) if (d.order > day!.order) await db.days.update(d.id, { order: d.order + 1 })
      await db.days.add({
        id, tripId: TRIP_ID, order: day!.order + 1, country: day!.country,
        cities: day!.cities.slice(-1), content: '', lodging: '', notes: '', buffer: false,
      })
    })
    navigate(`/plan/${id}`)
  }

  async function remove() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setConfirmDelete(false)
    await db.transaction('rw', db.days, db.stops, async () => {
      await db.days.delete(day!.id)
      await db.stops.where('dayId').equals(day!.id).delete()
    })
    await renumberDays(TRIP_ID)
    navigate('/plan')
  }

  return (
    <div className="page">
      <header className="page-head">
        <button className="icon-btn" onClick={() => navigate('/plan')} aria-label="뒤로">←</button>
        <h1>Day {day.order + 1}</h1>
        <span className="muted">{formatShort(dayDate(trip.startDate, day.order))}</span>
      </header>

      <label className="field">
        <span>나라</span>
        <input value={day.country} onChange={(e) => save({ country: e.target.value })} />
      </label>
      <label className="field">
        <span>도시 (이동하면 "리마 &gt; 와라즈")</span>
        <input value={route} onChange={(e) => saveRoute(e.target.value)} />
      </label>
      {day.cities.length > 1 && (
        <label className="field">
          <span>이동 수단</span>
          <select value={day.transport ?? 'unknown'} onChange={(e) => save({ transport: e.target.value as Transport })}>
            {TRANSPORTS.map((t) => <option key={t} value={t}>{TRANSPORT_LABEL[t]}</option>)}
          </select>
        </label>
      )}
      <DayStops day={day} prevDay={days.find((d) => d.order === day.order - 1)} />

      <label className="field">
        <span>내용</span>
        <textarea rows={3} value={day.content} onChange={(e) => save({ content: e.target.value })} />
      </label>
      <label className="field">
        <span>숙박</span>
        <input value={day.lodging} onChange={(e) => save({ lodging: e.target.value })} />
      </label>
      <label className="field">
        <span>기타 (소요시간, 메모)</span>
        <textarea rows={2} value={day.notes} onChange={(e) => save({ notes: e.target.value })} />
      </label>
      <label className="check">
        <input type="checkbox" checked={day.buffer} onChange={(e) => save({ buffer: e.target.checked })} />
        <span>날씨·지연 대비 버퍼일</span>
      </label>

      <div className="btn-row">
        <button className="btn" onClick={() => move(-1)} disabled={day.order === 0}>↑ 앞으로</button>
        <button className="btn" onClick={() => move(1)} disabled={day.order === days.length - 1}>↓ 뒤로</button>
        <button className="btn" onClick={insertAfter}>+ 다음에 하루 추가</button>
      </div>
      <div className="btn-row">
        <Link className="btn" to={`/ai?day=${day.id}`}>AI에게 이 날 물어보기</Link>
        <button className="btn danger" onClick={remove}>{confirmDelete ? '정말 삭제' : '삭제'}</button>
      </div>
      {confirmDelete && <p className="muted">한 번 더 누르면 삭제되고 뒤의 날짜가 하루씩 당겨져요.</p>}
    </div>
  )
}
