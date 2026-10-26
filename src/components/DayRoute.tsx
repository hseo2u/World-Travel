import type { Day } from '../types'

export default function DayRoute({ day }: { day: Day }) {
  if (!day.cities.length) return <div className="route muted">{day.country ? `${day.country} · 일정 미정` : '일정 미정'}</div>
  return (
    <div className="route">
      {day.cities.map((c, i) => (
        <span key={`${c}-${i}`}>
          {i > 0 && <span className="arrow"> → </span>}
          {c}
        </span>
      ))}
    </div>
  )
}
