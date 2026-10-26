import { Link } from 'react-router-dom'
import { useTrip } from '../lib/useTrip'
import { dayDate, daysBetween, formatShort, todayIso } from '../lib/dates'
import { TRANSPORT_ICON, TRANSPORT_LABEL } from '../lib/route'
import DayRoute from '../components/DayRoute'
import SpendSummaryCard from '../components/SpendSummaryCard'
import { summarize } from '../lib/money'
import { dueSoon, KIND_ICON } from '../lib/bookings'
import { useBookingSync, useBookings, useMoney } from '../lib/useData'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, TRIP_ID } from '../db'

export default function HomePage() {
  const { trip, days, loading } = useTrip()
  const { expenses } = useMoney()
  const bookings = useBookings()
  const pack = useLiveQuery(() => db.packItems.where('tripId').equals(TRIP_ID).toArray(), [], [])
  useBookingSync(trip, days)
  if (loading || !trip) return null

  const today = todayIso()
  const untilStart = daysBetween(today, trip.startDate)
  const currentOrder = untilStart > 0 ? 0 : -untilStart
  const focus = days.find((d) => d.order === currentOrder) ?? days[0]
  const nextMove = days.find((d) => d.order >= currentOrder && d.cities.length > 1)
  const countries = new Set(days.map((d) => d.country).filter(Boolean))
  const due = dueSoon(bookings, today, 14)

  return (
    <div className="page">
      <header className="page-head">
        <h1>{trip.name}</h1>
        <Link to="/settings" className="icon-btn" aria-label="설정">⚙️</Link>
      </header>

      <section className="hero-card">
        {untilStart > 0 ? (
          <>
            <div className="hero-big">D-{untilStart}</div>
            <div className="muted">{formatShort(trip.startDate)} 출국</div>
          </>
        ) : (
          <>
            <div className="hero-big">Day {currentOrder + 1}</div>
            <div className="muted">여행 {currentOrder + 1}일째</div>
          </>
        )}
        <div className="hero-stats">
          <span>{days.length}일</span>
          <span>{countries.size}개국</span>
          <span>예산 {Math.round(trip.budgetKrw / 10_000).toLocaleString()}만 원</span>
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
          {focus && (
            <Link to={`/plan/${focus.id}`} className="card link-card">
              <div className="eyebrow">{untilStart > 0 ? '첫날' : '오늘'} · Day {focus.order + 1} · {formatShort(dayDate(trip.startDate, focus.order))}</div>
              <DayRoute day={focus} />
              {focus.content && <p className="pre">{focus.content}</p>}
              {focus.lodging && <div className="muted">🛏️ {focus.lodging}</div>}
            </Link>
          )}
          {nextMove && nextMove.id !== focus?.id && (
            <Link to={`/plan/${nextMove.id}`} className="card link-card">
              <div className="eyebrow">다음 이동 · Day {nextMove.order + 1} · {formatShort(dayDate(trip.startDate, nextMove.order))}</div>
              <DayRoute day={nextMove} />
              {nextMove.transport && (
                <div className="muted">{TRANSPORT_ICON[nextMove.transport]} {TRANSPORT_LABEL[nextMove.transport]}{nextMove.notes ? ` · ${nextMove.notes}` : ''}</div>
              )}
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
          <Link to="/pack" className="card link-card">
            <div className="eyebrow">🎒 준비물</div>
            {pack.length === 0 ? (
              <div>장기여행 기본 목록으로 시작해요. 여행 중에 필요해진 것도 여기에 적어두세요.</div>
            ) : (
              <>
                <div>{pack.filter((i) => i.done).length} / {pack.length} 챙김{pack.some((i) => i.onTrip && !i.done) ? ` · 살 것 ${pack.filter((i) => i.onTrip && !i.done).length}개` : ''}</div>
                <div className="bar"><i style={{ width: `${(pack.filter((i) => i.done).length / pack.length) * 100}%` }} /></div>
              </>
            )}
          </Link>
          <Link to="/ai" className="card link-card ai-card">
            <div className="eyebrow">AI에게 물어보기</div>
            <div>계획 점검, 미리 할 예약, 이동 방법을 물어볼 질문을 만들어 복사해줘요.</div>
          </Link>
        </>
      )}
    </div>
  )
}
