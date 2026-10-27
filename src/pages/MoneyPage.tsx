import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORY_ICON, CATEGORY_LABEL, formatKrw, formatMoney, summarize } from '../lib/money'
import { formatShort, todayIso } from '../lib/dates'
import { useMoney } from '../lib/useData'
import { useTrip } from '../lib/useTrip'
import SpendSummaryCard from '../components/SpendSummaryCard'
import SpendDonut from '../components/SpendDonut'
import { byCategory, byCountry } from '../lib/stats'

export default function MoneyPage() {
  const { trip, days, loading } = useTrip()
  const { expenses, methods } = useMoney()
  const [split, setSplit] = useState<'category' | 'country'>('category')
  if (loading || !trip) return null

  const summary = summarize(trip, expenses, todayIso(), days.length)
  const methodName = new Map(methods.map((m) => [m.id, m.name]))
  const byDate = new Map<string, typeof expenses>()
  for (const e of expenses) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e])

  return (
    <div className="page">
      <header className="page-head">
        <h1>가계부</h1>
        <Link to="/money/wallet" className="btn small">카드·현금·환율</Link>
      </header>

      <SpendSummaryCard trip={trip} summary={summary} />

      <Link to="/money/new" className="btn primary wide">+ 지출 기록</Link>

      {expenses.length > 0 && (
        <section className="card donut-card">
          <div className="ds-head">
            <h2>어디에 썼나</h2>
            <div className="seg" role="tablist">
              <button role="tab" aria-selected={split === 'category'} className={split === 'category' ? 'on' : ''} onClick={() => setSplit('category')}>항목별</button>
              <button role="tab" aria-selected={split === 'country'} className={split === 'country' ? 'on' : ''} onClick={() => setSplit('country')}>나라별</button>
            </div>
          </div>
          <SpendDonut key={split} slices={split === 'category' ? byCategory(expenses) : byCountry(expenses, trip, days)} />
        </section>
      )}

      {[...byDate.entries()].map(([date, list]) => (
        <section key={date} className="expense-day">
          <div className="country-head">
            {formatShort(date)} {date < trip.startDate ? '· 여행 전' : ''}
            <span className="muted"> · {formatKrw(list.reduce((n, e) => n + e.krw, 0))}</span>
          </div>
          <ul className="expense-list">
            {list.map((e) => (
              <li key={e.id}>
                <Link to={`/money/${e.id}`} className="expense-row">
                  <span className="expense-icon">{CATEGORY_ICON[e.category]}</span>
                  <span className="expense-body">
                    <strong>{e.memo || CATEGORY_LABEL[e.category]}</strong>
                    <span className="muted">{methodName.get(e.payMethodId) ?? '결제수단 없음'}</span>
                  </span>
                  <span className="expense-amt">
                    <strong>{formatMoney(e.amount, e.currency)}</strong>
                    {e.currency !== 'KRW' && <span className="muted">{formatKrw(e.krw)}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {expenses.length === 0 && <p className="muted">아직 기록한 지출이 없어요. 항공권이나 보험처럼 여행 전에 쓴 돈부터 넣어보세요.</p>}
    </div>
  )
}
