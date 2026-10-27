import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db, newId, renumberDays, TRIP_ID } from '../db'
import { useDraft } from '../lib/useDraft'
import { useTrip } from '../lib/useTrip'
import { dayDate, formatShort } from '../lib/dates'
import { parseCities } from '../lib/importPlan'
import { TRANSPORT_LABEL } from '../lib/route'
import DayStops from '../components/DayStops'
import type { Transport } from '../types'
import { useLeaveGuard } from '../components/useLeaveGuard'

const TRANSPORTS = Object.keys(TRANSPORT_LABEL) as Transport[]

export default function DayPage() {
  const { dayId } = useParams()
  const navigate = useNavigate()
  const { trip, days, loading } = useTrip()
  const day = days.find((d) => d.id === dayId)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const saved = day && {
    country: day.country, route: day.cities.join(' > '), transport: day.transport ?? 'unknown',
    content: day.content, lodging: day.lodging, notes: day.notes, buffer: day.buffer,
  }
  const { draft: f, set, dirty } = useDraft(saved, day?.id ?? '')
  const leave = useLeaveGuard(dirty)

  if (loading || !trip) return null
  if (!day) return <div className="page"><p>이 Day를 찾을 수 없어요.</p><Link to="/plan">계획으로</Link></div>

  const form = f!
  const cities = parseCities(form.route)

  async function save() {
    const { route: _route, ...rest } = form
    await db.days.update(day!.id, { ...rest, cities, transport: cities.length > 1 ? form.transport : undefined })
    leave.release()
    navigate('/plan')
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
    leave.release()
    navigate('/plan')
  }

  return (
    <div className="page">
      {leave.sheet}
      <header className="page-head">
        <button className="icon-btn" onClick={() => navigate('/plan')} aria-label="뒤로">←</button>
        <h1>Day {day.order + 1}</h1>
        <span className="muted">{formatShort(dayDate(trip.startDate, day.order))}</span>
        <button className="btn primary small" onClick={save} disabled={!dirty}>저장</button>
      </header>
      {dirty && <p className="muted">저장을 눌러야 바뀐 내용이 반영돼요.</p>}

      <label className="field">
        <span>나라</span>
        <input value={form.country} onChange={(e) => set({ country: e.target.value })} />
      </label>
      <label className="field">
        <span>도시 (이동하면 "리마 &gt; 와라즈")</span>
        <input value={form.route} onChange={(e) => set({ route: e.target.value })} />
      </label>
      {cities.length > 1 && (
        <label className="field">
          <span>이동 수단</span>
          <select value={form.transport} onChange={(e) => set({ transport: e.target.value as Transport })}>
            {TRANSPORTS.map((t) => <option key={t} value={t}>{TRANSPORT_LABEL[t]}</option>)}
          </select>
        </label>
      )}
      <DayStops day={day} prevDay={days.find((d) => d.order === day.order - 1)} />

      <label className="field">
        <span>내용</span>
        <textarea rows={3} value={form.content} onChange={(e) => set({ content: e.target.value })} />
      </label>
      <label className="field">
        <span>숙박</span>
        <input value={form.lodging} onChange={(e) => set({ lodging: e.target.value })} />
      </label>
      <label className="field">
        <span>기타 (소요시간, 메모)</span>
        <textarea rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
      </label>
      <label className="check">
        <input type="checkbox" checked={form.buffer} onChange={(e) => set({ buffer: e.target.checked })} />
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
