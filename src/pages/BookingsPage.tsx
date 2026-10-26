import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { db, newId, TRIP_ID } from '../db'
import { coverage, KIND_ICON, KIND_LABEL } from '../lib/bookings'
import { dayDate, formatShort, todayIso } from '../lib/dates'
import { useBookingSync, useBookings } from '../lib/useData'
import { useTrip } from '../lib/useTrip'
import type { Booking, BookingKind } from '../types'

type Filter = 'todo' | 'all' | BookingKind

export default function BookingsPage() {
  const { trip, days, loading } = useTrip()
  const bookings = useBookings()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('todo')
  useBookingSync(trip, days)
  if (loading || !trip) return null

  const orderOf = new Map(days.map((d) => [d.id, d.order]))
  const today = todayIso()
  const sorted = [...bookings].sort((a, b) => (orderOf.get(a.dayId) ?? 1e9) - (orderOf.get(b.dayId) ?? 1e9))
  const shown = sorted.filter((b) =>
    filter === 'todo' ? b.status === 'needed' : filter === 'all' ? true : b.kind === filter,
  )

  async function toggle(b: Booking) {
    await db.bookings.update(b.id, { status: b.status === 'booked' ? 'needed' : 'booked' })
  }

  async function addFlight() {
    const id = newId()
    await db.bookings.add({
      id, tripId: TRIP_ID, kind: 'flight', title: '새 항공편', status: 'booked', dayId: days[0]?.id ?? '',
      bookedVia: '', confirmation: '', memo: '',
      flight: { flightNo: '', from: '', to: '', departs: '', arrives: '' },
    })
    navigate(`/book/${id}`)
  }

  async function addOther() {
    const id = newId()
    await db.bookings.add({
      id, tripId: TRIP_ID, kind: 'activity', title: '', status: 'needed', dayId: days[0]?.id ?? '',
      bookedVia: '', confirmation: '', memo: '',
    })
    navigate(`/book/${id}`)
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>예약</h1>
        <button className="btn small" onClick={addFlight}>+ 항공편</button>
        <button className="btn small" onClick={addOther}>+ 직접 추가</button>
      </header>
      <p className="muted">계획표에서 숙소, 이동, 투어를 찾아 예약할 목록을 자동으로 만들어요. 예약하면 체크하고 어디서 했는지 남겨두세요.</p>

      <section className="coverage">
        {coverage(bookings).map((c) => (
          <button key={c.kind} className={`cov${filter === c.kind ? ' active' : ''}`} onClick={() => setFilter(filter === c.kind ? 'todo' : c.kind)}>
            <span className="cov-label">{KIND_ICON[c.kind]} {KIND_LABEL[c.kind]}</span>
            <span className="cov-num">{c.done}<span className="muted">/{c.total}{c.kind === 'stay' ? '박' : ''}</span></span>
            <span className="bar"><i style={{ width: `${c.total ? (c.done / c.total) * 100 : 0}%` }} /></span>
          </button>
        ))}
      </section>

      <div className="chips">
        {(['todo', 'all'] as Filter[]).map((f) => (
          <button key={f} className={filter === f ? 'chip active' : 'chip'} onClick={() => setFilter(f)}>
            {f === 'todo' ? `해야 할 예약 ${bookings.filter((b) => b.status === 'needed').length}` : '전체'}
          </button>
        ))}
      </div>

      <ul className="booking-list">
        {shown.map((b) => {
          const order = orderOf.get(b.dayId)
          const overdue = b.status === 'needed' && b.dueDate && b.dueDate < today
          return (
            <li key={b.id} className={`booking-row ${b.status}`}>
              <button
                className={`check-btn${b.status === 'booked' ? ' on' : ''}`}
                aria-label={b.status === 'booked' ? '예약 안 함으로 바꾸기' : '예약 완료로 체크'}
                onClick={() => toggle(b)}
              >
                {b.status === 'booked' ? '✓' : ''}
              </button>
              <Link to={`/book/${b.id}`} className="booking-body">
                <div className="booking-title">{KIND_ICON[b.kind]} {b.title || '(이름 없음)'}</div>
                <div className="day-meta">
                  {order !== undefined && <span>Day {order + 1} · {formatShort(dayDate(trip.startDate, order))}{b.nights ? ` · ${b.nights}박` : ''}</span>}
                  {b.status === 'booked' && b.bookedVia && <span>{b.bookedVia}</span>}
                  {b.status === 'needed' && b.dueDate && (
                    <span className={overdue ? 'badge danger' : 'badge'}>{overdue ? '마감 지남' : '예약 마감'} {formatShort(b.dueDate)}</span>
                  )}
                  {b.status === 'skipped' && <span className="badge">필요 없음</span>}
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
      {shown.length === 0 && <p className="muted">이 목록에는 예약이 없어요.</p>}
    </div>
  )
}
