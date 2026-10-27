import { useNavigate } from 'react-router-dom'
import { db, TRIP_ID } from '../db'
import { useDraft } from '../lib/useDraft'
import { useTrip } from '../lib/useTrip'
import type { Trip } from '../types'
import { useLeaveGuard } from '../components/useLeaveGuard'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { trip: saved, loading } = useTrip()
  const { draft: trip, set: save, dirty } = useDraft<Trip>(saved, 'trip')
  const leave = useLeaveGuard(dirty)
  if (loading || !trip) return null

  async function commit() {
    const { name, startDate, budgetKrw, mode } = trip!
    await db.trips.update(TRIP_ID, { name, startDate, budgetKrw, mode })
    leave.release()
    navigate('/')
  }

  return (
    <div className="page">
      {leave.sheet}
      <header className="page-head">
        <button className="icon-btn" onClick={() => navigate('/')} aria-label="뒤로">←</button>
        <h1>여행 설정</h1>
        <button className="btn primary small" onClick={commit} disabled={!dirty}>저장</button>
      </header>
      <label className="field">
        <span>여행 이름</span>
        <input value={trip.name} onChange={(e) => save({ name: e.target.value })} />
      </label>
      <label className="field">
        <span>출국일 (Day 1)</span>
        <input type="date" value={trip.startDate} onChange={(e) => e.target.value && save({ startDate: e.target.value })} />
      </label>
      <label className="field">
        <span>예산 (원)</span>
        <input type="number" inputMode="numeric" value={trip.budgetKrw} onChange={(e) => save({ budgetKrw: Number(e.target.value) || 0 })} />
      </label>
      <div className="field">
        <span>여행 방식</span>
        <div className="chips">
          <button className={trip.mode === 'solo' ? 'chip active' : 'chip'} onClick={() => save({ mode: 'solo' })}>솔로</button>
          <button className={trip.mode === 'companion' ? 'chip active' : 'chip'} onClick={() => save({ mode: 'companion' })}>동행</button>
        </div>
        {trip.mode === 'companion' && <p className="muted">동행 연결과 가계부 공유는 출시 단계에서 추가될 예정이에요.</p>}
      </div>
    </div>
  )
}
