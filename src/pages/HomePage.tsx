import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useTrip } from '../lib/useTrip'
import { dayDate, daysBetween, formatShort, todayIso } from '../lib/dates'
import { TRANSPORT_LABEL } from '../lib/route'
import SpendSummaryCard from '../components/SpendSummaryCard'
import Icon from '../components/Icon'
import { summarize } from '../lib/money'
import { dueSoon, KIND_ICON } from '../lib/bookings'
import { countryCode } from '../lib/geo'
import { countryStays } from '../lib/entry'
import { useBookingSync, useBookings, useMoney } from '../lib/useData'
import { db, TRIP_ID } from '../db'
import TodayCard from '../components/TodayCard'
import { todayInfo } from '../lib/today'
import { BACKUP_KV, daysSince } from '../lib/backup'
import { useKv } from '../lib/useKv'
import type { Day } from '../types'

function routeText(d: Day): string {
  return d.cities.join(' → ')
}

export default function HomePage() {
  const { trip, days, loading } = useTrip()
  const { expenses } = useMoney()
  const bookings = useBookings()
  const pack = useLiveQuery(() => db.packItems.where('tripId').equals(TRIP_ID).toArray(), [], [])
  const allStops = useLiveQuery(() => db.stops.where('tripId').equals(TRIP_ID).toArray(), [], [])
  const lastBackup = useKv(BACKUP_KV).at
  useBookingSync(trip, days)
  if (loading || !trip) return null

  const today = todayIso()
  const untilStart = daysBetween(today, trip.startDate)
  const currentOrder = untilStart > 0 ? 0 : -untilStart
  const focus = days.find((d) => d.order === currentOrder) ?? days[0]
  const nextMove = days.find((d) => d.order > currentOrder && d.cities.length > 1)
  const due = dueSoon(bookings, today, 14)
  const stays = countryStays(days)
  const countries = stays.filter((s, i) => stays.findIndex((x) => x.country === s.country) === i)
  const startDate = new Date(`${trip.startDate}T00:00:00`)
  const needsBooking = (d: Day) => bookings.some((b) => b.dayId === d.id && b.status === 'needed')
  const packDone = pack.filter((i) => i.done).length
  const stopCounts = new Map<string, number>()
  for (const st of allStops) stopCounts.set(st.dayId, (stopCounts.get(st.dayId) ?? 0) + 1)
  const now = todayInfo(trip, days, bookings, allStops, today)
  // Before departure the home shows the first day; from then on it moves on by itself each day.
  const first = untilStart > 0 ? todayInfo(trip, days, bookings, allStops, trip.startDate) : undefined
  const backupAge = daysSince(lastBackup)

  const dayRow = (d: Day, label: string) => (
    <Link to={`/plan/${d.id}`} className="home-row">
      <span className="home-num">{d.order + 1}</span>
      <span className="home-row-body">
        <span className="home-row-label">{label} · {formatShort(dayDate(trip.startDate, d.order))}</span>
        <strong>{routeText(d)}</strong>
        <span className="muted">
          {d.cities.length > 1 && d.transport ? TRANSPORT_LABEL[d.transport] : d.lodging ? `숙소 ${d.lodging}` : d.content.split('\n')[0]}
          {stopCounts.get(d.id) ? ` · 세부 일정 ${stopCounts.get(d.id)}곳` : ''}
        </span>
      </span>
      {needsBooking(d) && <span className="pill">예약</span>}
    </Link>
  )

  return (
    <div className="page home">
      <header className="page-head">
        <h1>{trip.name}</h1>
        <Link to="/more" className="icon-btn round" aria-label="기타"><Icon name="more" /></Link>
        <Link to="/settings" className="icon-btn round" aria-label="설정"><Icon name="settings" /></Link>
      </header>

      {countries.length > 0 && (
        <div className="stories" aria-label="나라">
          {countries.map((c) => {
            const state = c.last < currentOrder ? 'past' : c.first <= currentOrder ? 'now' : 'next'
            return (
              <Link key={c.country} to={`/plan?day=${c.first}`} className={`story ${state}`}>
                <span className="story-ring"><span className="story-dot">{countryCode(c.country)}</span></span>
                <span className="story-name">{c.country}</span>
              </Link>
            )
          })}
        </div>
      )}

      <section className="hero-card">
        <div>
          {untilStart > 0 ? (
            <>
              <div className="muted">{startDate.getMonth() + 1}월 {startDate.getDate()}일 {days[0]?.cities.at(-1) ?? ''}{days[0] ? '로' : ''}</div>
              <div className="hero-big">D-{untilStart}</div>
            </>
          ) : (
            <>
              <div className="muted">{focus ? `${focus.country} ${focus.cities.at(-1)}` : '여행 중'}</div>
              <div className="hero-big">Day {currentOrder + 1}</div>
            </>
          )}
        </div>
        <div className="hero-stats">
          <strong>{days.length}</strong>일<br />
          <strong>{countries.length}</strong>개국
        </div>
      </section>

      {days.length === 0 ? (
        <section className="card">
          <h2>계획표를 가져와 볼까요?</h2>
          <p className="muted">구글 시트나 엑셀에서 계획표를 통째로 복사해 붙여넣으면 Day별 일정이 만들어져요.</p>
          <Link to="/plan/import" className="btn primary">계획표 가져오기</Link>
        </section>
      ) : (
        <>
          {now ? (
            <TodayCard trip={trip} info={now} />
          ) : first ? (
            <TodayCard trip={trip} info={first} label="첫날 일정" />
          ) : (
            <section className="home-list">
              {focus && dayRow(focus, untilStart > 0 ? '첫날' : '오늘')}
              {nextMove && nextMove.id !== focus?.id && dayRow(nextMove, '다음 이동')}
            </section>
          )}

          {(backupAge === undefined || backupAge >= 7) && (
            <Link to="/more/backup" className="card link-card backup-nudge">
              <div className="eyebrow">백업</div>
              <span>{backupAge === undefined ? '아직 백업한 적이 없어요. 이 폰에만 저장돼 있어요.' : `마지막 백업이 ${backupAge}일 전이에요.`}</span>
              <span className="pill">지금 백업</span>
            </Link>
          )}

          {due.length > 0 && (
            <Link to="/book" className="card link-card">
              <div className="eyebrow">예약 챙기기 · 2주 안에 마감 {due.length}건</div>
              <ul className="due-list">
                {due.slice(0, 4).map((b) => (
                  <li key={b.id}>
                    <span>{KIND_ICON[b.kind]} {b.title}</span>
                    <span className={b.dueDate! < today ? 'badge danger' : 'badge'}>
                      {b.dueDate! < today ? '마감 지남' : formatShort(b.dueDate!)}
                    </span>
                  </li>
                ))}
              </ul>
              {due.length > 4 && <div className="muted">외 {due.length - 4}건</div>}
            </Link>
          )}
          <Link to="/money" className="link-card">
            <SpendSummaryCard trip={trip} summary={summarize(trip, expenses, today, days.length)} compact />
          </Link>
          <div className="home-tiles">
            <Link to="/pack" className="card link-card">
              <div className="eyebrow">준비물</div>
              <strong className="tile-big">{pack.length ? `${packDone}/${pack.length}` : '시작'}</strong>
              {pack.length > 0 && <span className="bar"><i style={{ width: `${(packDone / pack.length) * 100}%` }} /></span>}
            </Link>
            <Link to="/ai" className="card link-card ai-card">
              <div className="eyebrow">AI에게 물어보기</div>
              <span className="tile-text">계획 점검·이동 방법 질문 만들기</span>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
