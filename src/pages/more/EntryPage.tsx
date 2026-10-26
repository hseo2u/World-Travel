import { useNavigate } from 'react-router-dom'
import { dayDate, formatShort } from '../../lib/dates'
import { CONSULAR_CALL, countryStays, ENTRY, ENTRY_CHECKED, schengenMax } from '../../lib/entry'
import { db } from '../../db'
import { useDraft } from '../../lib/useDraft'
import { useKv } from '../../lib/useKv'
import { useTrip } from '../../lib/useTrip'

export default function EntryPage() {
  const navigate = useNavigate()
  const { trip, days, loading } = useTrip()
  const saved = useKv('entry-memo')
  const { draft: memo = {}, set, dirty } = useDraft(saved, 'entry-memo')
  const setMemo = (country: string, v: string) => set({ [country]: v })
  if (loading || !trip) return null

  async function commit() {
    await db.kv.put({ key: 'entry-memo', value: memo })
    navigate('/more')
  }

  const stays = countryStays(days)
  const schengen = schengenMax(trip.startDate, days)
  // Total days per country, so a country visited twice shows its whole time once.
  const total = new Map<string, number>()
  for (const s of stays) total.set(s.country, (total.get(s.country) ?? 0) + s.days)
  const seen = new Set<string>()

  return (
    <div className="page">
      <header className="page-head">
        <button className="icon-btn" onClick={() => navigate('/more')} aria-label="뒤로">←</button>
        <h1>나라별 입국 정보</h1>
        <button className="btn primary small" onClick={commit} disabled={!dirty}>저장</button>
      </header>
      <p className="muted">한국 여권 기준으로 {ENTRY_CHECKED}에 정리했어요. 규정이 자주 바뀌니 출발 전에 외교부 해외안전여행(0404.go.kr)에서 한 번 더 확인하세요.</p>

      <section className={`card${schengen > 84 ? ' notice' : ''}`}>
        <div className="eyebrow">쉥겐 체류</div>
        <div className="spend-big">{schengen}<span className="muted"> / 90일</span></div>
        <div className="bar big"><i className={schengen > 90 ? 'over' : ''} style={{ width: `${Math.min(schengen / 90, 1) * 100}%` }} /></div>
        <p className="muted">
          {schengen > 90
            ? `계획대로면 180일 안에 쉥겐 국가에 ${schengen}일 머물러서 ${schengen - 90}일 넘어요. 영국·튀르키예·모로코로 일부를 옮기거나 일정을 줄여야 해요.`
            : schengen > 84
              ? `한도까지 ${90 - schengen}일밖에 안 남았어요. 입국일과 출국일도 하루로 세니 이동이 하루만 밀려도 넘을 수 있어요. 영국·튀르키예·모로코 일정을 조금 늘리는 쪽이 안전해요.`
              : '계획상 180일 안에 쉥겐 국가에 머무는 가장 긴 기간이에요. 영국, 튀르키예, 모로코는 들어가지 않아요.'}
        </p>
      </section>

      {stays.map((s) => {
        if (seen.has(s.country)) return null
        seen.add(s.country)
        const info = ENTRY[s.country]
        return (
          <section key={s.country} className="card entry-card">
            <div className="entry-head">
              <h2>{s.country}</h2>
              <span className="muted">{formatShort(dayDate(trip.startDate, s.first))} 입국 · {total.get(s.country)}일</span>
            </div>
            {info ? (
              <>
                <div className="entry-stay">{info.stay}</div>
                {info.notes.length > 0 && <ul className="entry-notes">{info.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
              </>
            ) : (
              <p className="muted">정리된 정보가 없어요. 아래 메모에 직접 적어두세요.</p>
            )}
            <textarea
              className="entry-memo" rows={2} placeholder="내가 확인한 내용 (예: 2026-12 대사관 확인, 출국 항공권 보여줘야 함)"
              value={memo[s.country] ?? ''} onChange={(e) => setMemo(s.country, e.target.value)}
            />
          </section>
        )
      })}
      <p className="muted">여권 만료일은 마지막 출국일 기준 6개월 넘게 남아 있어야 안전해요. 문제가 생기면 영사콜센터 {CONSULAR_CALL} (24시간).</p>
    </div>
  )
}
