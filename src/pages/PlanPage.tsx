import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useTrip } from '../lib/useTrip'
import { dayDate, formatShort, todayIso } from '../lib/dates'
import { TRANSPORT_ICON } from '../lib/route'
import { continentOf } from '../lib/geo'
import { db, newId, TRIP_ID } from '../db'
import DayRoute from '../components/DayRoute'
import { useLiveQuery } from 'dexie-react-hooks'

export default function PlanPage() {
  const { trip, days, loading } = useTrip()
  const navigate = useNavigate()
  const [continent, setContinent] = useState('')
  const [params] = useSearchParams()
  const target = params.get('day')
  const ready = !loading && days.length > 0
  // The country badges on home open the plan at that country's first day.
  useEffect(() => {
    if (ready && target) document.getElementById(`day-${target}`)?.scrollIntoView({ block: 'start' })
  }, [ready, target])
  const stopCount = useLiveQuery(async () => {
    const counts = new Map<string, number>()
    for (const st of await db.stops.where('tripId').equals(TRIP_ID).toArray()) counts.set(st.dayId, (counts.get(st.dayId) ?? 0) + 1)
    return counts
  }, [], new Map<string, number>())
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

  // First day of each continent and country, in travel order, for the jump bar.
  const continents: { name: string; order: number }[] = []
  const countries: { name: string; continent: string; order: number; days: number }[] = []
  for (const d of days) {
    const c = continentOf(d.country) ?? '기타'
    if (!continents.some((x) => x.name === c)) continents.push({ name: c, order: d.order })
    const last = countries.at(-1)
    if (d.country && last?.name === d.country) last.days++
    else if (d.country) countries.push({ name: d.country, continent: c, order: d.order, days: 1 })
  }
  const activeContinent = continent || continents[0]?.name
  const shownCountries = countries.filter((c) => c.continent === activeContinent)
  const todayOrder = days.findIndex((d) => dayDate(trip.startDate, d.order) === todayIso())

  function jump(order: number) {
    document.getElementById(`day-${order}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>계획</h1>
        <Link to="/map" className="btn small">🗺️ 지도</Link>
        <Link to="/plan/import" className="btn small">가져오기</Link>
      </header>
      {days.length > 0 && (
        <p className="muted">{formatShort(trip.startDate)} ~ {formatShort(endDate)} · {days.length}일 · Day를 누르면 바로 고칠 수 있어요</p>
      )}

      {days.length > 0 && (
        <nav className="jump-bar" aria-label="대륙·나라로 이동">
          <div className="chips scroll">
            {continents.map((c) => (
              <button key={c.name} className={c.name === activeContinent ? 'chip active' : 'chip'} onClick={() => { setContinent(c.name); jump(c.order) }}>
                {c.name}
              </button>
            ))}
            {todayOrder >= 0 && <button className="chip" onClick={() => jump(todayOrder)}>오늘</button>}
          </div>
          <div className="chips scroll small">
            {shownCountries.map((c) => (
              <button key={`${c.name}-${c.order}`} className="chip" onClick={() => jump(c.order)}>
                {c.name} <span className="muted">Day {c.order + 1} · {c.days}일</span>
              </button>
            ))}
          </div>
        </nav>
      )}

      <ol className="day-list">
        {days.map((d, i) => {
          const newCountry = i === 0 || d.country !== days[i - 1].country
          return (
            <li key={d.id} id={`day-${d.order}`} className="day-anchor">
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
                    {stopCount.has(d.id) && <span className="badge">📍 {stopCount.get(d.id)}곳</span>}
                    {d.buffer && <span className="badge">버퍼</span>}
                    {d.notes === '미정' && <span className="badge warn">미정</span>}
                  </div>
                </div>
                <span className="edit-hint" aria-hidden="true">✎</span>
              </Link>
            </li>
          )
        })}
      </ol>

      <button className="btn wide" onClick={addDay}>+ Day 추가</button>
    </div>
  )
}
