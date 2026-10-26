import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db, newId, TRIP_ID } from '../db'
import { parseTsv, rowsToDays } from '../lib/importPlan'
import { useTrip } from '../lib/useTrip'

export default function ImportPage() {
  const navigate = useNavigate()
  const { days: existing } = useTrip()
  const [text, setText] = useState('')
  const result = useMemo(() => (text.trim() ? rowsToDays(parseTsv(text)) : undefined), [text])
  const countries = result ? new Set(result.days.map((d) => d.country).filter(Boolean)) : new Set<string>()

  async function apply() {
    if (!result) return
    if (existing.length && !window.confirm(`지금 있는 ${existing.length}일 일정을 지우고 새 계획표로 바꿀까요?`)) return
    await db.transaction('rw', db.days, async () => {
      await db.days.where('tripId').equals(TRIP_ID).delete()
      await db.days.bulkAdd(result.days.map((d) => ({ ...d, id: newId(), tripId: TRIP_ID })))
    })
    navigate('/plan')
  }

  return (
    <div className="page">
      <header className="page-head">
        <button className="icon-btn" onClick={() => navigate('/plan')} aria-label="뒤로">←</button>
        <h1>계획표 가져오기</h1>
      </header>
      <p className="muted">
        구글 시트나 엑셀에서 계획표 칸을 전부 선택해 복사한 뒤 아래에 붙여넣으세요.
        열 순서는 일 · 국가 · 도시 · 내용 · 숙박 · 기타예요. Day 번호는 순서대로 다시 매겨요.
      </p>
      <textarea
        className="paste"
        rows={10}
        placeholder={'일\t국가\t도시\t내용\t숙박\t기타\nDay 1\t페루\t리마\t\t리마\t'}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {result && (
        <div className="card">
          <strong>{result.days.length}일 · {countries.size}개국</strong>
          <div className="muted">
            {[...countries].join(' → ')}
            {result.days.some((d) => d.notes === '미정') && ' · 미정인 날 포함'}
          </div>
        </div>
      )}
      <button className="btn primary wide" disabled={!result?.days.length} onClick={apply}>
        이 계획표로 만들기
      </button>
    </div>
  )
}
