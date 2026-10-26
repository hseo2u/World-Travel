import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, newId, TRIP_ID } from '../db'
import { KIND_LABEL } from '../lib/bookings'
import { dayDate, formatShort, todayIso } from '../lib/dates'
import { alignFlight, matchFlightDay, type Alignment } from '../lib/flightAlign'
import { CURRENCIES, krwPerUnit } from '../lib/money'
import { applyAlignment } from '../lib/planOps'
import { useDraft } from '../lib/useDraft'
import { useMoney } from '../lib/useData'
import { useTrip } from '../lib/useTrip'
import type { Booking, BookingKind, BookingStatus, ExpenseCategory, FlightInfo } from '../types'

const VIA = ['Hostelworld', 'Booking.com', 'Agoda', 'Airbnb', '항공사 홈페이지', 'Skyscanner', 'Busbud', 'Omio', 'Trainline', 'GetYourGuide', 'Klook', '현장 결제']
const STATUS: { s: BookingStatus; label: string }[] = [
  { s: 'needed', label: '예약 필요' },
  { s: 'booked', label: '예약 완료' },
  { s: 'skipped', label: '필요 없음' },
]
const CATEGORY_FOR: Record<BookingKind, ExpenseCategory> = { stay: 'stay', flight: 'flight', transport: 'transport', activity: 'activity' }

