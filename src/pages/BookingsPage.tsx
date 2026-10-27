import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '../db'
import { coverage, KIND_ICON, KIND_LABEL } from '../lib/bookings'
import { dayDate, formatShort, todayIso } from '../lib/dates'
import { useBookingSync, useBookings } from '../lib/useData'
import { useTrip } from '../lib/useTrip'
import type { Booking, BookingKind } from '../types'

type Status = 'todo' | 'done'

export default function BookingsPage() {
  const { trip, days, loading } = useTrip()
  const bookings = useBookings()
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('todo')
  const [kind, setKind] = useState<BookingKind | null>(null)
  useBookingSync(trip, days)
  if (loading || !trip) return null

  const orderOf = new Map(days.map((d) => [d.id, d.order]))
  const today = todayIso()
  const sorted = [...bookings].sort((a, b) => (orderOf.get(a.dayId) ?? 1e9) - (orderOf.get(b.dayId) ?? 1e9))
  const ofKind = sorted.filter((b) => !kind || b.kind === kind)
  const todo = ofKind.filter((b) => b.status === 'needed')
  const done = ofKind.filter((b) => b.status === 'booked')
  // "필요 없음" items sit at the end of the done list so they can still be undone.
  const shown = status === 'todo' ? todo : [...done, ...ofKind.filter((b) => b.status === 'skipped')]

  async function toggle(b: Booking) {
    await db.bookings.update(b.id, { status: b.status === 'booked' ? 'needed' : 'booked' })
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>예약</h1>
        <Link to="/pack" className="btn small">🎒 준비물</Link>
        <button className="btn small" onClick={() => navigate('/book/new?kind=flight')}>+ 항공편</button>
        <button className="btn small" onClick={() => navigate('/book/new')}>+ 직접 추가</button>
      </header>
      <p className="muted">계획표에서 숙소, 이동, 투어를 찾아 예약할 목록을 자동으로 만들어요. 예약하면 체크하고 어디서 했는지 남겨두세요.</p>

      <section className="coverage">
        {coverage(bookings).map((c) => (
          <button key={c.kind} className={`cov${kind === c.kind ? ' active' : ''}`} onClick={() => setKind(kind === c.kind ? null : c.kind)}>
            <span className="cov-label">{KIND_ICON[c.kind]} {KIND_LABEL[c.kind]}</span>
            <span className="cov-num">{c.done}<span className="muted">/{c.total}{c.kind === 'stay' ? '박' : ''}</span></span>
            <span className="bar"><i style={{ width: `${c.total ? (c.done / c.total) * 100 : 0}%` }} /></span>
          </button>
        ))}
      </section>

      <div className="chips">
        <button className={status === 'todo' ? 'chip active' : 'chip'} onClick={() => setStatus('todo')}>해야 할 예약 {todo.length}</button>
        <button className={status === 'done' ? 'chip active' : 'chip'} onClick={() => setStatus('done')}>완료한 예약 {done.length}</button>
        {kind && <button className="chip" onClick={() => setKind(null)}>{KIND_LABEL[kind]} ✕</button>}
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
      {shown.length === 0 && (
        <p className="muted">{status === 'todo' ? '해야 할 예약이 없어요.' : '아직 완료한 예약이 없어요. 예약하면 왼쪽 동그라미를 눌러 체크하세요.'}</p>
      )}
    </div>
  )
}
