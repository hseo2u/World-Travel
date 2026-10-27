import { monthCells, shiftMonth, todayIso } from '../lib/dates'
import { formatKrw, formatKrwTiny } from '../lib/money'
import type { Expense } from '../types'

const WEEK = ['일', '월', '화', '수', '목', '금', '토']

interface Props {
  expenses: Expense[]
  month: string
  selected: string
  onMonth: (ym: string) => void
  onSelect: (date: string) => void
}

/** A month of days, each with what was spent; the busier the day, the deeper the tint. */
export default function SpendCalendar({ expenses, month, selected, onMonth, onSelect }: Props) {
  const perDay = new Map<string, number>()
  for (const e of expenses) if (e.date.startsWith(month)) perDay.set(e.date, (perDay.get(e.date) ?? 0) + e.krw)
  const max = Math.max(0, ...perDay.values())
  const total = [...perDay.values()].reduce((n, v) => n + v, 0)
  const today = todayIso()
  const [y, m] = month.split('-').map(Number)

  return (
    <section className="card cal-card">
      <div className="cal-head">
        <button className="btn small" aria-label="이전 달" onClick={() => onMonth(shiftMonth(month, -1))}>‹</button>
        <div className="cal-title">
          <strong>{y}년 {m}월</strong>
          <span className="muted">{total ? formatKrw(total) : '기록 없음'}</span>
        </div>
        <button className="btn small" aria-label="다음 달" onClick={() => onMonth(shiftMonth(month, 1))}>›</button>
      </div>
      <div className="cal-grid">
        {WEEK.map((w) => <span key={w} className="cal-wd">{w}</span>)}
        {monthCells(month).map((date, i) => {
          if (!date) return <span key={`b${i}`} />
          const amt = perDay.get(date) ?? 0
          const tint = amt && max ? Math.round(14 + 32 * Math.sqrt(amt / max)) : 0
          return (
            <button
              key={date}
              className={`cal-day${date === selected ? ' on' : ''}${date === today ? ' today' : ''}`}
              style={tint ? { background: `color-mix(in srgb, var(--accent) ${tint}%, var(--card))` } : undefined}
              aria-label={`${m}월 ${Number(date.slice(8))}일${amt ? ` ${formatKrw(amt)}` : ''}`}
              aria-pressed={date === selected}
              onClick={() => onSelect(date)}
            >
              <span className="cal-num">{Number(date.slice(8))}</span>
              <span className="cal-amt">{amt ? formatKrwTiny(amt) : ''}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
