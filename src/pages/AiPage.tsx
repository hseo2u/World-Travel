import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { buildPrompt, PROMPT_KINDS, type PromptKind } from '../lib/aiPrompt'
import { useTrip } from '../lib/useTrip'

const APPS = [
  { name: 'Claude', url: 'https://claude.ai/new' },
  { name: 'ChatGPT', url: 'https://chatgpt.com/' },
  { name: 'Gemini', url: 'https://gemini.google.com/app' },
]

export default function AiPage() {
  const { trip, days, loading } = useTrip()
  const [params] = useSearchParams()
  const [kind, setKind] = useState<PromptKind>(params.get('day') ? 'next-move' : 'review')
  const [dayId, setDayId] = useState(params.get('day') ?? '')
  const [copied, setCopied] = useState(false)
  if (loading || !trip) return null

  const spec = PROMPT_KINDS.find((k) => k.kind === kind)!
  const day = days.find((d) => d.id === dayId) ?? (spec.needsDay ? days.find((d) => d.cities.length > 1) : undefined)
  const prompt = days.length ? buildPrompt(kind, trip, days, day) : ''

  async function copy() {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="page">
      <header className="page-head"><h1>AI에게 물어보기</h1></header>
      <p className="muted">질문을 고르면 내 계획표를 담은 질문이 만들어져요. 복사해서 쓰는 AI 앱에 붙여넣으세요. 추가 비용은 없어요.</p>

      <div className="chips">
        {PROMPT_KINDS.map((k) => (
          <button key={k.kind} className={k.kind === kind ? 'chip active' : 'chip'} onClick={() => setKind(k.kind)}>
            {k.label}
          </button>
        ))}
      </div>

      {spec.needsDay && (
        <label className="field">
          <span>어느 날?</span>
          <select value={day?.id ?? ''} onChange={(e) => setDayId(e.target.value)}>
            {days.map((d) => (
              <option key={d.id} value={d.id}>Day {d.order + 1} · {d.cities.join(' > ') || d.country}</option>
            ))}
          </select>
        </label>
      )}

      {days.length === 0 ? (
        <p>먼저 계획표를 가져와 주세요.</p>
      ) : (
        <>
          <textarea className="paste" rows={12} readOnly value={prompt} />
          <button className="btn primary wide" onClick={copy}>{copied ? '복사했어요 ✓' : '질문 복사하기'}</button>
          <div className="btn-row">
            {APPS.map((a) => <a key={a.name} className="btn" href={a.url} target="_blank" rel="noreferrer">{a.name} 열기</a>)}
          </div>
        </>
      )}
    </div>
  )
}
