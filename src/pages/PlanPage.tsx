import { Link, useNavigate } from 'react-router-dom'
import { useTrip } from '../lib/useTrip'
import { dayDate, formatShort } from '../lib/dates'
import { TRANSPORT_ICON } from '../lib/route'
import { db, newId, TRIP_ID } from '../db'
import DayRoute from '../components/DayRoute'

export default function PlanPage() {
  const { trip, days, loading } = useTrip()
  const navigate = useNavigate()
  if (loading || !trip) return null

  async function addDay() {
    const last = days.at(-1)
    const id = newId()
    await db.days.add({
      id, tripId: TRIP_ID, order: days.length,
      country: last?.country ?? '', cities: last?.cities.slice(-1) ?? [],
      content: '', lodging: last?.lodging && !last.lodging.startsWith('X') ? last.lodging : '', notes: '', buffer: false,
    })
    navigate(`/plan/${id}`)
  }

  const endDate = days.length ? dayDate(trip.startDate, days.length - 1) : trip.startDate

  return (
    <div className="page">
      <header className="page-head">
        <h1>계획</h1>
        <Link to="/plan/import" className="btn small">가져오기</Link>
      </header>
      {days.length > 0 && (
        <p className="muted">{formatShort(trip.startDate)} ~ {formatShort(endDate)} · {days.length}일</p>
      )}

      <ol className="day-list">
        {days.map((d, i) => {
          const newCountry = i === 0 || d.country !== days[i - 1].country
          return (
            <li key={d.id}>
              {newCountry && <div className="country-head">{d.country || '나라 미정'}</div>}
              <Link to={`/plan/${d.id}`} className={`day-row${d.cities.length > 1 ? ' moving' : ''}`}>
                <div className="day-num">
                  <strong>Day {d.order + 1}</strong>
                  <span>{formatShort(dayDate(trip.startDate, d.order))}</span>
                </div>
                <div className="day-body">
                  <DayRoute day={d} />
                  {d.content && <div className="day-content">{d.content.split('\n')[0]}</div>}
                  <div className="day-meta">
                    {d.transport && <span>{TRANSPORT_ICON[d.transport]}</span>}
                    {d.lodging && <span>🛏️ {d.lodging}</span>}
                    {d.buffer && <span className="badge">버퍼</span>}
                    {d.notes === '미정' && <span className="badge warn">미정</span>}
                  </div>
                </div>
              </Link>
            </li>
          )
        })}
      </ol>

      <button className="btn wide" onClick={addDay}>+ Day 추가</button>
    </div>
  )
}