export default function BookingPage() {
  const { bookingId = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { trip, days, loading } = useTrip()
  const { methods, rates } = useMoney()
  const isNew = bookingId === 'new'
  const flightKind = params.get('kind') === 'flight'
  const firstDayId = days[0]?.id ?? ''
  // A new booking lives only on this screen until 등록 is pressed.
  const fresh = useMemo<Booking>(() => flightKind
    ? { id: newId(), tripId: TRIP_ID, kind: 'flight', title: '새 항공편', status: 'booked', dayId: firstDayId, bookedVia: '', confirmation: '', memo: '', flight: { flightNo: '', from: '', to: '', departs: '', arrives: '' } }
    : { id: newId(), tripId: TRIP_ID, kind: 'activity', title: '', status: 'needed', dayId: firstDayId, bookedVia: '', confirmation: '', memo: '' },
  [firstDayId, flightKind])
  const stored = useLiveQuery(async () => isNew ? null : (await db.bookings.get(bookingId)) ?? null, [bookingId])
  const { draft, set: save, dirty } = useDraft(isNew ? fresh : stored ?? undefined, bookingId)
  const linkedExpense = useLiveQuery(() => db.expenses.filter((e) => e.bookingId === draft?.id).first(), [draft?.id])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [aligned, setAligned] = useState('')

  if (loading || !trip || (!isNew && stored === undefined)) return null
  if (!draft) return <div className="page"><p>이 예약을 찾을 수 없어요.</p><Link to="/book">예약으로</Link></div>
  const b = draft

  /** Writes the draft. A new booking then gets its own address so later saves update it. */
  async function persist() {
    await db.bookings.put(b)
    if (isNew) navigate(`/book/${b.id}`, { replace: true })
  }

  async function commit() {
    await db.bookings.put(b)
    navigate('/book')
  }

  const saveFlight = (patch: Partial<FlightInfo>) => {
    const flight = { ...b.flight!, ...patch }
    const extra: Partial<Booking> = { flight }
    if (flight.from && flight.to) extra.title = `${flight.from} → ${flight.to}${flight.flightNo ? ` ${flight.flightNo}` : ''}`
    // Link to the matching move in the plan the first time the cities are filled in.
    if ((patch.from !== undefined || patch.to !== undefined) && !b.planKey) {
      const match = matchFlightDay(days, flight)
      if (match) extra.dayId = match.id
    }
    save(extra)
  }

  const day = days.find((d) => d.id === b.dayId)
  const alignment: Alignment | undefined = b.kind === 'flight' && b.flight ? alignFlight(trip, days, b.dayId, b.flight) : undefined

  async function addExpense() {
    if (!b.price) return
    await persist()
    const currency = b.currency ?? 'USD'
    const method = methods.find((m) => m.kind === 'card') ?? methods[0]
    await db.expenses.add({
      id: newId(), tripId: TRIP_ID, date: todayIso(), amount: b.price, currency,
      krw: Math.round(b.price * krwPerUnit(currency, rates)), category: CATEGORY_FOR[b.kind],
      payMethodId: method?.id ?? '', memo: b.title, bookingId: b.id,
    })
  }

  async function remove() {
    if (!confirmDelete) return setConfirmDelete(true)
    if (!isNew) await db.bookings.delete(b.id)
    navigate('/book')
  }

  async function align() {
    if (!alignment) return
    await persist()
    await applyAlignment(alignment)
    setAligned('계획을 항공편 날짜에 맞췄어요.')
  }

  return (
    <div className="page">
      <header className="page-head">
        <button className="icon-btn" onClick={() => navigate('/book')} aria-label="뒤로">←</button>
        <h1>{KIND_LABEL[b.kind]} 예약</h1>
        <button className="btn primary small" onClick={commit} disabled={!isNew && !dirty}>{isNew ? '등록' : '저장'}</button>
      </header>
      {dirty && !isNew && <p className="muted">저장을 눌러야 바뀐 내용이 반영돼요.</p>}

      <div className="chips">
        {STATUS.map(({ s, label }) => (
          <button key={s} className={b.status === s ? 'chip active' : 'chip'} onClick={() => save({ status: s })}>{label}</button>
        ))}
      </div>

      {b.kind === 'flight' && b.flight ? (
        <>
          <div className="grid-2">
            <label className="field"><span>출발 도시</span><input id="f-from" value={b.flight.from} onChange={(e) => saveFlight({ from: e.target.value })} placeholder="인천" /></label>
            <label className="field"><span>도착 도시</span><input id="f-to" value={b.flight.to} onChange={(e) => saveFlight({ to: e.target.value })} placeholder="리마" /></label>
            <label className="field"><span>출발 (현지 시각)</span><input id="f-dep" type="datetime-local" value={b.flight.departs} onChange={(e) => saveFlight({ departs: e.target.value })} /></label>
            <label className="field"><span>도착 (현지 시각)</span><input id="f-arr" type="datetime-local" value={b.flight.arrives} onChange={(e) => saveFlight({ arrives: e.target.value })} /></label>
          </div>
          <label className="field"><span>편명</span><input id="f-no" value={b.flight.flightNo} onChange={(e) => saveFlight({ flightNo: e.target.value })} placeholder="LA8065" /></label>
        </>
      ) : (
        <>
          <label className="field">
            <span>종류</span>
            <select id="b-kind" value={b.kind} onChange={(e) => save({ kind: e.target.value as BookingKind })}>
              {(Object.keys(KIND_LABEL) as BookingKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </select>
          </label>
          <label className="field"><span>이름</span><input id="b-title" value={b.title} onChange={(e) => save({ title: e.target.value })} placeholder="마추픽추 입장권" /></label>
          {b.kind === 'flight' && (
            <button
              className="btn"
              onClick={() => save({ flight: { flightNo: '', from: day?.cities[0] ?? '', to: day?.cities.at(-1) ?? '', departs: '', arrives: '' } })}
            >
              편명·출발·도착 시간 입력
            </button>
          )}
        </>
      )}

      <label className="field">
        <span>{b.kind === 'flight' ? '계획에서 도착하는 날' : '날짜'}</span>
        <select id="b-day" value={b.dayId} onChange={(e) => save({ dayId: e.target.value })}>
          {days.map((d) => (
            <option key={d.id} value={d.id}>Day {d.order + 1} · {formatShort(dayDate(trip.startDate, d.order))} · {d.cities.join(' > ') || d.country}</option>
          ))}
        </select>
      </label>
      {b.kind === 'stay' && (
        <label className="field"><span>박 수</span><input id="b-nights" type="number" inputMode="numeric" min={1} value={b.nights ?? 1} onChange={(e) => save({ nights: Math.max(1, Number(e.target.value) || 1) })} /></label>
      )}

      {alignment && alignment.kind !== 'aligned' && day && (
        <div className="card notice">
          <AlignmentText a={alignment} dayNumber={day.order + 1} planned={formatShort(dayDate(trip.startDate, day.order))} arrival={b.flight!.arrives.slice(0, 10)} />
          {!(alignment.kind === 'shrink' && alignment.removeIds.length === 0) && (
            <button className="btn primary" onClick={align}>계획을 항공편에 맞추기</button>
          )}
        </div>
      )}
      {alignment?.kind === 'aligned' && <p className="muted">✓ 계획 날짜와 항공편 도착일이 맞아요.</p>}
      {aligned && <p className="muted">{aligned}</p>}

      <label className="field">
        <span>예약한 곳</span>
        <input id="b-via" list="via-list" value={b.bookedVia} onChange={(e) => save({ bookedVia: e.target.value })} placeholder="Hostelworld" />
        <datalist id="via-list">{VIA.map((v) => <option key={v} value={v} />)}</datalist>
      </label>
      <label className="field"><span>예약 번호</span><input id="b-conf" value={b.confirmation} onChange={(e) => save({ confirmation: e.target.value })} /></label>
      <label className="field">
        <span>이때까지 예약하기 (지나면 알려드려요)</span>
        <input id="b-due" type="date" value={b.dueDate ?? ''} onChange={(e) => save({ dueDate: e.target.value || undefined })} />
      </label>
      <div className="grid-2">
        <label className="field"><span>금액</span><input id="b-price" type="number" inputMode="decimal" value={b.price ?? ''} onChange={(e) => save({ price: e.target.value ? Number(e.target.value) : undefined })} /></label>
        <label className="field">
          <span>통화</span>
          <select id="b-cur" value={b.currency ?? 'USD'} onChange={(e) => save({ currency: e.target.value })}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>
      {b.price ? (
        linkedExpense ? (
          <p className="muted">✓ 가계부에 들어가 있어요. <Link to={`/money/${linkedExpense.id}`}>지출 보기</Link></p>
        ) : (
          <button className="btn" onClick={addExpense}>가계부에 지출로 넣기</button>
        )
      ) : null}
      <label className="field"><span>메모</span><textarea id="b-memo" rows={2} value={b.memo} onChange={(e) => save({ memo: e.target.value })} /></label>

      <button className="btn danger" onClick={remove}>{isNew ? '취소' : confirmDelete ? '정말 삭제' : '예약 항목 삭제'}</button>
      {b.planKey && confirmDelete && <p className="muted">계획표에서 만든 항목이라 계획에 남아 있으면 다시 생겨요. 안 해도 되는 예약이면 "필요 없음"을 누르세요.</p>}
    </div>
  )
}

function AlignmentText({ a, dayNumber, planned, arrival }: { a: Alignment; dayNumber: number; planned: string; arrival: string }) {
  const arr = formatShort(arrival)
  if (a.kind === 'shift-start') {
    return <p>도착일이 {arr}이라 Day 1({planned})과 {Math.abs(a.delta)}일 차이가 나요. 출국일을 바꾸면 모든 날짜가 함께 움직여요.</p>
  }
  if (a.kind === 'stretch') {
    return <p>도착일 {arr}은 계획의 Day {dayNumber}({planned})보다 {a.delta}일 늦어요. {a.city}에 {a.delta}일 더 머무는 것으로 맞출 수 있어요.</p>
  }
  if (a.kind === 'shrink') {
    if (!a.removeIds.length) return <p>도착일 {arr}은 Day {dayNumber}({planned})보다 {-a.delta}일 빨라요. 바로 앞에 {a.city}에서 줄일 수 있는 날이 없어서 계획을 직접 고쳐야 해요.</p>
    return (
      <p>
        도착일 {arr}은 Day {dayNumber}({planned})보다 {-a.delta}일 빨라요. {a.city} 체류를 {a.removeIds.length}일 줄여서 맞출 수 있어요.
        {a.shortBy > 0 && ` 그래도 ${a.shortBy}일이 남아서 나머지는 직접 고쳐야 해요.`}
      </p>
    )
  }
  return null
}
