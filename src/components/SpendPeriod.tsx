import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatShort, todayIso } from '../lib/dates'
import { CATEGORY_ICON, CATEGORY_LABEL, formatKrw, formatMoney } from '../lib/money'
import { byCategory } from '../lib/stats'
import type { Exchange, Expense, Trip } from '../types'
import SpendDonut from './SpendDonut'

/** Spending and exchanges between two dates the user picks. */
export default function SpendPeriod({ trip, expenses, exchanges }: { trip: Trip; expenses: Expense[]; exchanges: Exchange[] }) {
  const today = todayIso()
  const earliest = [...expenses.map((e) => e.date), ...exchanges.map((x) => x.date)].sort()[0] ?? today
  const [from, setFrom] = useState(() => (today >= trip.startDate ? trip.startDate : earliest))
  const [to, setTo] = useState(today)
  const inRange = (d: string) => d >= from && d <= to
  const spent = expenses.filter((e) => inRange(e.date))
  const swapped = exchanges.filter((x) => inRange(x.date))
  const total = spent.reduce((n, e) => n + e.krw, 0)
  const days = Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1)

  return (
    <div className="period">
      <div className="period-range">
        <input id="p-from" type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} />
        <span>~</span>
        <input id="p-to" type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} />
      </div>
      <div className="period-sum">
        <strong>{formatKrw(total)}</strong>
        <span className="muted">{days}일 · 하루 평균 {formatKrw(Math.round(total / days))} · 지출 {spent.length}건 · 환전 {swapped.length}건</span>
      </div>
      {spent.length > 0 && <SpendDonut slices={byCategory(spent)} />}
      {swapped.length > 0 && (
        <div className="period-block">
          <div className="today-label">환전</div>
          <ul className="plain-list">
            {swapped.map((x) => (
              <li key={x.id}><span>{formatShort(x.date)} · {formatMoney(x.fromAmount, x.fromCurrency)} → {formatMoney(x.toAmount, x.toCurrency)}{x.place ? ` · ${x.place}` : ''}</span></li>
            ))}
          </ul>
        </div>
      )}
      {spent.length > 0 && (
        <div className="period-block">
          <div className="today-label">지출</div>
          <ul className="plain-list">
            {[...spent].sort((a, b) => a.date.localeCompare(b.date)).map((e) => (
              <li key={e.id}>
                <Link to={`/money/${e.id}`} className="period-row">
                  <span>{formatShort(e.date)} · {CATEGORY_ICON[e.category]} {e.memo || CATEGORY_LABEL[e.category]}</span>
                  <strong>{formatMoney(e.amount, e.currency)}</strong>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {spent.length === 0 && swapped.length === 0 && <p className="muted">이 기간에는 기록이 없어요.</p>}
    </div>
  )
}
