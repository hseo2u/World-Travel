import { useNavigate } from 'react-router-dom'
import { daysBetween, todayIso } from '../../lib/dates'
import { CONSULAR_CALL, ENTRY } from '../../lib/entry'
import { db } from '../../db'
import { useDraft } from '../../lib/useDraft'
import { useKv } from '../../lib/useKv'
import { useTrip } from '../../lib/useTrip'
import { useLeaveGuard } from '../../components/useLeaveGuard'

const FIELDS: [string, string, string][] = [
  ['insurer', '보험사', 'DB손해보험 해외여행자보험'],
  ['insurerPhone', '보험사 해외 긴급번호', '+82-…'],
  ['policy', '증권 번호', ''],
  ['contactName', '비상연락처 이름', '엄마'],
  ['contactPhone', '비상연락처 번호', '+82-10-…'],
  ['blood', '혈액형', 'A+'],
  ['medical', '알레르기·복용 약', '없음'],
]

export default function SafetyPage() {
  const navigate = useNavigate()
  const { trip, days, loading } = useTrip()
  const saved = useKv('safety')
  const { draft: card = {}, set: patch, dirty } = useDraft(saved, 'safety')
  const set = (key: string, v: string) => patch({ [key]: v })
  const leave = useLeaveGuard(dirty)
  if (loading || !trip) return null

  async function commit() {
    await db.kv.put({ key: 'safety', value: card })
    leave.release()
    navigate('/more')
  }

  const sinceStart = daysBetween(trip.startDate, todayIso())
  const today = days.find((d) => d.order === Math.max(0, sinceStart)) ?? days[0]
  const country = today?.country ?? ''
  const info = ENTRY[country]

  return (
    <div className="page">
      {leave.sheet}
      <header className="page-head">
        <button className="icon-btn" onClick={() => navigate('/more')} aria-label="뒤로">←</button>
        <h1>안전카드</h1>
        <button className="btn primary small" onClick={commit} disabled={!dirty}>저장</button>
      </header>

      <section className="card safety-now">
        <div className="eyebrow">{sinceStart < 0 ? '첫 나라' : '지금 있는 나라'} · {country || '미정'}</div>
        <ul className="plain-list">
          {(info?.emergency ?? []).map(([label, num]) => (
            <li key={label}><span>{label}</span><a className="safety-num" href={`tel:${num}`}>{num}</a></li>
          ))}
          <li><span>영사콜센터 (24시간, 한국어)</span><a className="safety-num" href={`tel:${CONSULAR_CALL}`}>{CONSULAR_CALL}</a></li>
        </ul>
        <p className="muted">대사관 주소와 전화는 외교부 해외안전여행 앱(0404.go.kr)에서 나라별로 확인해 아래 메모에 적어두세요.</p>
      </section>

      <section className="card">
        <h2>내 정보</h2>
        {FIELDS.map(([key, label, ph]) => (
          <label key={key} className="field">
            <span>{label}</span>
            <input id={`s-${key}`} value={card[key] ?? ''} placeholder={ph} onChange={(e) => set(key, e.target.value)} />
          </label>
        ))}
        <label className="field">
          <span>대사관·기타 메모</span>
          <textarea id="s-memo" rows={3} value={card.memo ?? ''} onChange={(e) => set('memo', e.target.value)} placeholder="주페루 대한민국 대사관 …" />
        </label>
      </section>
    </div>
  )
}
