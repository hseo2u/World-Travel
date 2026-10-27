import { Link } from 'react-router-dom'
import { dayDate, formatShort } from '../lib/dates'
import { CONSULAR_CALL, ENTRY } from '../lib/entry'
import { TRANSPORT_LABEL } from '../lib/route'
import { googlePlaceLink } from '../lib/stops'
import type { TodayInfo } from '../lib/today'
import type { Booking, Trip } from '../types'

/** During the trip: tonight's bed, today's stops, the next move and who to call, on one card. */
export default function TodayCard({ trip, info }: { trip: Trip; info: TodayInfo }) {
  const { day, stayStop, stayBooking, stops, move } = info
  const city = day.cities.at(-1) ?? ''
  const emergency = ENTRY[day.country]?.emergency.slice(0, 2) ?? []
  const stayName = stayStop?.name || stayBooking?.title || day.lodging
  return (
    <section className="card today-card">
      <Link to={`/plan/${day.id}`} className="today-head">
        <span className="eyebrow">오늘 · Day {day.order + 1} · {formatShort(dayDate(trip.startDate, day.order))}</span>
        <strong className="today-city">{day.cities.join(' → ') || day.country}</strong>
      </Link>

      <div className="today-block">
        <div className="today-label">오늘 밤 숙소</div>
        {stayName ? (
          <div className="today-row">
            <span className="today-main">
              <strong>{stayName}</strong>
              {stayBooking && <BookingLine b={stayBooking} />}
            </span>
            {stayStop && <a className="btn small" href={googlePlaceLink(stayStop, city)} target="_blank" rel="noreferrer">지도</a>}
          </div>
        ) : (
          <Link to={`/plan/${day.id}/stop/new`} className="muted">아직 정하지 않았어요 · 숙소 넣기</Link>
        )}
      </div>

      {stops.filter((s) => s.kind !== 'stay').length > 0 && (
        <div className="today-block">
          <div className="today-label">오늘 갈 곳</div>
          <ol className="today-stops">
            {stops.map((s, i) => s.kind === 'stay' ? null : (
              <li key={s.id}>
                <span className="stop-num">{i + 1}</span>
                <span>{s.time && <span className="stop-time">{s.time}</span>}{s.name}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {move && (
        <div className="today-block">
          <div className="today-label">{move.day.id === day.id ? '오늘 이동' : `다음 이동 · ${formatShort(dayDate(trip.startDate, move.day.order))}`}</div>
          <div className="today-main">
            <strong>{move.day.cities.join(' → ')}</strong>
            <span className="muted">
              {move.day.transport ? TRANSPORT_LABEL[move.day.transport] : '이동 수단 미정'}
              {move.booking?.flight?.departs && ` · ${move.booking.flight.departs.slice(11, 16)} 출발`}
            </span>
            {move.booking ? <BookingLine b={move.booking} /> : <Link to="/book" className="muted">예약 정보 없음 · 예약 탭에서 넣기</Link>}
          </div>
        </div>
      )}

      <div className="today-block">
        <div className="today-label">긴급 전화 · {day.country}</div>
        <ul className="today-sos">
          {emergency.map(([label, num]) => <li key={label}><span>{label}</span><a href={`tel:${num}`}>{num}</a></li>)}
          <li><span>영사콜센터</span><a href={`tel:${CONSULAR_CALL}`}>{CONSULAR_CALL}</a></li>
        </ul>
      </div>
    </section>
  )
}

function BookingLine({ b }: { b: Booking }) {
  if (b.status === 'needed') return <Link to={`/book/${b.id}`} className="pill">예약 필요</Link>
  const parts = [b.bookedVia, b.confirmation && `예약번호 ${b.confirmation}`].filter(Boolean)
  return <Link to={`/book/${b.id}`} className="muted today-booking">{parts.length ? parts.join(' · ') : '예약 완료'}</Link>
}
