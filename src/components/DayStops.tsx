import { Link } from 'react-router-dom'
import { db, newId, TRIP_ID } from '../db'
import { googlePlaceLink, googleRouteLink, STOP_KIND_ICON } from '../lib/stops'
import { useStops } from '../lib/useStops'
import type { Day, PlanStop } from '../types'

/** The day's detailed plan: where to sleep and where to go, in order. */
export default function DayStops({ day, prevDay }: { day: Day; prevDay?: Day }) {
  const stops = useStops(day.id)
  const prevStops = useStops(prevDay?.id)
  const city = day.cities.at(-1) ?? ''
  const route = googleRouteLink(stops, city)
  const hasStay = stops.some((s) => s.kind === 'stay')
  // The same hostel night after night: offer yesterday's instead of searching again.
  const lastStay = prevStops.findLast((s) => s.kind === 'stay')

  async function swap(a: PlanStop, b: PlanStop) {
    await db.transaction('rw', db.stops, async () => {
      await db.stops.update(a.id, { order: b.order })
      await db.stops.update(b.id, { order: a.order })
    })
  }

  async function copyStay() {
    const { id: _id, dayId: _dayId, order: _order, time: _time, ...rest } = lastStay!
    await db.stops.add({ ...rest, id: newId(), tripId: TRIP_ID, dayId: day.id, order: (stops.at(-1)?.order ?? -1) + 1, time: '' })
  }

  return (
    <section className="card day-stops">
      <div className="ds-head">
        <h2>세부 일정</h2>
        {route && <a className="btn small" href={route} target="_blank" rel="noreferrer">구글맵 경로</a>}
      </div>
      {stops.length === 0 && <p className="muted">숙소, 갈 곳, 먹을 곳을 순서대로 넣어보세요. 구글맵에서 공유한 링크를 붙여넣어도 돼요.</p>}
      <ol className="stop-list">
        {stops.map((s, i) => (
          <li key={s.id} className="stop-row">
            <span className="stop-icon" aria-hidden="true">{STOP_KIND_ICON[s.kind]}</span>
            <Link to={`/plan/${day.id}/stop/${s.id}`} className="stop-body">
              <span className="stop-name">{s.time && <span className="stop-time">{s.time}</span>}{s.name || '(이름 없음)'}</span>
              {s.memo && <span className="muted stop-memo">{s.memo}</span>}
            </Link>
            <a className="icon-btn small-icon" href={googlePlaceLink(s, city)} target="_blank" rel="noreferrer" aria-label={`${s.name} 구글맵에서 열기`}>↗</a>
            <span className="stop-move">
              <button className="icon-btn small-icon" aria-label="위로" disabled={i === 0} onClick={() => swap(s, stops[i - 1])}>↑</button>
              <button className="icon-btn small-icon" aria-label="아래로" disabled={i === stops.length - 1} onClick={() => swap(s, stops[i + 1])}>↓</button>
            </span>
          </li>
        ))}
      </ol>
      <div className="btn-row">
        <Link className="btn primary" to={`/plan/${day.id}/stop/new`}>+ 장소 추가</Link>
        {!hasStay && lastStay && <button className="btn" onClick={copyStay}>🛏️ 어제 숙소 그대로: {lastStay.name}</button>}
      </div>
    </section>
  )
}
